BEGIN;

ALTER TABLE public.partner_products
  ADD COLUMN image_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT partner_products_gallery_limit
    CHECK (cardinality(image_urls) <= 10 AND array_position(image_urls, NULL) IS NULL);

UPDATE public.partner_products SET image_urls = ARRAY[image_url];

NOTIFY pgrst, 'reload schema';

COMMIT;
