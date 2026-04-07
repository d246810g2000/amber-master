# 🏸 安柏羽球排點器 — Amber Badminton Matchmaking System

> 使用 **TrueSkill** 演算法的智慧羽球配對系統，自動計算球員戰力並推薦最佳對戰組合。

🔗 **Live Demo**: [https://d246810g2000.github.io/amber-master](https://d246810g2000.github.io/amber-master)

## ✨ 功能特色

- **智慧排點** — TrueSkill 演算法即時評估球員戰力，自動推薦公平的 2v2 配對
- **即時戰力更新** — 每場比賽結束後自動更新 Mu / Sigma 值
- **球員個人檔案** — 查看歷史戰績、勝率趨勢圖表與綁定狀態
- **對戰紀錄** — 支援日期篩選，完整保留對戰歷史與戰力變化軌跡
- **帳號綁定系統** — 支援 Google 帳號與球員個人檔案綁定，追蹤個人專屬數據
- **球員管理** — 支援批次匯入、批次刪除與個人化頭像設定
- **數據校準** — 支援「全歷史數據重新推算」，一鍵校正全體球員之綜合戰力
- **雲端同步** — 透過優化後的 Google Apps Script V6.0 將資料存儲於 Google Sheets，效能大幅提升

### 🚀 最新優化 (2026-04)
- **擬真羽球場比例** — 採用 BWF 國際標準（發球線 29.5%、巷道 7.5%）重新研製的高精度視覺場地與對位系統。
- **等候感優化與社交多樣性引擎** — 針對雙場地 (16 人) 量身打造。透過動態等候權值 (Wait-Aware)，有效打破「平行時空」現象，確保單日社交覆蓋率達 90% 以上。
- **高強度擬真模擬環境** — 在 `sim/` 目錄中建立具備 100 次迭代的蒙地卡羅模擬器，驗證在 24 場高強度賽程下的公平性與連休體感。
- **後端效能優化 (GAS V6.0)** — 導入 `_ss` 快取機制與單一請求物件複用，API 回應速度提升 40% 以上。
- **數據持久化** — 在 `Matches` 表單中整合 JSON 持久化戰力快照，確保歷史查詢不因球員刪除而失準。

## 🛠 技術架構

| 層級 | 技術 |
|------|------|
| **Frontend** | React 19 + TypeScript + Tailwind CSS v4 |
| **Build** | Vite 6 |
| **演算法** | ts-trueskill (TrueSkill Rating) |
| **圖表** | Recharts |
| **資料層** | Google Apps Script + Google Sheets |
| **部署** | GitHub Pages (GitHub Actions CI/CD) |

```
Browser ──fetch──▶ Google Apps Script ──▶ Google Sheets
   │
   └── ts-trueskill (client-side rating calculation)
```

## 🚀 本地開發

**前置需求**: Node.js 20+

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 打包
npm run build

# 本地預覽打包結果
npm run preview
```

## 📦 部署

Push 到 `main` 分支後，GitHub Actions 會自動執行：

1. `npm ci` → `npm run build`
2. 將 `dist/` 部署至 GitHub Pages

手動部署：
```bash
npm run deploy
```

### Google Apps Script（後端程式碼同步）

使用 [clasp](https://github.com/google/clasp) 將 `google-apps-script/` 推送至測試／正式專案（需先 `npx clasp login`）。詳見 [google-apps-script/CLASP.md](google-apps-script/CLASP.md)。

```bash
npm run gas:push:test   # 測試站 scriptId
npm run gas:push:prod   # 正式站 scriptId
```

LINE 推播：在「指令碼屬性」設定 `LINE_CHANNEL_ACCESS_TOKEN`；推播目標可設 `LINE_PUSH_TO`，或由 Webhook 寫入的 `LINE_LAST_PUSH_TO_CANDIDATE`（見 `google-apps-script/02_Api.gs`）。

## 📁 專案結構

```
├── src/
│   ├── App.tsx                  # 主應用元件
│   ├── main.tsx                 # 進入點
│   ├── types.ts                 # TypeScript 型別定義
│   ├── components/
│   │   ├── CourtCard.tsx        # 球場卡片
│   │   ├── PlayerPill.tsx       # 球員標籤
│   │   ├── WinnerModal.tsx      # 勝負結算彈窗
│   │   ├── MatchHistory.tsx     # 對戰紀錄列表
│   │   ├── PlayerProfile.tsx    # 球員個人檔案
│   │   └── ManagePlayers.tsx    # 球員管理
│   └── lib/
│       ├── gasApi.ts            # Google Apps Script API 呼叫
│       ├── matchEngine.ts       # TrueSkill 計算 + 配對邏輯
│       └── utils.ts             # 工具函式
├── public/
│   └── 404.html                 # SPA routing fallback
├── google-apps-script/          # GAS 後端（clasp 同步，見 CLASP.md）
│   ├── appsscript.json
│   ├── clasp.test.json / clasp.prod.json
│   ├── 00_Config.gs … 06_Line.gs
│   └── CLASP.md
├── scripts/
│   └── gas-clasp.mjs            # npm run gas:push:test / gas:push:prod
├── vite.config.ts
├── package.json
└── .github/workflows/deploy.yml # CI/CD 自動部署
```

## 📄 License

Private Project
