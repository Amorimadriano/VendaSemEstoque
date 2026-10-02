CREATE TABLE "public"."instagram_profile_candidates" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profile_url" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_profile_candidates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "instagram_profile_candidates_status_check" CHECK ("status" IN ('PENDING_REVIEW', 'FOLLOWED_MANUALLY', 'SKIPPED'))
);

CREATE UNIQUE INDEX "instagram_profile_candidates_username_key"
ON "public"."instagram_profile_candidates"("username");

CREATE INDEX "instagram_profile_candidates_status_created_at_idx"
ON "public"."instagram_profile_candidates"("status", "created_at" DESC);

ALTER TABLE "public"."instagram_profile_candidates" ENABLE ROW LEVEL SECURITY;