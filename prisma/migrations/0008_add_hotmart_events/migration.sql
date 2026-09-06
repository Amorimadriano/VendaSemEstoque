CREATE TABLE IF NOT EXISTS "public"."hotmart_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" TEXT NOT NULL UNIQUE,
  "event_type" TEXT,
  "event_status" TEXT,
  "payload" JSONB NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "hotmart_events_received_at_idx"
ON "public"."hotmart_events" ("received_at" DESC);