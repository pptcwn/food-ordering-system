ALTER TABLE "branches"
  ADD COLUMN "free_delivery_distance_km" DECIMAL(6,2) NOT NULL DEFAULT 3,
  ADD COLUMN "delivery_fee_per_km" DECIMAL(10,2) NOT NULL DEFAULT 8;
