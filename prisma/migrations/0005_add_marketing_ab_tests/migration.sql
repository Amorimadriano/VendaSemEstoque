CREATE TABLE IF NOT EXISTS "public"."marketing_ab_tests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" TEXT NOT NULL REFERENCES "public"."products"("id") ON DELETE CASCADE,
  "variable" TEXT NOT NULL,
  "hypothesis" TEXT NOT NULL,
  "variation_a" TEXT NOT NULL,
  "variation_b" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "result_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "marketing_ab_tests_product_id_created_at_idx"
ON "public"."marketing_ab_tests" ("product_id", "created_at" DESC);