#!/bin/bash

# Amber Badminton Management Script
echo "🏸 安柏羽球社 系統管理腳本 (資源優化版)"
echo "--------------------------------"

# 1) 選擇運行環境
echo "🌐 請選擇運行環境:"
echo "   1) 🛠️  開發模式 (Development Only)"
echo "   2) 🚀  正式模式 (Production Only)"
echo "   3) 🌈  混合模式 (Both Dev & Prod - 同時啟動)"
read -p "請輸入 [1-3]: " env_choice

if [ "$env_choice" == "1" ]; then
    ENV_FILE=".env.development"
    MODE="開發"
    SERVICES="api-dev db-dev frontend-dev"
    STOP_SERVICES="api db frontend"
elif [ "$env_choice" == "2" ]; then
    ENV_FILE=".env.production"
    MODE="正式"
    SERVICES="api db frontend"
    STOP_SERVICES="api-dev db-dev frontend-dev"
elif [ "$env_choice" == "3" ]; then
    ENV_FILE=".env"
    MODE="混合 (Dev + Prod)"
    SERVICES="api db frontend api-dev db-dev frontend-dev"
    STOP_SERVICES=""
    cat .env.production .env.development | sort -u > .env
    echo "✅ 已生成混合環境設定 (.env)"
else
    echo "❌ 無效選擇，退出。"
    exit 1
fi

# 2) 切換 .env 軟連結
if [ "$env_choice" != "3" ]; then
    if [ -f "$ENV_FILE" ]; then
        ln -sf "$ENV_FILE" .env
        echo "✅ 已切換至 $MODE 環境 ($ENV_FILE -> .env)"
    else
        echo "⚠️  錯誤: 找不到 $ENV_FILE 檔案！"
        exit 1
    fi
fi

echo "--------------------------------"
echo "1) 🚀 啟動/重佈 $MODE 系統 (Build & Up)"
echo "2) ⚙️  僅重啟 $MODE 後端 (API + DB)"
echo "3) 💻 僅重啟 $MODE 前端"
echo "4) 🛑 停止所有系統 (Down)"
echo "5) 📊 查看日誌 (Logs)"
echo "6) 🧹 清理 Docker 環境 (Prune)"
echo "7) ❌ 結束"
echo "--------------------------------"
read -p "請選擇操作 [1-7]: " choice

# 執行停止邏輯 (如果是 1, 2, 3 且不是混合模式)
if [[ "$choice" =~ ^[1-3]$ ]] && [ -n "$STOP_SERVICES" ]; then
    echo "🧹 正在停止另一環境的服務以節省資源..."
    sudo docker compose stop $STOP_SERVICES
fi

case $choice in
    1)
        echo "🚀 正在啟動/重佈 $MODE 全部服務..."
        sudo docker compose up -d --build --remove-orphans $SERVICES
        ;;
    2)
        echo "⚙️  正在重啟 $MODE 後端..."
        if [ "$env_choice" == "1" ]; then
            sudo docker compose up -d --build api-dev db-dev
        elif [ "$env_choice" == "2" ]; then
            sudo docker compose up -d --build api db
        else
            sudo docker compose up -d --build api db api-dev db-dev
        fi
        ;;
    3)
        echo "💻 正在重啟 $MODE 前端..."
        if [ "$env_choice" == "1" ]; then
            sudo docker compose up -d --build frontend-dev
        elif [ "$env_choice" == "2" ]; then
            sudo docker compose up -d --build frontend
        else
            sudo docker compose up -d --build frontend frontend-dev
        fi
        ;;
    4)
        echo "🛑 正在停止系統..."
        sudo docker compose down
        ;;
    5)
        sudo docker compose logs -f
        ;;
    6)
        echo "🧹 正在清理未使用的容器與映像檔..."
        sudo docker system prune -f
        ;;
    7)
        echo "👋 再見！"
        exit 0
        ;;
    *)
        echo "❌ 無效的選擇"
        exit 1
        ;;
esac

echo "--------------------------------"
echo "✅ 操作完成！"
if [[ "$choice" =~ ^[1-3]$ ]]; then
    if [ "$env_choice" == "1" ]; then
        echo "🛠️  開發版: http://localhost:8081"
    elif [ "$env_choice" == "2" ]; then
        echo "🚀 正式版: http://localhost:8080"
    else
        echo "🚀 正式版: http://localhost:8080"
        echo "🛠️  開發版: http://localhost:8081"
    fi
fi
