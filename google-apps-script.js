// ==========================================
// 安柏排點大師 API (Google Apps Script) - V6.0
// 優化重點：效能提升、程式碼結構重組、增量更新效率優化
// ==========================================

const CONFIG = {
  SHEETS: {
    PLAYERS: 'Players',
    MATCHES: 'Matches',
    STATS: 'PlayerStats'
  },
  TIMEZONE: 'Asia/Taipei',
  INITIAL: {
    MU: 25.0,
    SIGMA: 8.333
  }
};

let _ss;
function getSs() {
  if (!_ss) _ss = SpreadsheetApp.getActiveSpreadsheet();
  return _ss;
}

/**
 * HTTP GET 進入點 (查詢邏輯)
 */
function doGet(e) {
  const p = e.parameter;
  const action = p.action;
  const playerId = p.playerId;
  const userEmail = p.userEmail;
  const date = p.date;

  const actions = {
    'getMatches': () => getMatches(date),
    'getPlayerStats': () => getPlayerStats(),
    'getPlayerBinding': () => getPlayerBinding(playerId, userEmail),
    'getUserBinding': () => getUserBinding(userEmail),
    'default': () => getPlayers()
  };

  try {
    const fn = actions[action] || actions['default'];
    return createResponse(fn());
  } catch (err) {
    return createResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * HTTP POST 進入點 (寫入/修改邏輯)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const actions = {
      'addPlayer': () => addPlayer(data.name, data.avatar),
      'addPlayersBatch': () => addPlayersBatch(data.names),
      'updatePlayer': () => updatePlayer(data.id, data.name, data.avatar),
      'deletePlayer': () => deletePlayer(data.id),
      'deletePlayersBatch': () => deletePlayersBatch(data.ids),
      'recordMatchAndUpdate': () => recordMatchAndUpdate(data),
      'batchUpdatePlayers': () => batchUpdatePlayers(data.updates),
      'bindPlayer': () => bindPlayer(data.playerId, data.userEmail),
      'unbindPlayer': () => unbindPlayer(data.playerId, data.userEmail)
    };

    const fn = actions[action];
    if (!fn) return createResponse({ status: 'error', message: 'Unknown action: ' + action });
    
    return createResponse(fn());
  } catch (err) {
    return createResponse({ status: 'error', message: err.toString() });
  }
}

/** 統一回傳格式 */
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 取得試算表 Helper */
function getSheet(name) {
  const ss = getSs();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Sheet "${name}" not found`);
  return sheet;
}

/** 格式化日期 Helper */
function formatDate(val, formatStr = "yyyy-MM-dd") {
  if (!val) return '';
  
  if (val instanceof Date) {
    return Utilities.formatDate(val, CONFIG.TIMEZONE, formatStr);
  }
  
  if (typeof val === 'string') {
    // 處理帶有單引號前綴的情況
    const cleanVal = val.startsWith("'") ? val.substring(1) : val;
    
    if (formatStr === "yyyy-MM-dd") {
      return cleanVal.split(/[T ]/)[0];
    }
    return cleanVal; // 如果要求完整格式，直接回傳清理後的字串
  }
  
  return String(val);
}

function normalizeEmail(email) {
  return email ? String(email).trim().toLowerCase() : '';
}

/** 隨機頭像 Helper */
function getRandomAvatar() {
  const styles = ['avataaars', 'bottts', 'micah', 'identicon', 'lorelei'];
  const seeds = ['Felix', 'Aneka', 'Midnight', 'Bubba', 'Sasha', 'Snuggles', 'Gizmo', 'Zoe', 'Luna', 'Apollo', 'Atlas', 'Pixel', 'Turbo'];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const seed = seeds[Math.floor(Math.random() * seeds.length)];
  return `${style}:${seed}`;
}

// ─── 核心功能實作 ───

/** 取得球員名單 (讀取 A-F 欄位) */
function getPlayers() {
  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const data = sheet.getDataRange().getValues();
  // 欄位索引：0:ID, 1:Name, 2:Avatar, 3:Mu, 4:Sigma, 5:Email
  const players = data.slice(1).map(row => {
    const rowEmail = normalizeEmail(row[5]);

    return {
      id: String(row[0]),
      name: String(row[1]),
      avatar: row[2] ? String(row[2]) : '',
      mu: Number(row[3]) || CONFIG.INITIAL.MU,
      sigma: Number(row[4]) || CONFIG.INITIAL.SIGMA,
      hasBinding: !!rowEmail
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
function addPlayer(name, avatar) {
  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const id = new Date().getTime().toString();
  const finalAvatar = avatar || getRandomAvatar();
  sheet.appendRow([id, name, finalAvatar, CONFIG.INITIAL.MU, CONFIG.INITIAL.SIGMA]);
  return { status: 'success', data: { id, name, avatar: finalAvatar } };
}

/** 批次新增球員 */
function addPlayersBatch(names) {
  if (!names || names.length === 0) return { status: 'error', message: 'No names provided' };
  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const now = new Date().getTime();
  const rows = names.map((name, i) => [
    (now + i).toString(), 
    name, 
    getRandomAvatar(), 
    CONFIG.INITIAL.MU, 
    CONFIG.INITIAL.SIGMA
  ]);
  
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
  return { status: 'success', message: `Added ${rows.length} players` };
}

/** 更新球員資訊 */
function updatePlayer(id, name, avatar) {
  const sheet = getSheet(CONFIG.SHEETS.PLAYERS);
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => String(row[0]) === String(id));
  
  if (rowIndex === -1) return { status: 'error', message: 'Player not found' };
  
  const rowNum = rowIndex + 1;
  sheet.getRange(rowNum, 2).setValue(name);
  if (avatar !== undefined) sheet.getRange(rowNum, 3).setValue(avatar);
  
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
  
  sheet.clearContents();
  sheet.getRange(1, 1, newData.length, newData[0].length).setValues(newData);
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

/** 取得對戰紀錄 */
function getMatches(filterDate) {
  const sheet = getSheet(CONFIG.SHEETS.MATCHES);
  const data = sheet.getDataRange().getValues();
  
  const matches = data.slice(1).reverse().filter(row => {
    if (!filterDate) return true;
    return formatDate(row[1]) === filterDate;
  }).map(row => {
    let team1 = [{ name: row[2] }, { name: row[3] }];
    let team2 = [{ name: row[4] }, { name: row[5] }];
    
    if (row[9]) { // 第 10 欄 JSON 持久化戰力
      try {
        const up = JSON.parse(row[9]);
        const map = (p) => {
          const u = up.find(u => u.name === p.name);
          return u ? { ...p, muBefore: u.muBefore, muAfter: u.muAfter, id: u.id, avatar: u.avatar } : p;
        };
        team1 = team1.map(map);
        team2 = team2.map(map);
      } catch (e) {}
    }
    
    return {
      id: String(row[0]),
      date: formatDate(row[1], "yyyy-MM-dd HH:mm:ss"),
      matchDate: formatDate(row[1]), // YYYY-MM-DD，前端篩選用
      team1, team2,
      winner: row[6] === 'Team 1' ? 1 : 2,
      score: String(row[7] || ''),
      duration: String(row[8] || ''),
      courtName: String(row[10] || ''),
      matchNo: row[11] || undefined
    };
  });

  return { status: 'success', data: matches };
}

/** 取得戰力快照 */
function getPlayerStats() {
  const sheet = getSheet(CONFIG.SHEETS.STATS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'success', data: [] };
  
  const headers = data[0];
  const stats = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (h === 'Date' || h === 'date') ? formatDate(row[i]) : row[i];
    });
    return obj;
  });
  
  return { status: 'success', data: stats };
}

/** 紀錄比賽並同步更新所有表單 (核心優化) */
function recordMatchAndUpdate(data) {
  const matchSheet = getSheet(CONFIG.SHEETS.MATCHES);
  const statsSheet = getSheet(CONFIG.SHEETS.STATS);
  const playerSheet = getSheet(CONFIG.SHEETS.PLAYERS);
  
  const matchId = data.matchId || Date.now().toString();
  const nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");
  
  // 1. 寫入 Matches
  const dayStr = formatDate(nowStr);
  const matchNo = data.matchNo || (matchSheet.getDataRange().getValues()
    .filter((row, i) => i > 0 && formatDate(row[1]) === dayStr).length + 1);

  matchSheet.appendRow([
    matchId, "'" + nowStr, 
    data.t1p1, data.t1p2, data.t2p1, data.t2p2, 
    data.winnerTeam, data.score || '', data.duration || '',
    JSON.stringify(data.updatedPlayers || []),
    data.courtName || '',
    matchNo
  ]);
  
  // 2. 更新 PlayerStats (使用 Map 優化搜尋)
  if (data.updatedStats && data.updatedStats.length > 0) {
    const statsData = statsSheet.getDataRange().getValues();
    const headers = statsData[0];
    const dateIdx = headers.indexOf('Date');
    const idIdx = headers.indexOf('ID');

    // 建立 索引物件 { "2024-03-20_ID123": rowIndex }
    const statsIndexMap = {};
    statsData.forEach((row, i) => {
      if (i === 0) return;
      const key = `${formatDate(row[dateIdx])}_${row[idIdx]}`;
      statsIndexMap[key] = i + 1;
    });

    data.updatedStats.forEach(stat => {
      const key = `${stat.Date}_${stat.ID}`;
      const rowValues = headers.map(h => stat[h] !== undefined ? stat[h] : '');
      const rowIndex = statsIndexMap[key];
      
      if (rowIndex) statsSheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
      else statsSheet.appendRow(rowValues);
    });
  }
  
  // 3. 更新 Players 綜合戰力 (D, E 欄)
  if (data.updatedPlayers && data.updatedPlayers.length > 0) {
    const playerData = playerSheet.getDataRange().getValues();
    const playerIndexMap = {};
    playerData.forEach((row, i) => {
      if (i === 0) return;
      playerIndexMap[String(row[0])] = i + 1;
    });

    data.updatedPlayers.forEach(p => {
      const rowIndex = playerIndexMap[String(p.id)];
      if (rowIndex) {
        playerSheet.getRange(rowIndex, 4, 1, 2).setValues([[p.mu, p.sigma]]);
      }
    });
  }
  
  return { status: 'success', matchId };
}
