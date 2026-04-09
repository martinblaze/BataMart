-- Add optional subcategory to products without touching existing rows
ALTER TABLE "public"."Product"
ADD COLUMN IF NOT EXISTS "subcategory" TEXT;

-- Keep product filtering fast for category drill-down
CREATE INDEX IF NOT EXISTS "Product_subcategory_idx"
ON "public"."Product"("subcategory");
