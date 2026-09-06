ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "product_type" TEXT,
  ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "supplier_info" TEXT,
  ADD COLUMN IF NOT EXISTS "target_audience" TEXT,
  ADD COLUMN IF NOT EXISTS "key_benefits" TEXT,
  ADD COLUMN IF NOT EXISTS "key_objections" TEXT,
  ADD COLUMN IF NOT EXISTS "competition_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "delivery_time" TEXT,
  ADD COLUMN IF NOT EXISTS "return_policy" TEXT;