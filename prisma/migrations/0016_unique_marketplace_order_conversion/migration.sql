CREATE UNIQUE INDEX IF NOT EXISTS "conversions_marketplace_id_order_external_id_key"
ON "public"."conversions"("marketplace_id", "order_external_id");
