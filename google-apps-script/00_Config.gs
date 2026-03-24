// ==========================================
// 安柏排點大師 API (Google Apps Script) - V6.0
// 模組：設定與試算表連線（請勿刪除此檔或調整為最上層載入順序）
// ==========================================

const CONFIG = {
  SHEETS: {
    PLAYERS: 'Players',
    MATCHES: 'Matches',
    STATS: 'PlayerStats',
    COURT_STATE: 'CourtState'
  },
  TIMEZONE: 'Asia/Taipei',
  INITIAL: {
    MU: 25.0,
    SIGMA: 8.333
  }
};

let _ss;
/** 綁定試算表單一來源（場地初始化請用此函式，勿混用 getActiveSpreadsheet） */
function getSs() {
  if (!_ss) _ss = SpreadsheetApp.getActiveSpreadsheet();
  return _ss;
}

/** 取得試算表 Helper */
function getSheet(name) {
  const ss = getSs();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Sheet "${name}" not found`);
  return sheet;
}
