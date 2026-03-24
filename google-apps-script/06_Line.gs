// 模組：LINE Messaging API（Push 上場通知）
// 憑證請在「專案設定 → 指令碼屬性」設定：
//   LINE_CHANNEL_ACCESS_TOKEN
//   推播目標 to（擇一即可，優先序由上到下）：
//   LINE_PUSH_TO — 手動指定群組／聊天室 ID
//   LINE_LAST_PUSH_TO_CANDIDATE — Webhook 自動寫入（見 02_Api.logLineWebhookIds_），免再複製

/** @returns {{ token: string|null, to: string|null }} */
function getLinePushConfig_() {
  const props = PropertiesService.getScriptProperties();
  let to = props.getProperty('LINE_PUSH_TO');
  if (!to) {
    to = props.getProperty('LINE_LAST_PUSH_TO_CANDIDATE');
  }
  return {
    token: props.getProperty('LINE_CHANNEL_ACCESS_TOKEN'),
    to: to
  };
}

function isEmptyCourtSlot_(v) {
  return v === null || v === undefined || v === '';
}

function courtsArrayForDiff_(state) {
  if (!state || !state.courts || !state.courts.length) {
    return [];
  }
  return state.courts;
}

/**
 * 比對新上場：某 slot 由空變為有球員 ID
 * @returns {Array<{ courtName: string, playerId: string }>}
 */
function diffNewCourtSlots_(oldState, newState) {
  const oldCourts = courtsArrayForDiff_(oldState);
  const newCourts = courtsArrayForDiff_(newState);
  const out = [];
  for (let c = 0; c < newCourts.length; c++) {
    const nc = newCourts[c];
    const oc = oldCourts[c];
    const newPlayers = (nc && nc.players) ? nc.players : [null, null, null, null];
    const oldPlayers = (oc && oc.players) ? oc.players : [null, null, null, null];
    const courtName = (nc && nc.name !== undefined && nc.name !== null) ? String(nc.name) : String(c + 1);
    for (let s = 0; s < 4; s++) {
      const o = oldPlayers[s];
      const n = newPlayers[s];
      if (isEmptyCourtSlot_(o) && !isEmptyCourtSlot_(n)) {
        out.push({ courtName: courtName, playerId: String(n) });
      }
    }
  }
  return out;
}

/**
 * 內部：依 PlayerStats 某曆日之 Mu（當日即時戰力）。
 * 放在本檔避免未一併部署其他 .gs 時 ReferenceError 導致推播整段被略過。
 * @param {string} dayStr yyyy-MM-dd（台北曆日）
 * @returns {Object<string, number>}
 */
function buildInstantMuMapForDate_(dayStr) {
  const map = {};
  if (!dayStr) {
    return map;
  }
  try {
    const sheet = getSheet(CONFIG.SHEETS.STATS);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return map;
    }
    const headers = data[0];
    const dateIdx = headers.indexOf('Date');
    const idIdx = headers.indexOf('ID');
    const muIdx = headers.indexOf('Mu');
    if (dateIdx === -1 || idIdx === -1 || muIdx === -1) {
      console.error('buildInstantMuMapForDate_: PlayerStats 須含 Date、ID、Mu 欄');
      return map;
    }
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowDate = formatDate(row[dateIdx]);
      if (rowDate !== dayStr) {
        continue;
      }
      const id = String(row[idIdx]);
      const mu = Number(row[muIdx]);
      map[id] = isNaN(mu) ? CONFIG.INITIAL.MU : mu;
    }
  } catch (e) {
    console.error('buildInstantMuMapForDate_ error:', e);
  }
  return map;
}

function getTeamNamesForFlex_(playerIds, nameMap) {
  const names = [];
  for (let i = 0; i < playerIds.length; i++) {
    const pid = playerIds[i];
    if (isEmptyCourtSlot_(pid)) {
      continue;
    }
    const k = String(pid);
    names.push(nameMap[k] !== undefined ? nameMap[k] : k);
  }
  while (names.length < 2) {
    names.push('-');
  }
  return names.slice(0, 2);
}

/** 即時 mu 取自 PlayerStats 當日 Mu；無列則 INITIAL_MU。Math.round(隊伍 mu 加總 × 10) → CP */
function teamCpFromPlayerIds_(playerIds, instantMuMap) {
  let sum = 0;
  for (let i = 0; i < playerIds.length; i++) {
    const pid = playerIds[i];
    if (isEmptyCourtSlot_(pid)) {
      continue;
    }
    const mu = instantMuMap[String(pid)];
    sum += (mu !== undefined && mu !== null && !isNaN(Number(mu))) ? Number(mu) : CONFIG.INITIAL.MU;
  }
  return Math.round(sum * 10);
}

function formatCpLabel_(n) {
  const num = Number(n);
  if (isNaN(num)) {
    return '0 CP';
  }
  try {
    return num.toLocaleString('zh-TW') + ' CP';
  } catch (e) {
    return String(num) + ' CP';
  }
}

function buildLineFlexBubbleForCourt_(court, nameMap, instantMuMap) {
  const players = (court && court.players) ? court.players : [null, null, null, null];
  const courtName = (court && court.name !== undefined && court.name !== null) ? String(court.name) : '?';
  const redTeam = getTeamNamesForFlex_([players[0], players[1]], nameMap);
  const blueTeam = getTeamNamesForFlex_([players[2], players[3]], nameMap);
  const redCp = teamCpFromPlayerIds_([players[0], players[1]], instantMuMap);
  const blueCp = teamCpFromPlayerIds_([players[2], players[3]], instantMuMap);
  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'horizontal',
      alignItems: 'center',
      contents: [
        {
          type: 'text',
          text: '🏸 安柏羽球 | 新上場',
          color: '#ffffff',
          weight: 'bold',
          size: 'sm',
          flex: 1
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📍 場地 ' + courtName,
              color: '#0ba360',
              weight: 'bold',
              size: 'xs',
              align: 'center'
            }
          ],
          backgroundColor: '#ffffff',
          cornerRadius: 'xl',
          paddingStart: 'sm',
          paddingEnd: 'sm',
          paddingTop: 'xs',
          paddingBottom: 'xs',
          flex: 0
        }
      ],
      paddingAll: 'md',
      background: {
        type: 'linearGradient',
        angle: '90deg',
        startColor: '#0ba360',
        endColor: '#3cba92'
      }
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          alignItems: 'center',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              justifyContent: 'center',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: redTeam[0],
                  align: 'center',
                  weight: 'bold',
                  size: 'lg',
                  color: '#2C3E50'
                },
                {
                  type: 'text',
                  text: redTeam[1],
                  align: 'center',
                  weight: 'bold',
                  size: 'lg',
                  color: '#2C3E50'
                },
                {
                  type: 'text',
                  text: '總戰力',
                  size: 'xxs',
                  color: '#7F8C8D',
                  align: 'center',
                  weight: 'bold',
                  margin: 'md'
                },
                {
                  type: 'text',
                  text: formatCpLabel_(redCp),
                  align: 'center',
                  weight: 'bold',
                  size: 'md',
                  color: '#C0392B'
                }
              ],
              flex: 4,
              backgroundColor: '#FDEDEC',
              cornerRadius: 'md',
              paddingAll: 'lg'
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'VS',
                  align: 'center',
                  weight: 'bold',
                  color: '#D5D8DC',
                  size: 'xl',
                  style: 'italic'
                }
              ],
              flex: 3,
              justifyContent: 'center'
            },
            {
              type: 'box',
              layout: 'vertical',
              justifyContent: 'center',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: blueTeam[0],
                  align: 'center',
                  weight: 'bold',
                  size: 'lg',
                  color: '#2C3E50'
                },
                {
                  type: 'text',
                  text: blueTeam[1],
                  align: 'center',
                  weight: 'bold',
                  size: 'lg',
                  color: '#2C3E50'
                },
                {
                  type: 'text',
                  text: '總戰力',
                  size: 'xxs',
                  color: '#7F8C8D',
                  align: 'center',
                  weight: 'bold',
                  margin: 'md'
                },
                {
                  type: 'text',
                  text: formatCpLabel_(blueCp),
                  align: 'center',
                  weight: 'bold',
                  size: 'md',
                  color: '#2471A3'
                }
              ],
              flex: 4,
              backgroundColor: '#EBF5FB',
              cornerRadius: 'md',
              paddingAll: 'lg'
            }
          ]
        }
      ],
      paddingAll: 'lg'
    }
  };
}

function pushLineMessages_(messages) {
  const cfg = getLinePushConfig_();
  if (!cfg.token || !cfg.to || !messages || !messages.length) {
    return;
  }
  try {
    const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + cfg.token },
      payload: JSON.stringify({
        to: cfg.to,
        messages: messages
      }),
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    if (code < 200 || code >= 300) {
      console.error('LINE push HTTP ' + code + ': ' + res.getContentText());
    }
  } catch (e) {
    console.error('pushLineMessages_ error:', e);
  }
}

function notifyLineCourtNewPlayers_(currentState, finalState) {
  const added = diffNewCourtSlots_(currentState, finalState);
  if (added.length === 0) {
    return;
  }
  const nameMap = buildPlayerIdNameMap_();
  let instantMuMap = {};
  try {
    const todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    instantMuMap = buildInstantMuMapForDate_(todayStr);
  } catch (e) {
    console.error('LINE instantMuMap:', e);
  }
  const finalCourts = courtsArrayForDiff_(finalState);
  const touchedCourtNames = {};
  for (let i = 0; i < added.length; i++) {
    touchedCourtNames[String(added[i].courtName)] = true;
  }

  const bubbles = [];
  for (let i = 0; i < finalCourts.length; i++) {
    const court = finalCourts[i];
    const courtName = (court && court.name !== undefined && court.name !== null) ? String(court.name) : String(i + 1);
    if (!touchedCourtNames[courtName]) {
      continue;
    }
    bubbles.push(buildLineFlexBubbleForCourt_(court, nameMap, instantMuMap));
  }

  if (bubbles.length === 0) {
    return;
  }
  const flexContents = (bubbles.length === 1)
    ? bubbles[0]
    : { type: 'carousel', contents: bubbles };

  pushLineMessages_([
    {
      type: 'flex',
      altText: '安柏羽球新上場通知',
      contents: flexContents
    }
  ]);
}
