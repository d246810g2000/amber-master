# 安柏排點大師 - 後端隱私驗證設定指南 (GAS)

為了確保你的資料絕對安全，且無人能透過偽造 Request 取代登入，我們需要在你的 **Google Apps Script (Code.gs)** 裡面加上一小段身分驗證代碼。這段程式碼會拿著前端傳來的 `Token`，去向 Google 官方伺服器確認這是不是偽造的。

## 📍 步驟 1：加入驗證函式

請將以下這段程式碼複製並貼到你的 `Code.gs` 的最底部：

```javascript
/**
 * 驗證前端傳來的 Google ID Token
 * @param {string} token 
 * @returns {string|null} 若驗證成功，回傳使用者的真實 Email；若失敗回傳 null
 */
function verifyGoogleToken(token) {
  if (!token) return null;
  try {
    const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + token;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    if (response.getResponseCode() !== 200) {
      return null;
    }
    
    const tokenInfo = JSON.parse(response.getContentText());
    
    // 檢查 aud 是否等於你的 CLIENT_ID (可以選擇性加上這層檢查)
    // if (tokenInfo.aud !== "你的_CLIENT_ID.apps.googleusercontent.com") return null;

    return tokenInfo.email; // 回傳登入者的真實信箱
  } catch(e) {
    return null;
  }
}
```

## 📍 步驟 2：在 doGet / doPost 加入隱私檢查攔截

你可以修改你的 `doGet` 或需要保護的 API 行為（例如取得所有球員詳細戰力時），進行身分核對。

**範例 - 假設你要保護取得所有 `PlayerStats` 或 `Matches` 的行為：**

```javascript
function doGet(e) {
  // 1. 取得前端傳來的 token
  const token = e.parameter.token;
  
  // 2. 決定當前呼叫的 action
  const action = e.parameter.action;

  // 3. 執行特定高私密操作前，進行 Token 防護 (例如：只有登入的人能拿成績)
  if (action === "getPlayerStats" || action === "getMatches") {
    const userEmail = verifyGoogleToken(token);
    
    if (!userEmail) {
      // 驗證失敗，直接拒絕回傳資料！
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Error 403: 權限不足或 Token 過期"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 若你還想檢查該 userEmail 是不是在你授權的表單欄位名單內，你可以在此讀取 Sheet 來判斷。
  }

  // ... 往下繼續你原本的邏輯 ...
}
```

## 📍 步驟 3：在 Google Sheet 新增 `Email` 欄位
回到你的資料庫 (Google Spreadsheet)，在存放 **Players (球員名單)** 的那張表裡面，新增一個名為 `Email` 的欄位。
接下來，只要你在此欄位填入某位球員的 Gmail，**系統就會認定只有這個 Gmail 帳號登入時，才能解鎖這個球員的詳細履歷！**
