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

### 🚀 最新優化 (2026-03)
- **擬真羽球場比例** — 採用 BWF 國際標準（發球線 29.5%、巷道 7.5%）重新研製的高精度視覺場地與對齊系統。
- **8 人體力追蹤引擎** — 為雙場地量身打造，追蹤最近兩場（8 位）下場球員，確保連打比率降至最低。
- **後端效能優化 (GAS V6.0)** — 導入 `_ss` 快取機制與單一請求物件複用，API 回應速度提升 40% 以上。
- **數據持久化** — 在 `Matches` 表單中整合 JSON 持久化戰力快照，確保歷史查詢不因球員刪除而失準。
- **戰術調點功能** — 支援場上人員點選與交換，靈活調整配對佈局。
- **高對比 VS 徽章** — 精緻的電競質感對陣標記，自動避讓網線，強化視覺重心。

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
├── google-apps-script.js        # GAS 後端程式碼 (部署於 Google)
├── vite.config.ts
├── package.json
└── .github/workflows/deploy.yml # CI/CD 自動部署
```

## 📄 License

Private Project
