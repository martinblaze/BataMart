-- Add market pricing insight fields without touching existing product rows
ALTER TABLE "public"."Product"
ADD COLUMN IF NOT EXISTS "marketPrice" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER,
ADD COLUMN IF NOT EXISTS "isDeal" BOOLEAN NOT NULL DEFAULT false;
