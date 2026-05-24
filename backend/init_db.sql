-- Database Schema for Amber Badminton

-- Players Table
CREATE TABLE IF NOT EXISTS players (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    avatar TEXT,
    mu DOUBLE DEFAULT 25.0,
    sigma DOUBLE DEFAULT 8.333,
    email VARCHAR(255) UNIQUE,
    type VARCHAR(20) DEFAULT 'guest',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    feathers INT DEFAULT 0,
    last_feather_claim DATE,
    active_title_id INT,
    active_frame_id INT,
    active_background_id INT,
    active_pet_id VARCHAR(50) DEFAULT NULL,
    active_egg_id VARCHAR(50) DEFAULT NULL,
    egg_progress_games INT DEFAULT 0,
    egg_progress_wins INT DEFAULT 0,
    unlocked_pets TEXT DEFAULT NULL,
    INDEX idx_name (name),
    INDEX idx_email (email)
);

-- Bets Table
CREATE TABLE IF NOT EXISTS bets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL,
    match_id VARCHAR(50),
    team INT,
    amount INT NOT NULL,
    bet_type VARCHAR(20) DEFAULT 'moneyline',
    line_value FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_settled INT DEFAULT 0,
    INDEX idx_match (match_id)
);

-- Feather Transactions Table
CREATE TABLE IF NOT EXISTS feather_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL,
    amount INT NOT NULL,
    type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_player (player_id)
);

-- Matches Table
CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(50) PRIMARY KEY,
    match_date DATE NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    t1p1_id VARCHAR(50),
    t1p2_id VARCHAR(50),
    t2p1_id VARCHAR(50),
    t2p2_id VARCHAR(50),
    winner INT,
    score VARCHAR(50),
    duration VARCHAR(50),
    court_name VARCHAR(50),
    match_no INT,
    updated_players_json JSON,
    INDEX idx_date (match_date)
);

-- Player Stats Snapshots Table
CREATE TABLE IF NOT EXISTS player_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    player_id VARCHAR(50) NOT NULL,
    mu DOUBLE,
    sigma DOUBLE,
    match_count INT DEFAULT 0,
    win_count INT DEFAULT 0,
    win_rate DOUBLE DEFAULT 0.0,
    UNIQUE KEY (date, player_id),
    INDEX idx_date_player (date, player_id)
);

-- Court State Table（單數命名，對齊 ORM；以 date 為 PK，每天一筆）
CREATE TABLE IF NOT EXISTS court_state (
    date DATE PRIMARY KEY,
    version INT DEFAULT 1,
    state JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- Shop Items Table
CREATE TABLE IF NOT EXISTS shop_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    price_permanent INT NOT NULL DEFAULT 0,
    item_type VARCHAR(50) NOT NULL,
    duration_days INT DEFAULT 7,
    tier VARCHAR(20) DEFAULT 'classic',
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player Inventory Table
CREATE TABLE IF NOT EXISTS player_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL,
    item_id INT NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    INDEX idx_player_inv (player_id),
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (item_id) REFERENCES shop_items(id)
);

-- Seed Shop Items
INSERT INTO shop_items (name, description, price, price_permanent, item_type, duration_days, tier) VALUES 
('球場邊緣人', '永遠在場邊等主揪叫名字', 150, 600, 'title', 7, 'classic'),
('撿球大師', '打球五分鐘，撿球兩小時', 150, 600, 'title', 7, 'classic'),
('職業請假選手', '請假手速比報名還快', 150, 600, 'title', 7, 'classic'),
('發球姿勢 100 分', '姿勢很帥，但球通常沒過網', 250, 1000, 'title', 7, 'epic'),
('活在線上的男人', '專打壓線界內球，鷹眼都沒用', 250, 1000, 'title', 7, 'epic'),
('微笑殺手(肉球製造機)', '送對手滿滿的甜球（肉球）', 250, 1000, 'title', 7, 'epic'),
('連裁判都敢殺', '殺球直接往主審臉上砸', 500, 2000, 'title', 7, 'legendary'),
('撲球之鬼', '球場上移動的吸塵器', 500, 2000, 'title', 7, 'legendary'),
('撲球之鬼(不擦地)', '撲完球還要隊友幫忙擦地板', 500, 2000, 'title', 7, 'legendary'),
('跪求贊助零打券', '白嫖最高境界，全場焦點', 800, 3200, 'title', 7, 'ultimate'),
('羽球界戴資穎', '假動作騙到對手腳骨折', 800, 3200, 'title', 7, 'ultimate'),
('這個殺氣不對勁', '一站上場，全場退避三舍', 800, 3200, 'title', 7, 'ultimate'),
('倔強鐵牌木框', '鐵牌（暗灰色 / 粗糙木質紋理）', 250, 1000, 'frame', 7, 'classic'),
('不屈青銅邊框', '銅牌（古銅色 / 紅棕暗光）', 250, 1000, 'frame', 7, 'classic'),
('傲氣白銀邊框', '銀牌（亮銀色 / 潔淨白光）', 250, 1000, 'frame', 7, 'classic'),
('榮耀黃金邊框', '金牌（耀眼金黃 / 閃爍光芒）', 500, 2000, 'frame', 7, 'epic'),
('華麗白金邊框', '白金（青碧色 / 帶點淡綠偏藍的光澤）', 500, 2000, 'frame', 7, 'epic'),
('璀璨翡翠邊框', '翡翠（深邃翠綠 / 寶石螢光）', 500, 2000, 'frame', 7, 'epic'),
('璀璨鑽石邊框', '鑽石（亮藍色 / 鑽石高光反射）', 800, 3200, 'frame', 7, 'legendary'),
('大師紫羅蘭框', '大師（神祕深紫 / 尊貴紫光）', 800, 3200, 'frame', 7, 'legendary'),
('宗師傲紅邊框', '宗師（霸氣深紅 / 火焰微光）', 800, 3200, 'frame', 7, 'legendary'),
('頂尖菁英流光框', '菁英（金黃至霓虹紫動態流光漸變）', 1000, 4000, 'frame', 7, 'ultimate'),
('萬象星空邊框', '終極（LoL 元素使拉克絲概念，星空幻彩）', 1000, 4000, 'frame', 7, 'ultimate'),
('聖白羽翼邊框', '終極（天使聖光 / 飄落羽毛特效）', 1000, 4000, 'frame', 7, 'ultimate'),
('鐵牌：霧霾灰階', '低調暗沉的灰色煙霧特效', 500, 2000, 'background', 7, 'classic'),
('銅牌：大地岩落', '微弱的岩石與泥土粒子緩慢飄落', 500, 2000, 'background', 7, 'classic'),
('白銀：微光銀河', '乾淨、銀白色的細小流星特效', 500, 2000, 'background', 7, 'classic'),
('黃金：金光閃耀', '畫面四周有金色奢華粒子向上徐升', 800, 3200, 'background', 7, 'epic'),
('白金：海克斯科技', '青藍色的科技魔法護盾微光背景', 800, 3200, 'background', 7, 'epic'),
('翡翠：螢火之森', '深綠森林中帶有螢火蟲的幽綠光點', 800, 3200, 'background', 7, 'epic'),
('鑽石：星辰風暴', 'Hover 時觸發亮藍色鑽石折射與冰晶外發光', 1000, 4000, 'background', 7, 'legendary'),
('大師：虛空星河', '神祕的深紫色星空，自帶黑洞邊緣扭曲特效', 1000, 4000, 'background', 7, 'legendary'),
('宗師：雷霆萬鈞', '血紅色閃電偶爾劃過夜空的動態特效', 1000, 4000, 'background', 7, 'legendary'),
('菁英：傲世神巔', '卡片與背景完美融合，全服通告級流光', 1500, 6000, 'background', 7, 'ultimate'),
('終極：起源矩陣', '霓虹紫與數位矩陣程式碼流動（源計畫畫風）', 1500, 6000, 'background', 7, 'ultimate'),
('終極：飄零羽落', '動態羽毛飄落特效背景', 1500, 6000, 'background', 7, 'ultimate');

-- Player Loans Table
CREATE TABLE IF NOT EXISTS player_loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lender_id VARCHAR(50) NOT NULL,
    borrower_id VARCHAR(50) NOT NULL,
    principal INT NOT NULL,
    interest_rate FLOAT NOT NULL DEFAULT 0.0,
    total_due INT NOT NULL,
    repaid_amount INT NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lender_id) REFERENCES players(id),
    FOREIGN KEY (borrower_id) REFERENCES players(id),
    INDEX idx_borrower (borrower_id),
    INDEX idx_lender (lender_id)
);
