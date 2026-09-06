INSERT INTO "public"."marketplaces" ("id", "name", "slug", "api_status", "affiliate_status", "updated_at")
VALUES (gen_random_uuid()::text, 'Hotmart', 'hotmart', 'PENDING', 'PENDING', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "public"."categories" ("id", "name", "slug", "description", "icon", "updated_at")
VALUES (gen_random_uuid()::text, 'Produtos Digitais', 'produtos-digitais', 'Cursos, produtos e ofertas digitais', 'BookOpen', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;