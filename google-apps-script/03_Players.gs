// 模組：球員 CRUD、帳號綁定、依 email 查名稱（供場地控制權顯示）

/** 取得球員名單 (讀取 A-F 欄位) */
function getPlayers() {
  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const data = sheet.getDataRange().getValues();
  const players = data.slice(1).map(row => {
    const rowEmail = normalizeEmail(row[5]);

    return {
      id: String(row[0]),
      name: String(row[1]),
      avatar: row[2] ? String(row[2]) : '',
      mu: Number(row[3]) || CONFIG.INITIAL.MU,
      sigma: Number(row[4]) || CONFIG.INITIAL.SIGMA,
      hasBinding: !!rowEmail,
      isGoogleLinked: !!rowEmail && rowEmail.includes('@'),
      type: row[6] ? String(row[6]) : 'guest'
    };
  });

  return { status: 'success', data: players };
}

function getPlayerBinding(playerId, userEmail) {
  const normalizedEmail = normalizeEmail(userEmail);
  if (!playerId || !normalizedEmail) {
    return { status: 'error', code: 'MISSING_PARAMS', message: 'playerId and userEmail are required' };
  }

  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex((row, i) => i > 0 && String(row[0]) === String(playerId));
  if (rowIndex === -1) {
    return { status: 'error', code: 'PLAYER_NOT_FOUND', message: 'Player not found' };
  }

  const boundEmail = normalizeEmail(data[rowIndex][5]);
  if (!boundEmail) {
    return { status: 'success', data: { isOwner: false, isBound: false } };
  }

  return {
    status: 'success',
    data: {
      isOwner: boundEmail === normalizedEmail,
      isBound: true
    }
  };
}

function getUserBinding(userEmail) {
  const normalizedEmail = normalizeEmail(userEmail);
  if (!normalizedEmail) {
    return { status: 'error', code: 'MISSING_PARAMS', message: 'userEmail is required' };
  }

  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const data = sheet.getDataRange().getValues();
  const row = data.find((r, i) => i > 0 && normalizeEmail(r[5]) === normalizedEmail);

  if (!row) {
    return { status: 'success', data: { isBound: false, playerId: '', playerName: '', avatar: '' } };
  }

  return {
    status: 'success',
    data: {
      isBound: true,
      playerId: String(row[0] || ''),
      playerName: String(row[1] || ''),
      avatar: row[2] ? String(row[2]) : ''
    }
  };
}

function bindPlayer(playerId, userEmail) {
  const normalizedEmail = normalizeEmail(userEmail);
  if (!playerId || !normalizedEmail) {
    return { status: 'error', code: 'MISSING_PARAMS', message: 'playerId and userEmail are required' };
  }

  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const data = sheet.getDataRange().getValues();
  const targetRowIndex = data.findIndex((row, i) => i > 0 && String(row[0]) === String(playerId));

  if (targetRowIndex === -1) {
    return { status: 'error', code: 'PLAYER_NOT_FOUND', message: 'Player not found' };
  }

  const duplicateRowIndex = data.findIndex((row, i) => {
    if (i === 0 || String(row[0]) === String(playerId)) return false;
    return normalizeEmail(row[5]) === normalizedEmail;
  });
  if (duplicateRowIndex !== -1) {
    return {
      status: 'error',
      code: 'ALREADY_BOUND_TO_OTHER_PLAYER',
      message: 'This account is already bound to another player'
    };
  }

  const currentBoundEmail = normalizeEmail(data[targetRowIndex][5]);
  if (currentBoundEmail && currentBoundEmail !== normalizedEmail) {
    return { status: 'error', code: 'PLAYER_ALREADY_BOUND', message: 'This player is already bound' };
  }

  if (currentBoundEmail === normalizedEmail) {
    return { status: 'success', data: { playerId: String(playerId), alreadyBound: true } };
  }

  sheet.getRange(targetRowIndex + 1, 6).setValue(normalizedEmail);
  return { status: 'success', data: { playerId: String(playerId), alreadyBound: false } };
}

function unbindPlayer(playerId, userEmail) {
  const normalizedEmail = normalizeEmail(userEmail);
  if (!playerId || !normalizedEmail) {
    return { status: 'error', code: 'MISSING_PARAMS', message: 'playerId and userEmail are required' };
  }

  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex((row, i) => i > 0 && String(row[0]) === String(playerId));

  if (rowIndex === -1) {
    return { status: 'error', code: 'PLAYER_NOT_FOUND', message: 'Player not found' };
  }

  const currentBoundEmail = normalizeEmail(data[rowIndex][5]);
  if (!currentBoundEmail) {
    return { status: 'success', data: { playerId: String(playerId), alreadyUnbound: true } };
  }

  if (currentBoundEmail !== normalizedEmail) {
    return { status: 'error', code: 'NOT_OWNER', message: 'Only owner can unbind' };
  }

  sheet.getRange(rowIndex + 1, 6).setValue('');
  return { status: 'success', data: { playerId: String(playerId), alreadyUnbound: false } };
}

/** 新增球員 */
function addPlayer(name, avatar, type) {
  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const id = new Date().getTime().toString();
  const finalAvatar = avatar || getRandomAvatar();
  const finalType = type || 'guest';
  sheet.appendRow([id, name, finalAvatar, CONFIG.INITIAL.MU, CONFIG.INITIAL.SIGMA, '', finalType]);
  return { status: 'success', data: { id, name, avatar: finalAvatar, type: finalType } };
}

/** 批次新增球員 */
function addPlayersBatch(names) {
  if (!names || names.length === 0) return { status: 'error', message: 'No names provided' };
  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const now = new Date().getTime();
  const rows = names.map((p, i) => {
    const name = typeof p === 'string' ? p : p.name;
    const avatar = (typeof p === 'object' && p.avatar) ? p.avatar : getRandomAvatar();
    const type = (typeof p === 'object' && p.type) ? p.type : 'guest';
    return [
      (now + i).toString(),
      name,
      avatar,
      CONFIG.INITIAL.MU,
      CONFIG.INITIAL.SIGMA,
      '',
      type
    ];
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  return { status: 'success', message: `Added ${rows.length} players` };
}

/** 更新球員資訊 */
function updatePlayer(id, name, avatar, type) {
  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => String(row[0]) === String(id));

  if (rowIndex === -1) return { status: 'error', message: 'Player not found' };

  const rowNum = rowIndex + 1;
  if (name !== undefined) sheet.getRange(rowNum, 2).setValue(name);
  if (avatar !== undefined) sheet.getRange(rowNum, 3).setValue(avatar);
  if (type !== undefined) sheet.getRange(rowNum, 7).setValue(type);

  return { status: 'success', message: 'Player updated' };
}

/** 刪除球員 */
function deletePlayer(id) {
  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => String(row[0]) === String(id));

  if (rowIndex === -1) return { status: 'error', message: 'Player not found' };

  sheet.deleteRow(rowIndex + 1);
  return { status: 'success', message: 'Player deleted' };
}

/** 批次刪除球員 (高效過濾法) */
function deletePlayersBatch(ids) {
  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const data = sheet.getDataRange().getValues();
  const idSet = new Set(ids.map(String));

  const newData = data.filter((row, i) => i === 0 || !idSet.has(String(row[0])));

  if (!newData.length || !newData[0]) {
    sheet.clearContents();
    return { status: 'success', data: { removedCount: data.length } };
  }

  const numCols = newData[0].length;
  sheet.clearContents();
  sheet.getRange(1, 1, newData.length, numCols).setValues(newData);
  return { status: 'success', data: { removedCount: data.length - newData.length } };
}

/** 批次更新球員屬性 (Mu/Sigma) */
function batchUpdatePlayers(updates) {
  if (!updates || !Array.isArray(updates)) return { status: 'error', message: 'Invalid updates' };

  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const data = sheet.getDataRange().getValues();
  const idMap = {};
  data.forEach((row, i) => {
    if (i === 0) return;
    idMap[String(row[0])] = i + 1;
  });

  updates.forEach(u => {
    const rowIndex = idMap[String(u.id)];
    if (rowIndex) {
      if (u.mu !== undefined && u.sigma !== undefined) {
        sheet.getRange(rowIndex, 4, 1, 2).setValues([[u.mu, u.sigma]]);
      } else if (u.mu !== undefined) {
        sheet.getRange(rowIndex, 4).setValue(u.mu);
      }
    }
  });

  return { status: 'success', message: `Updated ${updates.length} players` };
}

/**
 * 內部：一次讀取 Players 表建立 id → 顯示名稱（供 LINE 推播等批次查名，避免每個 ID 掃表一次）
 * @returns {Object<string, string>}
 */
function buildPlayerIdNameMap_() {
  const map = {};
  try {
    const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      map[String(data[i][0])] = String(data[i][1] || data[i][0]);
    }
  } catch (e) {
    console.error('buildPlayerIdNameMap_ error:', e);
  }
  return map;
}

/** 內部 Helper: 透過信箱尋找球員對應的顯示名稱 */
function getPlayerNameByEmail_(email) {
  if (!email) return null;
  var normalized = normalizeEmail(email);
  try {
    var sheet = getSheet(CONFIG.SHEETS.PLAYERS);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (normalizeEmail(data[i][5]) === normalized) {
        return String(data[i][1]);
      }
    }
  } catch (e) {
    console.error('getPlayerNameByEmail_ error:', e);
  }
  return null;
}
