-- SQL Editor for ETH Tokens Table
-- Supabase SQL Editor Code

-- Create simple table for ETH tokens with number columns
CREATE TABLE IF NOT EXISTS eth_tokens (
    id SERIAL PRIMARY KEY,
    stETH NUMERIC(20, 8) DEFAULT 0,
    wETH NUMERIC(20, 8) DEFAULT 0,
    ETH NUMERIC(20, 8) DEFAULT 0,
    weETH NUMERIC(20, 8) DEFAULT 0,
    eETH NUMERIC(20, 8) DEFAULT 0,
    ETHx NUMERIC(20, 8) DEFAULT 0,
    rsETH NUMERIC(20, 8) DEFAULT 0,
    ezETH NUMERIC(20, 8) DEFAULT 0,
    pufETH NUMERIC(20, 8) DEFAULT 0,
    wstETH NUMERIC(20, 8) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data
INSERT INTO eth_tokens (stETH, wETH, ETH, weETH, eETH, ETHx, rsETH, ezETH, pufETH, wstETH)
VALUES 
    (100.5, 50.25, 25.75, 75.0, 30.5, 45.25, 60.0, 35.75, 80.25, 90.5),
    (200.0, 100.0, 50.0, 150.0, 60.0, 90.0, 120.0, 70.0, 160.0, 180.0);

-- Query to view all data
SELECT * FROM eth_tokens ORDER BY created_at DESC; 