// 模組：場地狀態同步 (CourtState)、上場時觸發 LINE 推播

/** 確保場地狀態工作表存在並初始化格式 */
function ensureCourtStateSheet() {
  const ss = getSs();
  let sheet = ss.getSheetByName(CONFIG.SHEETS.COURT_STATE);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.COURT_STATE);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Date', 'Version', 'State', 'UpdatedAt', 'UpdatedBy']);
    const initialState = JSON.stringify({
      courts: [
        { id: '1', name: '1', players: [null, null, null, null], startTime: null },
        { id: '2', name: '2', players: [null, null, null, null], startTime: null }
      ],
      playerStatus: {},
      recommendedPlayers: [null, null, null, null],
      controller: null,
      controllerName: null
    });
    const todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    const nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([todayStr, 1, initialState, "'" + nowStr, 'system']);
  }
  return sheet;
}

/**
 * 同一球員不可同時佔多格（各場地 players + recommendedPlayers）。
 * 依 courts 陣列順序保留第一次出現的 id，其餘格清空。
 */
function dedupeOccupancyAcrossCourts_(state) {
  if (!state) return state;
  var seen = {};
  var j, i, pid;
  if (state.courts && Array.isArray(state.courts)) {
    for (j = 0; j < state.courts.length; j++) {
      var row = state.courts[j].players;
      if (!row) continue;
      for (i = 0; i < row.length; i++) {
        pid = row[i];
        if (!pid) continue;
        var sid = String(pid);
        if (seen[sid]) row[i] = null;
        else seen[sid] = true;
      }
    }
  }
  if (state.recommendedPlayers && Array.isArray(state.recommendedPlayers)) {
    var rec = state.recommendedPlayers;
    for (i = 0; i < rec.length; i++) {
      pid = rec[i];
      if (!pid) continue;
      var sid2 = String(pid);
      if (seen[sid2]) rec[i] = null;
      else seen[sid2] = true;
    }
  }
  return state;
}

/** 內部 Helper: 強制修正不該存檔的狀態 (如 finishing)，並清除跨區重複佔位 */
function normalizeState_(state) {
  if (!state) return state;
  if (state.playerStatus) {
    const statusKeys = Object.keys(state.playerStatus);
    for (let i = 0; i < statusKeys.length; i++) {
      const key = statusKeys[i];
      if (state.playerStatus[key] === 'finishing') {
        state.playerStatus[key] = 'ready';
      }
    }
  }
  dedupeOccupancyAcrossCourts_(state);
  return state;
}

/** 讀取場地狀態，支援指定日期 */
function getCourtState(targetDate) {
  try {
    const sheet = ensureCourtStateSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { status: 'success', data: { version: 0, state: null, targetDate: targetDate } };
    }

    const target = targetDate || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');

    let foundRow = -1;
    for (let i = data.length - 1; i >= 1; i--) {
      const rowDate = data[i][0];
      const rowDateStr = (rowDate instanceof Date)
        ? Utilities.formatDate(rowDate, CONFIG.TIMEZONE, 'yyyy-MM-dd')
        : String(rowDate);

      if (rowDateStr === target) {
        foundRow = i;
        break;
      }
    }

    if (foundRow === -1) {
      // 如果找不到當天狀態且是對應今天，則初始化一個包含「常駐球員」的初始狀態
      if (target === Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd')) {
        const playersResult = getPlayers();
        const initialPlayerStatus = {};
        if (playersResult.status === 'success') {
          playersResult.data.forEach(p => {
            if (p.type === 'resident') {
              initialPlayerStatus[p.id] = 'ready';
            }
          });
        }

        const initialState = {
          courts: [
            { id: '1', name: '1', players: [null, null, null, null], startTime: null },
            { id: '2', name: '2', players: [null, null, null, null], startTime: null }
          ],
          playerStatus: initialPlayerStatus,
          recommendedPlayers: [null, null, null, null],
          controller: null,
          controllerName: null
        };
        return { status: 'success', data: { version: 0, state: initialState, targetDate: target } };
      }
      return { status: 'success', data: { version: 0, state: null, targetDate: target } };
    }

    const row = data[foundRow];
    const version = Number(row[1]) || 0;
    let state = null;
    try {
      state = JSON.parse(row[2]);
      state = normalizeState_(state);
    } catch (e) {
      console.error('JSON Parse error for state:', e);
      state = null;
    }

    return {
      status: 'success',
      data: {
        version: version,
        state: state,
        updatedAt: row[3] ? String(row[3]) : '',
        updatedBy: row[4] ? String(row[4]) : '',
        targetDate: target
      }
    };
  } catch (err) {
    console.error('getCourtState failure:', err);
    return { status: 'error', message: 'getCourtState: ' + err.toString() };
  }
}

/**
 * 對戰／戰力寫入完成後遞增當日 CourtState version，讓前端輪詢在「資料已落地」後才 refetch。
 * 不修改 state JSON、不覆寫 UpdatedBy（與 getCourtState 相同：取該曆日最後一列）。
 * 與 updateCourtState 共用 ScriptLock，避免並行寫入同一列。
 * @param {string} dayStr YYYY-MM-DD（台北曆日）
 */
function bumpCourtStateVersionForDate_(dayStr) {
  if (!dayStr) return;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
  } catch (e) {
    console.error('bumpCourtStateVersionForDate_: lock timeout', e);
    return;
  }

  try {
    const sheet = ensureCourtStateSheet();
    const allData = sheet.getDataRange().getValues();

    let foundRowIndex = -1;
    for (let i = allData.length - 1; i >= 1; i--) {
      const rowDate = allData[i][0];
      const rowDateStr = (rowDate instanceof Date)
        ? Utilities.formatDate(rowDate, CONFIG.TIMEZONE, 'yyyy-MM-dd')
        : formatDate(rowDate);

      if (rowDateStr === dayStr) {
        foundRowIndex = i + 1;
        break;
      }
    }

    if (foundRowIndex === -1) {
      return;
    }

    const row = allData[foundRowIndex - 1];
    const currentVersion = Number(row[1]) || 0;
    const newVersion = currentVersion + 1;
    const nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    const stateCell = row[2];
    const prevBy = row[4] != null && row[4] !== '' ? String(row[4]) : 'system';

    const rowValues = [
      dayStr,
      newVersion,
      stateCell,
      "'" + nowStr,
      prevBy
    ];
    sheet.getRange(foundRowIndex, 1, 1, 5).setValues([rowValues]);
  } catch (e) {
    console.error('bumpCourtStateVersionForDate_', e);
  } finally {
    lock.releaseLock();
  }
}

/** 更新場地狀態（含樂觀鎖與正規化） */
function updateCourtState(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
  } catch (e) {
    return { status: 'error', code: 'LOCK_TIMEOUT', message: 'Server busy, please retry' };
  }

  try {
    const sheet = ensureCourtStateSheet();
    const allData = sheet.getDataRange().getValues();
    const todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');

    let foundRowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      const rowDate = allData[i][0];
      const rowDateStr = (rowDate instanceof Date)
        ? Utilities.formatDate(rowDate, CONFIG.TIMEZONE, 'yyyy-MM-dd')
        : String(rowDate);

      if (rowDateStr === todayStr) {
        foundRowIndex = i + 1;
        break;
      }
    }

    const currentStateRow = (foundRowIndex !== -1) ? allData[foundRowIndex - 1] : null;
    const currentVersion = currentStateRow ? Number(currentStateRow[1]) : 0;
    const currentRawState = currentStateRow ? currentStateRow[2] : null;
    let currentState = null;
    if (currentRawState) {
      try { currentState = JSON.parse(currentRawState); } catch (e) {}
    }

    const expectedVersion = Number(data.expectedVersion) || 0;
    const updatedBy = data.updatedBy || 'unknown';

    if (expectedVersion !== currentVersion) {
      return {
        status: 'error',
        message: 'VERSION_CONFLICT',
        data: {
          version: currentVersion,
          state: currentState,
          updatedAt: currentStateRow ? String(currentStateRow[3]) : '',
          updatedBy: currentStateRow ? String(currentStateRow[4]) : ''
        }
      };
    }

    if (!data.takeover) {
      const currentController = currentState ? currentState.controller : null;
      if (currentController && currentController !== updatedBy) {
        return {
          status: 'error',
          code: 'NOT_CONTROLLER',
          message: '目前由 ' + (currentState.controllerName || currentController) + ' 控制中',
          data: { controller: currentController, controllerName: currentState.controllerName }
        };
      }
    }

    const newVersion = currentVersion + 1;
    const nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");
    const finalState = normalizeState_(data.state);

    if (data.takeover) {
      finalState.controller = updatedBy;
      finalState.controllerName = (data.updaterName && data.updaterName !== updatedBy)
        ? data.updaterName
        : (getPlayerNameByEmail_(updatedBy) || updatedBy);
    } else {
      finalState.controller = currentState ? currentState.controller : updatedBy;
      const existingName = currentState ? currentState.controllerName : null;
      const newName = data.updaterName;

      if (newName && newName !== updatedBy) {
        finalState.controllerName = newName;
      } else if (existingName && existingName !== finalState.controller) {
        finalState.controllerName = existingName;
      } else {
        finalState.controllerName = getPlayerNameByEmail_(finalState.controller) || finalState.controller || updatedBy;
      }
    }

    const rowValues = [
      todayStr,
      newVersion,
      JSON.stringify(finalState),
      "'" + nowStr,
      updatedBy
    ];

    if (foundRowIndex !== -1) {
      sheet.getRange(foundRowIndex, 1, 1, 5).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    if (data.enableLine !== false) {
      try {
        notifyLineCourtNewPlayers_(currentState, finalState);
      } catch (lineErr) {
        console.error('notifyLineCourtNewPlayers_ error:', lineErr);
      }
    }

    return {
      status: 'success',
      data: {
        version: newVersion,
        state: finalState,
        updatedAt: nowStr,
        updatedBy: updatedBy
      }
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}
