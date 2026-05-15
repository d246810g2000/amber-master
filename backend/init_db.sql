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
    item_type VARCHAR(50) NOT NULL,
    duration_days INT DEFAULT 7,
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
INSERT INTO shop_items (name, description, price, item_type, duration_days) VALUES 
('球館殺手', '霸氣側漏的稱號', 500, 'title', 7),
('發球機器', '穩定如機器的發球', 500, 'title', 7),
('羽球萌新', '請大家多多指教', 200, 'title', 7),
('初學者青銅', '簡約的青銅邊框', 800, 'frame', 7),
('熱血火紅', '燃燒鬥志的紅色邊框', 800, 'frame', 7);
