-- Run against PostgreSQL after migration 0019. Fixtures are always rolled back.
BEGIN;
DO $$
DECLARE seller UUID := gen_random_uuid(); product UUID := gen_random_uuid(); first_order UUID := gen_random_uuid();
  second_order UUID := gen_random_uuid(); item public.partner_orders; quantity INTEGER; blocked BOOLEAN := false;
BEGIN
  IF has_table_privilege('anon', 'public.partners', 'SELECT') OR
     has_function_privilege('anon', 'public.reserve_partner_order(uuid,uuid,jsonb,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Partner data or functions exposed to anonymous users';
  END IF;
  INSERT INTO public.partners(id,email,password_hash,store_name,legal_name,document,phone,business_address,status,terms_version,accepted_commission_bps)
    VALUES(seller, seller::text || '@example.invalid','not-a-password','Test Store','Test Legal Name','12345678901','11999999999',
      'Test address for integration fixtures','ACTIVE','2026-11-24',1000);
  INSERT INTO public.partner_products(id,partner_id,name,description,image_url,price_cents,stock,delivery_days,return_policy,status)
    VALUES(product,seller,'Test product','Integration product fixture, not a real listing.','https://example.invalid/image.jpg',19990,1,10,'Test return policy according to law.','ACTIVE');
  PERFORM public.save_partner_payment_account(seller, seller::text, 'encrypted-test-fixture', now() + interval '1 day', false);
  BEGIN
    PERFORM public.save_partner_payment_account(seller, 'different-' || seller::text, 'encrypted-test-fixture', now() + interval '1 day', false);
  EXCEPTION WHEN raise_exception THEN blocked := true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Payment account receiver changed'; END IF;
  blocked := false;
  BEGIN
    PERFORM public.reserve_partner_order(second_order,product,'{}',1500);
  EXCEPTION WHEN raise_exception THEN blocked := true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Unaccepted commission allowed'; END IF;
  PERFORM public.reserve_partner_order(first_order,product,'{}',1000);
  blocked := false;
  BEGIN
    PERFORM public.reserve_partner_order(second_order,product,'{}',1000);
  EXCEPTION WHEN raise_exception THEN blocked := true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Oversold the final stock unit'; END IF;
  SELECT * INTO item FROM public.partner_orders WHERE id = first_order;
  IF item.commission_cents <> 1999 THEN RAISE EXCEPTION 'Wrong fee snapshot'; END IF;
  PERFORM public.apply_partner_payment(first_order,'test-' || first_order,'approved',19990,0,'2026-11-24 15:05:00+00');
  PERFORM public.apply_partner_payment(first_order,'test-' || first_order,'approved',19990,0,'2026-11-24 15:05:00+00');
  SELECT * INTO item FROM public.partner_orders WHERE id = first_order;
  IF item.status <> 'PAID' OR item.earned_commission_cents <> 1999 OR item.paid_cents <> 19990 THEN
    RAISE EXCEPTION 'Approved payment not idempotent';
  END IF;
  PERFORM public.apply_partner_payment(first_order,'test-' || first_order,'approved',19990,9995,'2026-11-24 15:06:00+00');
  SELECT * INTO item FROM public.partner_orders WHERE id = first_order;
  IF item.status <> 'PARTIALLY_REFUNDED' OR item.earned_commission_cents <> 1000 THEN RAISE EXCEPTION 'Partial refund fee incorrect'; END IF;
  PERFORM public.apply_partner_payment(first_order,'test-' || first_order,'approved',19990,0,'2026-11-24 15:04:00+00');
  SELECT * INTO item FROM public.partner_orders WHERE id = first_order;
  IF item.earned_commission_cents <> 1000 THEN RAISE EXCEPTION 'Stale event reversed refund'; END IF;
  PERFORM public.apply_partner_payment(first_order,'test-' || first_order,'refunded',19990,19990,'2026-11-24 15:07:00+00');
  PERFORM public.apply_partner_payment(first_order,'test-' || first_order,'refunded',19990,19990,'2026-11-24 15:07:00+00');
  SELECT * INTO item FROM public.partner_orders WHERE id = first_order;
  SELECT stock INTO quantity FROM public.partner_products WHERE id = product;
  IF item.status <> 'REFUNDED' OR item.earned_commission_cents <> 0 OR quantity <> 1 THEN RAISE EXCEPTION 'Refund or restock not idempotent'; END IF;
  PERFORM public.reserve_partner_order(second_order,product,'{}',1000);
  UPDATE public.partner_orders SET expires_at = now() - interval '1 minute' WHERE id = second_order;
  PERFORM public.expire_partner_order(second_order);
  PERFORM public.expire_partner_order(second_order);
  SELECT stock INTO quantity FROM public.partner_products WHERE id = product;
  IF quantity <> 1 THEN RAISE EXCEPTION 'Expired reservation not released exactly once'; END IF;
END;
$$;
ROLLBACK;
