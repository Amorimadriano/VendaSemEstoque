CREATE TABLE IF NOT EXISTS "public"."marketing_campaigns" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" TEXT NOT NULL REFERENCES "public"."products"("id") ON DELETE CASCADE,
  "channel" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "angle" TEXT NOT NULL,
  "hook" TEXT NOT NULL,
  "script" TEXT NOT NULL,
  "caption" TEXT NOT NULL,
  "cta" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "marketing_campaigns_product_id_created_at_idx"
ON "public"."marketing_campaigns" ("product_id", "created_at" DESC);