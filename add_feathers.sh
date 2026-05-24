#!/bin/bash

# Amber Badminton Feather Adjustment Script
# Colors for a premium UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Draw Header
clear
echo -e "${CYAN}┌───────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│     🏸  安柏羽球社 - 快速羽毛調整工具  🏸   │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────┘${NC}"

# Helper function to get config values from env files
get_env_var() {
    local var_name=$1
    local env_file=$2
    local default_val=$3
    if [ -f "$env_file" ]; then
        local val=$(grep "^${var_name}=" "$env_file" | head -n 1 | cut -d'=' -f2)
        val=$(echo "$val" | tr -d '\r')
        if [ -n "$val" ]; then
            echo "$val"
            return
        fi
    fi
    echo "$default_val"
}

# Detect running Docker containers
detect_containers() {
    CONTAINER_PROD=$(docker ps --filter "name=db" --format "{{.Names}}" | grep -E "db-1$|amber-master-db-1$" | head -n 1)
    CONTAINER_DEV=$(docker ps --filter "name=db" --format "{{.Names}}" | grep -E "db-dev-1$|amber-master-db-dev-1$" | head -n 1)
}

detect_containers

# Check if docker is running at all
if [ -z "$CONTAINER_PROD" ] && [ -z "$CONTAINER_DEV" ]; then
    echo -e "${RED}❌ 錯誤: 未偵測到任何運行的資料庫容器 (db 或 db-dev)。${NC}"
    echo -e "${YELLOW}請先使用 ./manage.sh 啟動系統！${NC}"
    exit 1
fi

# Choose Environment
ENV_CHOICE=""
CONTAINER=""
DB_NAME=""
DB_PWD=""

# Parse command line arguments if present
# Usage: ./add_feathers.sh [name_or_id] [amount] [prod/dev] [reason]
CLI_SEARCH="$1"
CLI_AMOUNT="$2"
CLI_ENV="$3"
CLI_REASON="$4"

if [ -n "$CLI_SEARCH" ] && [ -n "$CLI_AMOUNT" ]; then
    # CLI Mode
    if [ -n "$CLI_ENV" ]; then
        if [[ "$CLI_ENV" =~ ^(prod|production)$ ]]; then
            ENV_CHOICE="prod"
        elif [[ "$CLI_ENV" =~ ^(dev|development)$ ]]; then
            ENV_CHOICE="dev"
        else
            echo -e "${RED}❌ 錯誤: 無效的環境參數 '$CLI_ENV'。請使用 'prod' 或 'dev'。${NC}"
            exit 1
        fi
    else
        # Autodetect or default
        if [ -n "$CONTAINER_PROD" ] && [ -n "$CONTAINER_DEV" ]; then
            echo -e "${YELLOW}⚠️  偵測到同時運行正式與開發資料庫，未指定環境時預設為 正式區 (Production)。${NC}"
            ENV_CHOICE="prod"
        elif [ -n "$CONTAINER_PROD" ]; then
            ENV_CHOICE="prod"
        else
            ENV_CHOICE="dev"
        fi
    fi
else
    # Interactive Mode
    if [ -n "$CONTAINER_PROD" ] && [ -n "$CONTAINER_DEV" ]; then
        echo -e "${WHITE}${BOLD}🌐 請選擇要操作的資料庫環境:${NC}"
        echo -e "   1) 🚀 正式區 (Production) -> Container: $CONTAINER_PROD"
        echo -e "   2) 🛠️  開發區 (Development) -> Container: $CONTAINER_DEV"
        read -p "請選擇 [1-2, 預設 1]: " env_num
        if [ "$env_num" = "2" ]; then
            ENV_CHOICE="dev"
        else
            ENV_CHOICE="prod"
        fi
    elif [ -n "$CONTAINER_PROD" ]; then
        echo -e "${GREEN}✅ 自動選定已啟動的 [🚀 正式區] 資料庫${NC}"
        ENV_CHOICE="prod"
    else
        echo -e "${GREEN}✅ 自動選定已啟動的 [🛠️  開發區] 資料庫${NC}"
        ENV_CHOICE="dev"
    fi
fi

# Set database connection config based on environment selection
if [ "$ENV_CHOICE" = "prod" ]; then
    if [ -z "$CONTAINER_PROD" ]; then
        echo -e "${RED}❌ 錯誤: 正式區資料庫未啟動！${NC}"
        exit 1
    fi
    CONTAINER="$CONTAINER_PROD"
    ENV_FILE=".env.production"
    [ ! -f "$ENV_FILE" ] && ENV_FILE=".env"
    DB_NAME=$(get_env_var MYSQL_DB "$ENV_FILE" "amber_db")
    DB_PWD=$(get_env_var MYSQL_ROOT_PASSWORD "$ENV_FILE" "root_password")
    ENV_DISPLAY="🚀 正式區"
else
    if [ -z "$CONTAINER_DEV" ]; then
        echo -e "${RED}❌ 錯誤: 開發區資料庫未啟動！${NC}"
        exit 1
    fi
    CONTAINER="$CONTAINER_DEV"
    ENV_FILE=".env.development"
    [ ! -f "$ENV_FILE" ] && ENV_FILE=".env"
    DB_NAME=$(get_env_var MYSQL_DB_DEV "$ENV_FILE" "amber_db_dev")
    DB_PWD=$(get_env_var MYSQL_ROOT_PASSWORD "$ENV_FILE" "root_password")
    ENV_DISPLAY="🛠️  開發區"
fi

echo -e "-------------------------------------------"
echo -e "目前操作環境: ${GREEN}${ENV_DISPLAY}${NC} | 資料庫: ${GREEN}${DB_NAME}${NC}"
echo -e "-------------------------------------------"

# Function to search players
search_players() {
    local search_term="$1"
    local alt_term=""
    
    # 智慧型容錯：處理「詮」與「銓」的常見錯字/字形差異
    if [[ "$search_term" == *"詮"* ]]; then
        alt_term="${search_term//詮/銓}"
    elif [[ "$search_term" == *"銓"* ]]; then
        alt_term="${search_term//銓/詮}"
    fi

    local query="USE $DB_NAME; SET NAMES utf8mb4; SELECT id, name, feathers FROM players WHERE name LIKE '%$search_term%'"
    if [ -n "$alt_term" ]; then
        query="$query OR name LIKE '%$alt_term%'"
    fi
    query="$query OR id = '$search_term';"

    # Run query inside docker container and get tab-separated output
    docker exec -i "$CONTAINER" mysql -u root -p"$DB_PWD" -sN -e "$query" 2>/dev/null
}

# Find target player
TARGET_ID=""
TARGET_NAME=""
TARGET_FEATHERS=""

if [ -n "$CLI_SEARCH" ]; then
    # CLI Search
    RESULTS=$(search_players "$CLI_SEARCH")
    COUNT=$(echo "$RESULTS" | grep -v "^$" | wc -l || echo 0)
    
    if [ "$COUNT" -eq 0 ]; then
        echo -e "${RED}❌ 錯誤: 找不到符合 '$CLI_SEARCH' 的球員。${NC}"
        exit 1
    elif [ "$COUNT" -eq 1 ]; then
        TARGET_ID=$(echo "$RESULTS" | cut -f1)
        TARGET_NAME=$(echo "$RESULTS" | cut -f2)
        TARGET_FEATHERS=$(echo "$RESULTS" | cut -f3)
    else
        echo -e "${YELLOW}⚠️  找到多個符合的球員，請輸入編號選擇:${NC}"
        # Parse and display list
        IFS=$'\n'
        idx=0
        declare -a ids
        declare -a names
        declare -a feathers
        for line in $RESULTS; do
            [ -z "$line" ] && continue
            idx=$((idx+1))
            ids[$idx]=$(echo "$line" | cut -f1)
            names[$idx]=$(echo "$line" | cut -f2)
            feathers[$idx]=$(echo "$line" | cut -f3)
            echo -e "   $idx) [ID: ${ids[$idx]}] ${names[$idx]} (目前羽毛: ${feathers[$idx]})"
        done
        unset IFS
        
        read -p "請輸入選擇的編號 [1-$idx]: " select_idx
        if ! [[ "$select_idx" =~ ^[0-9]+$ ]] || [ "$select_idx" -lt 1 ] || [ "$select_idx" -gt "$idx" ]; then
            echo -e "${RED}❌ 錯誤: 無效的編號，操作取消。${NC}"
            exit 1
        fi
        TARGET_ID="${ids[$select_idx]}"
        TARGET_NAME="${names[$select_idx]}"
        TARGET_FEATHERS="${feathers[$select_idx]}"
    fi
else
    # Interactive Search
    while [ -z "$TARGET_ID" ]; do
        read -p "🔍 請輸入球員姓名關鍵字或 ID: " search_input
        if [ -z "$search_input" ]; then
            echo -e "${YELLOW}⚠️  輸入不能為空，請重新輸入。${NC}"
            continue
        fi
        
        RESULTS=$(search_players "$search_input")
        COUNT=$(echo "$RESULTS" | grep -v "^$" | wc -l || echo 0)
        
        if [ "$COUNT" -eq 0 ]; then
            echo -e "${YELLOW}❌ 找不到符合的球員 (包括 詮/銓 容錯)。請嘗試其他關鍵字。${NC}"
        elif [ "$COUNT" -eq 1 ]; then
            TARGET_ID=$(echo "$RESULTS" | cut -f1)
            TARGET_NAME=$(echo "$RESULTS" | cut -f2)
            TARGET_FEATHERS=$(echo "$RESULTS" | cut -f3)
            echo -e "🎯 已選定球員: ${GREEN}${TARGET_NAME}${NC} [ID: $TARGET_ID] (目前羽毛: ${TARGET_FEATHERS})"
        else
            echo -e "${BLUE}💡 找到多個符合的球員，請選擇:${NC}"
            IFS=$'\n'
            idx=0
            declare -a ids
            declare -a names
            declare -a feathers
            for line in $RESULTS; do
                [ -z "$line" ] && continue
                idx=$((idx+1))
                ids[$idx]=$(echo "$line" | cut -f1)
                names[$idx]=$(echo "$line" | cut -f2)
                feathers[$idx]=$(echo "$line" | cut -f3)
                echo -e "   $idx) [ID: ${ids[$idx]}] ${names[$idx]} (目前羽毛: ${feathers[$idx]})"
            done
            unset IFS
            
            read -p "請輸入選擇的編號 [1-$idx]: " select_idx
            if ! [[ "$select_idx" =~ ^[0-9]+$ ]] || [ "$select_idx" -lt 1 ] || [ "$select_idx" -gt "$idx" ]; then
                echo -e "${RED}❌ 無效的編號，請重新搜尋。${NC}"
                continue
            fi
            TARGET_ID="${ids[$select_idx]}"
            TARGET_NAME="${names[$select_idx]}"
            TARGET_FEATHERS="${feathers[$select_idx]}"
        fi
    done
fi

# Get Feather Amount to Adjust
ADJUST_AMOUNT=""
if [ -n "$CLI_AMOUNT" ]; then
    # Remove leading plus sign if present
    amount_clean="${CLI_AMOUNT#+}"
    if [[ "$amount_clean" =~ ^-?[0-9]+$ ]]; then
        ADJUST_AMOUNT="$amount_clean"
    else
        echo -e "${RED}❌ 錯誤: 羽毛數量必須是整數 (正數或負數)，例如 1000 或 -500。${NC}"
        exit 1
    fi
else
    while [ -z "$ADJUST_AMOUNT" ]; do
        read -p "💰 請輸入調整羽毛數量 (例如 +1000, -500 或 1000): " amount_input
        # Remove leading plus sign if present
        amount_clean="${amount_input#+}"
        if [[ "$amount_clean" =~ ^-?[0-9]+$ ]]; then
            ADJUST_AMOUNT="$amount_clean"
        else
            echo -e "${RED}❌ 錯誤: 請輸入有效的整數！${NC}"
        fi
    done
fi

# Get Adjustment Reason / Description
REASON=""
if [ -n "$CLI_REASON" ]; then
    REASON="$CLI_REASON"
elif [ -n "$CLI_SEARCH" ] && [ -n "$CLI_AMOUNT" ]; then
    REASON="系統管理員調整"
else
    read -p "📝 請輸入調整原因 [預設: 系統管理員調整]: " reason_input
    if [ -z "$reason_input" ]; then
        REASON="系統管理員調整"
    else
        REASON="$reason_input"
    fi
fi

# Calculate prospective new balance
PROSPECTIVE=$((TARGET_FEATHERS + ADJUST_AMOUNT))
limit_zero="Y" # Default to limit zero to prevent negative balances
if [ "$PROSPECTIVE" -lt 0 ]; then
    echo -e "${YELLOW}⚠️  警告: 調整後羽毛餘額將小於 0 ($PROSPECTIVE)。${NC}"
    if [ -n "$CLI_SEARCH" ]; then
        echo -e "${YELLOW}進行安全限制：餘額將自動被設為 0。${NC}"
    else
        read -p "是否將餘額限制在最小為 0？[Y/n]: " limit_zero_input
        if [[ "$limit_zero_input" =~ ^[nN]$ ]]; then
            limit_zero="N"
            echo -e "👉 已選擇允許負數餘額。"
        else
            echo -e "👉 已選擇將餘額限制在最小為 0。"
        fi
    fi
fi

# Confirm execution if interactive
if [ -z "$CLI_SEARCH" ]; then
    echo -e "${WHITE}${BOLD}-------------------------------------------${NC}"
    echo -e "預計執行操作:"
    echo -e "  👤 球員: ${CYAN}${TARGET_NAME}${NC} (ID: $TARGET_ID)"
    
    if [ "$ADJUST_AMOUNT" -ge 0 ]; then
        DISPLAY_ADJUST="+${ADJUST_AMOUNT}"
    else
        DISPLAY_ADJUST="${ADJUST_AMOUNT}"
    fi

    # Display prospective after limit_zero checks
    if [ "$PROSPECTIVE" -lt 0 ] && [ "$limit_zero" = "Y" ]; then
        FINAL_PROSPECTIVE=0
    else
        FINAL_PROSPECTIVE=$PROSPECTIVE
    fi

    echo -e "  📈 變動: ${YELLOW}${DISPLAY_ADJUST}${NC} 羽毛 (${TARGET_FEATHERS} ➡️  $FINAL_PROSPECTIVE)"
    echo -e "  📝 原因: ${PURPLE}${REASON}${NC}"
    echo -e "  🌐 環境: ${GREEN}${ENV_DISPLAY}${NC}"
    echo -e "${WHITE}${BOLD}-------------------------------------------${NC}"
    read -p "⚠️  確定要執行此變動嗎？[y/N]: " confirm_exec
    if [[ ! "$confirm_exec" =~ ^[yY]$ ]]; then
        echo -e "${RED}❌ 操作已被取消。${NC}"
        exit 0
    fi
fi

# Build SQL Execution String
SQL_UPDATE="UPDATE players SET feathers = feathers + ($ADJUST_AMOUNT) WHERE id = '$TARGET_ID';"
if [ "$PROSPECTIVE" -lt 0 ] && [ "$limit_zero" = "Y" ]; then
    SQL_UPDATE="UPDATE players SET feathers = GREATEST(0, feathers + ($ADJUST_AMOUNT)) WHERE id = '$TARGET_ID';"
fi

SQL_TX="INSERT INTO feather_transactions (player_id, amount, type, description, created_at) VALUES ('$TARGET_ID', $ADJUST_AMOUNT, 'admin_adjust', '$REASON', NOW());"

# Run update transaction
docker exec -i "$CONTAINER" mysql -u root -p"$DB_PWD" -e "USE $DB_NAME; SET NAMES utf8mb4; $SQL_UPDATE $SQL_TX" 2>/dev/null

# Get new balance for confirmation
NEW_BALANCE=$(docker exec -i "$CONTAINER" mysql -u root -p"$DB_PWD" -sN -e "USE $DB_NAME; SELECT feathers FROM players WHERE id = '$TARGET_ID';" 2>/dev/null)

if [ "$ADJUST_AMOUNT" -ge 0 ]; then
    DISPLAY_ADJUST="+${ADJUST_AMOUNT}"
else
    DISPLAY_ADJUST="${ADJUST_AMOUNT}"
fi

echo -e "\n${GREEN}🎉 更新成功！${NC}"
echo -e "==========================================="
echo -e "👤 球員: ${WHITE}${BOLD}${TARGET_NAME}${NC}"
echo -e "💰 之前羽毛: ${YELLOW}${TARGET_FEATHERS}${NC}"
echo -e "💰 調整羽毛: ${GREEN}${DISPLAY_ADJUST}${NC}"
echo -e "💰 目前羽毛: ${GREEN}${NEW_BALANCE}${NC}"
echo -e "📝 說明備註: ${WHITE}${REASON}${NC}"
echo -e "==========================================="
