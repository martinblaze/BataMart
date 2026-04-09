-- Track when market pricing was last refreshed for each product
ALTER TABLE "public"."Product"
ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP(3);
