// 模組：HTTP 進入點（全專案僅此檔宣告 doGet / doPost）

/** 統一回傳格式 */
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
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
    'getCourtState': () => getCourtState(date),
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
 * LINE Webhook 收到群組／聊天室事件時寫入指令碼屬性 LINE_LAST_PUSH_TO_CANDIDATE。
 * getLinePushConfig_() 會自動讀取此鍵作為推播 to，無須再複製到 LINE_PUSH_TO（除非要以 LINE_PUSH_TO 手動覆寫）。
 */
function logLineWebhookIds_(data) {
  if (!data || !data.events || !data.events.length) {
    return;
  }
  const props = PropertiesService.getScriptProperties();
  const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  for (let i = 0; i < data.events.length; i++) {
    const ev = data.events[i];
    const src = ev.source;
    if (!src) {
      continue;
    }
    if (src.groupId) {
      console.log('[LINE Webhook] 群組 ID: ' + src.groupId);
      props.setProperty('LINE_LAST_PUSH_TO_CANDIDATE', String(src.groupId));
      props.setProperty('LINE_LAST_WEBHOOK_KIND', 'group');
      props.setProperty('LINE_LAST_WEBHOOK_AT', now);
    }
    if (src.roomId) {
      console.log('[LINE Webhook] 多人聊天室 ID: ' + src.roomId);
      if (!src.groupId) {
        props.setProperty('LINE_LAST_PUSH_TO_CANDIDATE', String(src.roomId));
        props.setProperty('LINE_LAST_WEBHOOK_KIND', 'room');
        props.setProperty('LINE_LAST_WEBHOOK_AT', now);
      }
    }
  }
}

/**
 * HTTP POST 進入點 (寫入/修改邏輯)
 * 自訂 JSON 請求須含 action；若為 LINE Webhook（含 events）則只記錄 ID 並回 200。
 */
function doPost(e) {
  try {
    const raw = e.postData && e.postData.contents;
    if (!raw) {
      return createResponse({ status: 'error', message: 'Empty body' });
    }
    const data = JSON.parse(raw);
    if (data.events && Array.isArray(data.events)) {
      logLineWebhookIds_(data);
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }
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
      'unbindPlayer': () => unbindPlayer(data.playerId, data.userEmail),
      'updateCourtState': () => updateCourtState(data)
    };

    const fn = actions[action];
    if (!fn) return createResponse({ status: 'error', message: 'Unknown action: ' + action });

    return createResponse(fn());
  } catch (err) {
    return createResponse({ status: 'error', message: err.toString() });
  }
}
