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
    INDEX idx_name (name),
    INDEX idx_email (email)
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
