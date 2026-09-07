CREATE TABLE IF NOT EXISTS "public"."marketing_videos" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "content_id" UUID NOT NULL REFERENCES "public"."marketing_content"("id") ON DELETE CASCADE,
  "provider_render_id" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'RENDERING',
  "video_url" TEXT,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);