# Apps Script 部署（clasp）

## 一次性設定

1. 安裝依賴：`npm install`
2. 登入 Google：`npx clasp login`
3. **開啟 Apps Script API**（clasp 必備）：<https://script.google.com/home/usersettings> → 將「Google Apps Script API」設為開啟；若剛開啟，請等數分鐘再 `push`。
4. 確認本目錄內已有 `clasp.test.json` / `clasp.prod.json`（內含各環境 `scriptId`）

## 上傳程式碼

| 指令 | 說明 |
|------|------|
| `npm run gas:push:test` | 推送到**測試** Apps Script 專案 |
| `npm run gas:push:prod` | 推送到**正式** Apps Script 專案 |

執行時會將對應的 `clasp.*.json` 複製為 `.clasp.json`，再在 `google-apps-script/` 執行 `clasp push`。

## 從雲端拉回

| 指令 |
|------|
| `npm run gas:pull:test` |
| `npm run gas:pull:prod` |

## 其他

- `npm run gas:open:test` / `gas:open:prod`：在瀏覽器開啟該專案編輯器
- Web App 部署網址與「部署」動作仍在 Apps Script 網頁操作；`clasp` 只同步程式碼。
- 前端請用不同 `VITE_GAS_URL` 分別指向測試／正式部署的 Web App URL。
