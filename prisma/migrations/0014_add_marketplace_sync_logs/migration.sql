CREATE TABLE IF NOT EXISTS "public"."marketplace_sync_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "marketplace_slug" TEXT NOT NULL,
  "searched_terms" INTEGER NOT NULL DEFAULT 0,
  "found" INTEGER NOT NULL DEFAULT 0,
  "filtered_out" INTEGER NOT NULL DEFAULT 0,
  "published" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'SUCCESS',
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "marketplace_sync_logs_slug_created_at_idx"
ON "public"."marketplace_sync_logs" ("marketplace_slug", "created_at" DESC);
