-- ETH Yield Page Database Queries
-- This file contains SQL queries for fetching Total Value Locked and asset amounts

-- =====================================================
-- 1. TOTAL VALUE LOCKED QUERY
-- =====================================================

-- Query to get Total Value Locked in ETH and USD
SELECT 
    COALESCE(SUM(staked_amount), 0) as total_eth_locked,
    COALESCE(SUM(staked_amount * 3000), 0) as total_usd_locked
FROM eth_stakes 
WHERE is_active = true 
AND stake_status = 'active';

-- Alternative query with more detailed breakdown
SELECT 
    ROUND(COALESCE(SUM(staked_amount), 0), 3) as total_eth_locked,
    ROUND(COALESCE(SUM(staked_amount * 3000), 0), 0) as total_usd_locked,
    COUNT(DISTINCT user_address) as unique_stakers,
    COUNT(*) as total_stakes
FROM eth_stakes 
WHERE is_active = true 
AND stake_status = 'active';

-- =====================================================
-- 2. ASSETS RESTAKED QUERIES
-- =====================================================

-- Query to get all asset amounts with proper formatting
SELECT 
    asset_symbol,
    asset_name,
    ROUND(SUM(amount), 2) as total_amount,
    CASE 
        WHEN SUM(amount) >= 1000000 THEN CONCAT(ROUND(SUM(amount)/1000000, 2), 'M')
        WHEN SUM(amount) >= 1000 THEN CONCAT(ROUND(SUM(amount)/1000, 2), 'K')
        ELSE CONCAT(ROUND(SUM(amount), 2), '')
    END as formatted_amount,
    COUNT(DISTINCT user_address) as unique_holders,
    COUNT(*) as total_transactions
FROM eth_assets 
WHERE asset_symbol IN ('stETH', 'wETH', 'weETH', 'eETH', 'ETHx', 'rsETH', 'ezETH', 'pufETH', 'wstETH')
AND is_active = true
GROUP BY asset_symbol, asset_name
ORDER BY total_amount DESC;

-- =====================================================
-- 3. DETAILED ASSET BREAKDOWN
-- =====================================================

-- Individual asset queries for specific amounts
-- stETH
SELECT 
    'stETH' as asset_symbol,
    ROUND(SUM(amount), 2) as total_amount,
    CONCAT(ROUND(SUM(amount)/1000, 2), 'K') as formatted_amount
FROM eth_assets 
WHERE asset_symbol = 'stETH' AND is_active = true;

-- wETH
SELECT 
    'wETH' as asset_symbol,
    ROUND(SUM(amount), 2) as total_amount,
    CONCAT(ROUND(SUM(amount)/1000, 2), 'K') as formatted_amount
FROM eth_assets 
WHERE asset_symbol = 'wETH' AND is_active = true;

-- weETH
SELECT 
    'weETH' as asset_symbol,
    ROUND(SUM(amount), 2) as total_amount,
    CONCAT(ROUND(SUM(amount)/1000, 2), 'K') as formatted_amount
FROM eth_assets 
WHERE asset_symbol = 'weETH' AND is_active = true;

-- eETH
SELECT 
    'eETH' as asset_symbol,
    ROUND(SUM(amount), 2) as total_amount,
    CONCAT(ROUND(SUM(amount)/1000, 2), 'K') as formatted_amount
FROM eth_assets 
WHERE asset_symbol = 'eETH' AND is_active = true;

-- ETHx
SELECT 
    'ETHx' as asset_symbol,
    ROUND(SUM(amount), 2) as total_amount,
    CONCAT(ROUND(SUM(amount)/1000, 2), 'K') as formatted_amount
FROM eth_assets 
WHERE asset_symbol = 'ETHx' AND is_active = true;

-- rsETH
SELECT 
    'rsETH' as asset_symbol,
    ROUND(SUM(amount), 2) as total_amount,
    CONCAT(ROUND(SUM(amount)/1000, 2), 'K') as formatted_amount
FROM eth_assets 
WHERE asset_symbol = 'rsETH' AND is_active = true;

-- ezETH
SELECT 
    'ezETH' as asset_symbol,
    ROUND(SUM(amount), 2) as total_amount,
    CONCAT(ROUND(SUM(amount)/1000, 2), 'K') as formatted_amount
FROM eth_assets 
WHERE asset_symbol = 'ezETH' AND is_active = true;

-- pufETH
SELECT 
    'pufETH' as asset_symbol,
    ROUND(SUM(amount), 2) as total_amount,
    CONCAT(ROUND(SUM(amount)/1000, 2), 'K') as formatted_amount
FROM eth_assets 
WHERE asset_symbol = 'pufETH' AND is_active = true;

-- wstETH
SELECT 
    'wstETH' as asset_symbol,
    ROUND(SUM(amount), 2) as total_amount,
    CONCAT(ROUND(SUM(amount)/1000, 2), 'K') as formatted_amount
FROM eth_assets 
WHERE asset_symbol = 'wstETH' AND is_active = true;

-- =====================================================
-- 4. REAL-TIME DATA QUERY
-- =====================================================

-- Query to get real-time Total Value Locked
SELECT 
    ROUND(COALESCE(SUM(staked_amount), 0), 3) as total_eth_locked,
    ROUND(COALESCE(SUM(staked_amount * 3000), 0), 0) as total_usd_locked,
    CONCAT(ROUND(COALESCE(SUM(staked_amount), 0), 3), ' ETH|$', ROUND(COALESCE(SUM(staked_amount * 3000), 0), 0)) as display_text
FROM eth_stakes 
WHERE is_active = true 
AND stake_status = 'active'
AND created_at >= NOW() - INTERVAL '24 hours';

-- =====================================================
-- 5. USER-SPECIFIC DATA
-- =====================================================

-- Query to get user's specific staked amounts
SELECT 
    user_address,
    asset_symbol,
    ROUND(SUM(amount), 3) as user_staked_amount,
    ROUND(SUM(amount * 3000), 0) as user_staked_usd
FROM eth_stakes 
WHERE user_address = :user_address
AND is_active = true
GROUP BY user_address, asset_symbol
ORDER BY user_staked_amount DESC;

-- =====================================================
-- 6. PERFORMANCE METRICS
-- =====================================================

-- Query to get performance metrics
SELECT 
    COUNT(DISTINCT user_address) as total_users,
    COUNT(*) as total_stakes,
    ROUND(AVG(staked_amount), 3) as avg_stake_amount,
    ROUND(MAX(staked_amount), 3) as max_stake_amount,
    ROUND(MIN(staked_amount), 3) as min_stake_amount,
    ROUND(SUM(staked_amount), 3) as total_tvl
FROM eth_stakes 
WHERE is_active = true 
AND stake_status = 'active';

-- =====================================================
-- 7. ASSET DISTRIBUTION
-- =====================================================

-- Query to get asset distribution percentages
SELECT 
    asset_symbol,
    ROUND(SUM(amount), 2) as total_amount,
    ROUND((SUM(amount) / SUM(SUM(amount)) OVER()) * 100, 2) as percentage_of_total,
    COUNT(DISTINCT user_address) as unique_holders
FROM eth_assets 
WHERE asset_symbol IN ('stETH', 'wETH', 'weETH', 'eETH', 'ETHx', 'rsETH', 'ezETH', 'pufETH', 'wstETH')
AND is_active = true
GROUP BY asset_symbol
ORDER BY total_amount DESC;

-- =====================================================
-- 8. HISTORICAL DATA
-- =====================================================

-- Query to get historical TVL data
SELECT 
    DATE(created_at) as date,
    ROUND(SUM(staked_amount), 3) as daily_tvl,
    ROUND(SUM(staked_amount * 3000), 0) as daily_tvl_usd,
    COUNT(DISTINCT user_address) as daily_active_users
FROM eth_stakes 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =====================================================
-- 9. API ENDPOINT QUERIES
-- =====================================================

-- Query for API endpoint: GET /api/eth-yield/tvl
SELECT 
    JSON_BUILD_OBJECT(
        'total_eth_locked', ROUND(COALESCE(SUM(staked_amount), 0), 3),
        'total_usd_locked', ROUND(COALESCE(SUM(staked_amount * 3000), 0), 0),
        'display_text', CONCAT(ROUND(COALESCE(SUM(staked_amount), 0), 3), ' ETH|$', ROUND(COALESCE(SUM(staked_amount * 3000), 0), 0)),
        'last_updated', NOW()
    ) as tvl_data
FROM eth_stakes 
WHERE is_active = true 
AND stake_status = 'active';

-- Query for API endpoint: GET /api/eth-yield/assets
SELECT 
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'symbol', asset_symbol,
            'name', asset_name,
            'total_amount', ROUND(SUM(amount), 2),
            'formatted_amount', CASE 
                WHEN SUM(amount) >= 1000000 THEN CONCAT(ROUND(SUM(amount)/1000000, 2), 'M')
                WHEN SUM(amount) >= 1000 THEN CONCAT(ROUND(SUM(amount)/1000, 2), 'K')
                ELSE CONCAT(ROUND(SUM(amount), 2), '')
            END,
            'unique_holders', COUNT(DISTINCT user_address),
            'total_transactions', COUNT(*)
        )
    ) as assets_data
FROM eth_assets 
WHERE asset_symbol IN ('stETH', 'wETH', 'weETH', 'eETH', 'ETHx', 'rsETH', 'ezETH', 'pufETH', 'wstETH')
AND is_active = true
GROUP BY asset_symbol, asset_name
ORDER BY SUM(amount) DESC;

-- =====================================================
-- 10. DATABASE SCHEMA (for reference)
-- =====================================================

/*
-- Table: eth_stakes
CREATE TABLE eth_stakes (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    staked_amount DECIMAL(18,8) NOT NULL,
    asset_symbol VARCHAR(10) NOT NULL,
    stake_status VARCHAR(20) DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: eth_assets
CREATE TABLE eth_assets (
    id SERIAL PRIMARY KEY,
    asset_symbol VARCHAR(10) UNIQUE NOT NULL,
    asset_name VARCHAR(50) NOT NULL,
    amount DECIMAL(18,8) NOT NULL,
    user_address VARCHAR(42) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_eth_stakes_user_address ON eth_stakes(user_address);
CREATE INDEX idx_eth_stakes_asset_symbol ON eth_stakes(asset_symbol);
CREATE INDEX idx_eth_stakes_status ON eth_stakes(stake_status, is_active);
CREATE INDEX idx_eth_assets_symbol ON eth_assets(asset_symbol);
CREATE INDEX idx_eth_assets_active ON eth_assets(is_active);
*/ 