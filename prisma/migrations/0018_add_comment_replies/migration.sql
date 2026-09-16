CREATE TABLE IF NOT EXISTS "public"."comment_replies" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "platform" TEXT NOT NULL,
  "comment_id" TEXT NOT NULL,
  "post_id" TEXT,
  "from_id" TEXT,
  "comment_text" TEXT,
  "reply_text" TEXT NOT NULL,
  "reply_id" TEXT,
  "replied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "comment_replies_platform_comment_id_key" UNIQUE ("platform", "comment_id")
);

CREATE INDEX IF NOT EXISTS "comment_replies_created_at_idx"
ON "public"."comment_replies" ("created_at" DESC);
