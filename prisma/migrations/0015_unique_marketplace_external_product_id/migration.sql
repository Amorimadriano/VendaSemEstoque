-- Drop single-column unique constraint and index on external_product_id if exists
DROP INDEX IF EXISTS "public"."products_externalProductId_key";
DROP INDEX IF EXISTS "public"."products_external_product_id_key";
ALTER TABLE "public"."products" DROP CONSTRAINT IF EXISTS "products_externalProductId_key";
ALTER TABLE "public"."products" DROP CONSTRAINT IF EXISTS "products_external_product_id_key";

-- Create compound unique index for (marketplace_id, external_product_id)
CREATE UNIQUE INDEX IF NOT EXISTS "products_marketplace_external_unique"
ON "public"."products" ("marketplace_id", "external_product_id");
