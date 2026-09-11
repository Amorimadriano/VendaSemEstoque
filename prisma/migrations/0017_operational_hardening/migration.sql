CREATE TABLE IF NOT EXISTS "public"."automation_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "summary" TEXT,
  "error" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "automation_runs_workflow_created_at_idx"
ON "public"."automation_runs"("workflow", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "automation_runs_status_created_at_idx"
ON "public"."automation_runs"("status", "created_at" DESC);

ALTER TABLE "public"."marketing_content"
  ADD COLUMN IF NOT EXISTS "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "next_retry_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "processing_started_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "marketing_content_queue_idx"
ON "public"."marketing_content"("channel", "status", "next_retry_at", "created_at");
CREATE INDEX IF NOT EXISTS "clicks_created_at_idx" ON "public"."clicks"("created_at");
CREATE INDEX IF NOT EXISTS "clicks_product_id_created_at_idx" ON "public"."clicks"("product_id", "created_at");
CREATE INDEX IF NOT EXISTS "clicks_session_id_idx" ON "public"."clicks"("session_id");
CREATE INDEX IF NOT EXISTS "conversions_created_at_idx" ON "public"."conversions"("created_at");
CREATE INDEX IF NOT EXISTS "conversions_product_id_created_at_idx" ON "public"."conversions"("product_id", "created_at");
CREATE INDEX IF NOT EXISTS "conversions_click_id_idx" ON "public"."conversions"("click_id");

ALTER TABLE "public"."affiliate_programs" ALTER COLUMN "commission_rate" TYPE NUMERIC(8,4) USING "commission_rate"::numeric;
ALTER TABLE "public"."products" ALTER COLUMN "price" TYPE NUMERIC(14,2) USING "price"::numeric;
ALTER TABLE "public"."products" ALTER COLUMN "cost" TYPE NUMERIC(14,2) USING "cost"::numeric;
ALTER TABLE "public"."products" ALTER COLUMN "platform_fees" TYPE NUMERIC(14,2) USING "platform_fees"::numeric;
ALTER TABLE "public"."products" ALTER COLUMN "shipping_cost" TYPE NUMERIC(14,2) USING "shipping_cost"::numeric;
ALTER TABLE "public"."products" ALTER COLUMN "marketing_cost" TYPE NUMERIC(14,2) USING "marketing_cost"::numeric;
ALTER TABLE "public"."products" ALTER COLUMN "other_costs" TYPE NUMERIC(14,2) USING "other_costs"::numeric;
ALTER TABLE "public"."products" ALTER COLUMN "old_price" TYPE NUMERIC(14,2) USING "old_price"::numeric;
ALTER TABLE "public"."products" ALTER COLUMN "commission_percentage" TYPE NUMERIC(8,4) USING "commission_percentage"::numeric;
ALTER TABLE "public"."products" ALTER COLUMN "commission_value" TYPE NUMERIC(14,2) USING "commission_value"::numeric;
ALTER TABLE "public"."conversions" ALTER COLUMN "sale_value" TYPE NUMERIC(14,2) USING "sale_value"::numeric;
ALTER TABLE "public"."conversions" ALTER COLUMN "commission_value" TYPE NUMERIC(14,2) USING "commission_value"::numeric;
ALTER TABLE "public"."commissions" ALTER COLUMN "amount" TYPE NUMERIC(14,2) USING "amount"::numeric;
ALTER TABLE "public"."product_metrics" ALTER COLUMN "total_commission" TYPE NUMERIC(14,2) USING "total_commission"::numeric;
ALTER TABLE "public"."price_history" ALTER COLUMN "price" TYPE NUMERIC(14,2) USING "price"::numeric;
ALTER TABLE "public"."price_history" ALTER COLUMN "old_price" TYPE NUMERIC(14,2) USING "old_price"::numeric;