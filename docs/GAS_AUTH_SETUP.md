# 安柏排點大師 - 簡化綁定驗證說明 (GAS)

本專案改為「內部社員用」的簡化驗證，不再做 Google ID token 解碼/驗證。  
核心規則是：**以登入 email + PlayerID 做綁定與比對**，並遵守一對一限制。

## 核心規則

- `Players` 工作表第 6 欄 (`Email`) 作為綁定欄位。
- 一個 Google 帳號（email）只能綁定一個 `PlayerID`。
- 已被其他人綁定的球員不可再綁定。
- 只有綁定者本人可以解除綁定。
- 前端列表不回傳他人 email，只回傳 `hasBinding`。

## 頭像欄位（`Players` 第 3 欄 `Avatar`）

- **自訂（Dicebear）**：`風格:種子`，例如 `avataaars:王小明`（與既有邏輯相同）。
- **Google 頭像**：`google|` + 完整圖片網址，例如 `google|https://lh3.googleusercontent.com/...`  
  綁定者在球員頁選「Google 頭像」時會寫入目前登入者 OAuth 提供的 `picture` 網址，全站透過 `getAvatarUrl()` 顯示。

## API 行為

- `bindPlayer(playerId, userEmail)`
  - email 先做 `trim().toLowerCase()`
  - 若該 email 已綁定其他球員，回傳 `ALREADY_BOUND_TO_OTHER_PLAYER`
  - 若該球員已被別人綁定，回傳 `PLAYER_ALREADY_BOUND`
- `unbindPlayer(playerId, userEmail)`
  - 僅綁定者可解除，否則回傳 `NOT_OWNER`
- `getPlayerBinding(playerId, userEmail)`
  - 回傳 `{ isOwner, isBound }`，不回傳他人 email
- `getUserBinding(userEmail)`
  - 若已綁定：回傳 `playerId`、`playerName`、`avatar`（供頂部登入列顯示與導向球員頁）
  - 未綁定：`isBound: false`，其餘字串可為空

## 前端使用流程

1. 使用 Google 登入，取得使用者 email。
2. 進入「管理球員」進行綁定/解除綁定。
3. 進入球員頁時呼叫 `getPlayerBinding` 驗證 owner。
4. 只有 `isOwner=true` 才可檢視私密資料與編輯。

## 風險註記

這是「低複雜度、內部使用」方案，不適合公開服務或高安全需求場景。  
若未來要對外開放，建議升級為完整 token 驗證與伺服器端簽章檢查。
