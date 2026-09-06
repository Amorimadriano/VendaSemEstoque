CREATE TABLE IF NOT EXISTS "public"."marketing_content" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" TEXT NOT NULL REFERENCES "public"."products"("id") ON DELETE CASCADE,
  "channel" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "hook" TEXT NOT NULL,
  "caption" TEXT NOT NULL,
  "script" TEXT,
  "cta" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "marketing_content_product_id_created_at_idx"
ON "public"."marketing_content" ("product_id", "created_at" DESC);