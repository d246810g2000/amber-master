// 模組：對戰紀錄、戰力快照、賽後寫入
// Matches 表假設：新對戰以 appendRow 寫入，第 B 欄日期大致為列號遞增（由舊到新）。
// 有指定 date 時以二分搜尋只讀該曆日列區間，避免 getDataRange 全表掃描。

/** @param {GoogleAppsScript.Spreadsheet.Sheet} sheet */
function getMatchDayStrAtRow_(sheet, row1Based) {
  const v = sheet.getRange(row1Based, 2).getValue();
  return formatDate(v);
}

/** 下一個曆日 YYYY-MM-DD（台北時區） */
function nextYYYYMMDD_(dayStr) {
  const parts = String(dayStr).split('-');
  if (parts.length !== 3) return '';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + 1);
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

/**
 * 第一列資料列（列 2）的日期字串 <= 最後一列時，視為遞增，可使用二分搜尋。
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function isMatchesDateAscending_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return true;
  const dFirst = getMatchDayStrAtRow_(sheet, 2);
  const dLast = getMatchDayStrAtRow_(sheet, lastRow);
  return dFirst <= dLast;
}

/**
 * 最小列號 r ∈ [2, lastRow] 使得該列曆日 >= dayStr；若無則回傳 lastRow+1
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function lowerBoundDayGTE_(sheet, lastRow, dayStr) {
  let lo = 2;
  let hi = lastRow;
  let ans = lastRow + 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const d = getMatchDayStrAtRow_(sheet, mid);
    if (d >= dayStr) {
      ans = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return ans;
}

/**
 * 將 Matches 單列轉成 API 物件（欄位與 getMatches 原本 map 一致）
 */
function mapMatchRowToObject_(row) {
  let team1 = [{ name: row[2] }, { name: row[3] }];
  let team2 = [{ name: row[4] }, { name: row[5] }];

  if (row[9]) {
    try {
      const up = JSON.parse(row[9]);
      const map = (p) => {
        const u = up.find(x => x.name === p.name);
        return u ? { ...p, muBefore: u.muBefore, muAfter: u.muAfter, id: u.id, avatar: u.avatar } : p;
      };
      team1 = team1.map(map);
      team2 = team2.map(map);
    } catch (e) {}
  }

  return {
    id: String(row[0]),
    date: formatDate(row[1], 'yyyy-MM-dd HH:mm:ss'),
    matchDate: formatDate(row[1]),
    team1: team1,
    team2: team2,
    winner: row[6] === 'Team 1' ? 1 : 2,
    score: String(row[7] || ''),
    duration: String(row[8] || ''),
    courtName: String(row[10] || ''),
    matchNo: row[11] || undefined
  };
}

function isEmptyMatchRow_(row) {
  if (!row) return true;
  const id = row[0];
  const date = row[1];
  const t1p1 = row[2];
  const t1p2 = row[3];
  const t2p1 = row[4];
  const t2p2 = row[5];
  return !id && !date && !t1p1 && !t1p2 && !t2p1 && !t2p2;
}

/**
 * 指定曆日之對戰筆數（用於 matchNo）；若無法二分則退回全表篩選。
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function countMatchesOnDay_(sheet, dayStr) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  if (!isMatchesDateAscending_(sheet)) {
    const data = sheet.getDataRange().getValues();
    return data.filter((row, i) => i > 0 && formatDate(row[1]) === dayStr).length;
  }
  const start = lowerBoundDayGTE_(sheet, lastRow, dayStr);
  const nextD = nextYYYYMMDD_(dayStr);
  if (!nextD) return 0;
  const endEx = lowerBoundDayGTE_(sheet, lastRow, nextD);
  if (start > lastRow || getMatchDayStrAtRow_(sheet, start) !== dayStr) return 0;
  return Math.max(0, endEx - start);
}

/** 取得對戰紀錄（有 date 時優先只讀該日列區間） */
function getMatches(filterDate) {
  const sheet = getSheet(CONFIG.SHEETS.MATCHES);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { status: 'success', data: [] };
  }

  if (filterDate && isMatchesDateAscending_(sheet)) {
    const nextD = nextYYYYMMDD_(filterDate);
    if (!nextD) {
      return getMatchesFullScan_(sheet, filterDate);
    }
    const start = lowerBoundDayGTE_(sheet, lastRow, filterDate);
    const endEx = lowerBoundDayGTE_(sheet, lastRow, nextD);
    if (start > lastRow || getMatchDayStrAtRow_(sheet, start) !== filterDate) {
      return { status: 'success', data: [] };
    }
    const end = Math.min(endEx - 1, lastRow);
    if (start > end) {
      return { status: 'success', data: [] };
    }
    const lastCol = Math.max(sheet.getLastColumn(), 12);
    const rowCount = end - start + 1;
    const range = sheet.getRange(start, 1, rowCount, lastCol);
    const rows = range.getValues();
    const matches = rows
      .filter(row => !isEmptyMatchRow_(row))
      .slice()
      .reverse()
      .map(row => mapMatchRowToObject_(row));
    return { status: 'success', data: matches };
  }

  return getMatchesFullScan_(sheet, filterDate);
}

/**
 * 全表讀取（無 date 或無法假設遞增時）
 */
function getMatchesFullScan_(sheet, filterDate) {
  const data = sheet.getDataRange().getValues();
  const matches = data.slice(1).reverse().filter(row => {
    if (isEmptyMatchRow_(row)) return false;
    if (!filterDate) return true;
    return formatDate(row[1]) === filterDate;
  }).map(row => mapMatchRowToObject_(row));
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
  const nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

  const dayStr = formatDate(nowStr);
  const matchNo = data.matchNo || (countMatchesOnDay_(matchSheet, dayStr) + 1);

  matchSheet.appendRow([
    matchId, "'" + nowStr,
    data.t1p1, data.t1p2, data.t2p1, data.t2p2,
    data.winnerTeam, (data.score ? "'" + data.score : ''), (data.duration ? "'" + data.duration : ''),
    JSON.stringify(data.updatedPlayers || []),
    data.courtName || '',
    matchNo
  ]);

  if (data.updatedStats && data.updatedStats.length > 0) {
    const statsData = statsSheet.getDataRange().getValues();
    const headers = statsData[0];
    const dateIdx = headers.indexOf('Date');
    const idIdx = headers.indexOf('ID');
    if (dateIdx === -1 || idIdx === -1) {
      console.error('recordMatchAndUpdate: PlayerStats 第一列須含 Date 與 ID 欄');
    }

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
