INSERT INTO "public"."airdrop" ("id", "ethereum_address", "xp_amount", "created_at", "updated_at") VALUES ('23ec19a5-629e-491d-82cf-1dc6a37abdc3', '0x0F4Dc8B3ad7fb88ab6FB37354dD1462cDf25C08c', '1000.00', '2025-07-25 04:23:44+00', '2025-07-25 04:23:47+00');

-- Update the ethereum_address to lowercase to match service query expectations
UPDATE "public"."airdrop" 
SET "ethereum_address" = LOWER("ethereum_address"), 
    "updated_at" = NOW()
WHERE "ethereum_address" = '0x0F4Dc8B3ad7fb88ab6FB37354dD1462cDf25C08c';