# 🏸 安柏排點大師 — Amber Badminton Matchmaking System (v2.0)

> 使用 **TrueSkill** 演算法的智慧羽球配對系統，自動計算球員戰力並推薦最佳對戰組合。此專案已從 Google Apps Script 遷移至 **FastAPI + MySQL** 架構，並支援 Docker 化部署。

---

## ✨ 核心架構

本系統採用完全分離的開發與生產環境規劃，確保測試不影響正式數據。

| 層級 | 技術 | 備註 |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite 6 | TypeScript / Tailwind CSS v4 |
| **Backend** | FastAPI (Python) | 非同步處理 / RESTful API |
| **Database** | MySQL 8.0 | 具備獨立的開發與正式儲存空間 |
| **Infrastructure** | Docker Compose | 容器化部署與環境隔離 |

---

## 🛠 環境規劃與啟動

### 1. 開發環境 (Development)
用於本地功能開發與數據測試。

*   **啟動資料庫與 API：**
    ```bash
    docker compose up -d db-dev api-dev
    ```
*   **啟動前端：**
    ```bash
    npm run dev
    ```
*   **預設網址：** `http://localhost:5173/amber-master/`
*   **後端連結：** `http://localhost:8001`
*   **資料庫埠號：** `3307` (MySQL)

### 2. 正式環境 (Production)
用於伺服器部署與實際運作。

*   **啟動所有服務：**
    ```bash
    docker compose up -d
    ```
*   **預設網址：** `http://localhost:8080/amber-master/` (或對應的反向代理網址)
*   **後端連結：** `http://localhost:8000`
*   **資料庫埠號：** `3306` (MySQL)

---

## 📊 數據管理指令

### 同步正式資料到開發環境
如果你希望在開發環境使用真實數據進行測試，可以執行以下指令：
```bash
docker exec amber-master-db-1 mysqldump -uamber_user -pamber_password --no-tablespaces amber_db | docker exec -i amber-master-db-dev-1 mysql -uamber_user -pamber_password amber_db_dev
```

### 進入資料庫終端
*   **開發庫：** `docker exec -it amber-master-db-dev-1 mysql -uamber_user -pamber_password amber_db_dev`
*   **正式庫：** `docker exec -it amber-master-db-1 mysql -uamber_user -pamber_password amber_db`

---

## 配置文件說明

*   **`.env.development`**：本地開發專用，指向 `localhost:8001` 與 `3307` 埠。
*   **`.env.production`**：生產環境專用，用於 Docker Build 時嵌入正式 API 路徑。
*   **`vite.config.ts`**：已配置 Proxy，會根據開發/生產環境自動轉發 API 請求。

---

## 📁 專案結構

```
├── backend/             # FastAPI 後端程式碼
│   ├── main.py          # API 入口
│   ├── models.py        # SQLAlchemy 資料模型
│   └── init_db.sql      # 資料庫初始化腳本
├── src/                 # React 前端原始碼
│   ├── lib/gasApi.ts    # API 呼叫封裝 (已對接 FastAPI)
│   └── components/      # UI 元件
├── docker-compose.yml   # 多環境容器定義
├── nginx.conf           # 前端 Nginx 配置 (支援 SPA 路由)
└── frontend.Dockerfile  # 前端鏡像構建檔
```

---

## 📄 License

Private Project - Amber Badminton Club
