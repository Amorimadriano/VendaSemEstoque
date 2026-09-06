ALTER TABLE "public"."marketing_content"
  ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "external_post_id" TEXT,
  ADD COLUMN IF NOT EXISTS "publication_error" TEXT;

CREATE INDEX IF NOT EXISTS "marketing_content_status_scheduled_at_idx"
ON "public"."marketing_content" ("status", "scheduled_at");