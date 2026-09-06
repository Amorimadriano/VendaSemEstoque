INSERT INTO "public"."categories" ("id", "name", "slug", "description", "icon", "updated_at")
VALUES (
  gen_random_uuid()::text,
  'Beleza e Higiene',
  'beleza-e-higiene',
  'Produtos de cuidados pessoais, beleza e higiene',
  'Sparkles',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;