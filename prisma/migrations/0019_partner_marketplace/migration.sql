BEGIN;

CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  store_name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  document TEXT NOT NULL,
  phone TEXT NOT NULL,
  business_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','SUSPENDED')),
  review_note TEXT,
  terms_version TEXT NOT NULL,
  terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_commission_bps INTEGER CHECK (accepted_commission_bps BETWEEN 1 AND 9999),
  commission_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_payment_accounts (
  partner_id UUID PRIMARY KEY REFERENCES public.partners(id),
  provider_user_id TEXT NOT NULL UNIQUE,
  encrypted_credentials TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  live_mode BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents BETWEEN 100 AND 10000000),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  delivery_days INTEGER NOT NULL CHECK (delivery_days BETWEEN 1 AND 60),
  return_policy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW','ACTIVE','REJECTED','INACTIVE')),
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX partner_products_partner_idx ON public.partner_products(partner_id, created_at DESC);

CREATE TABLE public.partner_orders (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.partner_products(id),
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  product_name TEXT NOT NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  commission_bps INTEGER NOT NULL CHECK (commission_bps BETWEEN 1 AND 9999),
  commission_cents INTEGER NOT NULL CHECK (commission_cents > 0),
  buyer JSONB NOT NULL,
  receipt_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','PARTIALLY_REFUNDED','REFUNDED','DISPUTED','REVIEW','EXPIRED')),
  fulfillment_status TEXT NOT NULL DEFAULT 'UNFULFILLED' CHECK (fulfillment_status IN ('UNFULFILLED','SHIPPED','DELIVERED')),
  tracking_code TEXT,
  preference_id TEXT UNIQUE,
  checkout_url TEXT,
  last_payment_check_at TIMESTAMPTZ,
  stock_reserved BOOLEAN NOT NULL DEFAULT true,
  paid_cents INTEGER NOT NULL DEFAULT 0,
  refunded_cents INTEGER NOT NULL DEFAULT 0,
  earned_commission_cents INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX partner_orders_partner_idx ON public.partner_orders(partner_id, created_at DESC);
CREATE INDEX partner_orders_pending_idx ON public.partner_orders(status, expires_at);

CREATE TABLE public.partner_payments (
  provider_payment_id TEXT PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.partner_orders(id),
  status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  refunded_cents INTEGER NOT NULL CHECK (refunded_cents BETWEEN 0 AND amount_cents),
  source_updated_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX partner_payments_order_idx ON public.partner_payments(order_id);

CREATE TABLE public.partner_oauth_states (
  state_hash TEXT PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  verifier TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '10 minutes'
);

CREATE TABLE public.partner_rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '15 minutes'
);

CREATE FUNCTION public.save_partner_payment_account(p_partner_id UUID, p_provider_user_id TEXT, p_encrypted_credentials TEXT, p_expires_at TIMESTAMPTZ, p_live_mode BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO partner_payment_accounts(partner_id, provider_user_id, encrypted_credentials, expires_at, live_mode)
  VALUES(p_partner_id, p_provider_user_id, p_encrypted_credentials, p_expires_at, p_live_mode)
  ON CONFLICT(partner_id) DO UPDATE SET encrypted_credentials = EXCLUDED.encrypted_credentials,
    expires_at = EXCLUDED.expires_at, live_mode = EXCLUDED.live_mode, updated_at = now()
  WHERE partner_payment_accounts.provider_user_id = EXCLUDED.provider_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Não é possível trocar a conta Mercado Pago vinculada. Contate a administração.'; END IF;
END;
$$;

CREATE FUNCTION public.partner_rate_limit(p_key TEXT, p_limit INTEGER) RETURNS BOOLEAN
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE attempts_count INTEGER;
BEGIN
  INSERT INTO partner_rate_limits(key) VALUES (p_key)
  ON CONFLICT (key) DO UPDATE SET
    attempts = CASE WHEN partner_rate_limits.reset_at < now() THEN 1 ELSE partner_rate_limits.attempts + 1 END,
    reset_at = CASE WHEN partner_rate_limits.reset_at < now() THEN now() + interval '15 minutes' ELSE partner_rate_limits.reset_at END
  RETURNING attempts INTO attempts_count;
  RETURN attempts_count <= p_limit;
END;
$$;

CREATE FUNCTION public.reserve_partner_order(p_id UUID, p_product_id UUID, p_buyer JSONB, p_commission_bps INTEGER)
RETURNS JSONB LANGUAGE plpgsql SET search_path = public AS $$
DECLARE product partner_products; seller partners; result partner_orders; fee INTEGER;
BEGIN
  SELECT * INTO product FROM partner_products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND OR product.status <> 'ACTIVE' OR product.stock < 1 THEN
    RAISE EXCEPTION 'Produto indisponível';
  END IF;
  SELECT * INTO seller FROM partners WHERE id = product.partner_id FOR SHARE;
  IF seller.status <> 'ACTIVE' OR seller.accepted_commission_bps IS DISTINCT FROM p_commission_bps THEN
    RAISE EXCEPTION 'Vendedor não habilitado ou comissão não aceita';
  END IF;
  fee := round(product.price_cents::numeric * p_commission_bps / 10000);
  IF fee < 1 THEN RAISE EXCEPTION 'Comissão insuficiente para o pagamento'; END IF;
  UPDATE partner_products SET stock = stock - 1, updated_at = clock_timestamp() WHERE id = product.id;
  INSERT INTO partner_orders(id, product_id, partner_id, product_name, total_cents, commission_bps, commission_cents, buyer)
  VALUES(p_id, product.id, seller.id, product.name, product.price_cents, p_commission_bps, fee, p_buyer)
  RETURNING * INTO result;
  RETURN to_jsonb(result);
END;
$$;

CREATE FUNCTION public.expire_partner_order(p_id UUID) RETURNS VOID
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE item partner_orders;
BEGIN
  SELECT * INTO item FROM partner_orders WHERE id = p_id FOR UPDATE;
  IF item.status <> 'PENDING' OR item.expires_at > now() THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM partner_payments WHERE order_id = p_id AND status IN ('approved','pending','in_process','authorized','in_mediation')) THEN RETURN; END IF;
  IF item.stock_reserved THEN UPDATE partner_products SET stock = stock + 1, updated_at = clock_timestamp() WHERE id = item.product_id; END IF;
  UPDATE partner_orders SET status = 'EXPIRED', stock_reserved = false, updated_at = now() WHERE id = p_id;
END;
$$;

CREATE FUNCTION public.apply_partner_payment(p_order_id UUID, p_payment_id TEXT, p_status TEXT, p_amount INTEGER, p_refunded INTEGER, p_source_updated_at TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
DECLARE item partner_orders; paid INTEGER; refunded INTEGER; disputed BOOLEAN; new_status TEXT; affected INTEGER;
BEGIN
  SELECT * INTO item FROM partner_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR item.total_cents <> p_amount THEN RAISE EXCEPTION 'Pagamento incompatível com o pedido'; END IF;
  IF EXISTS (SELECT 1 FROM partner_payments WHERE provider_payment_id = p_payment_id AND order_id <> p_order_id) THEN
    RAISE EXCEPTION 'Pagamento já associado a outro pedido';
  END IF;
  INSERT INTO partner_payments(provider_payment_id, order_id, status, amount_cents, refunded_cents, source_updated_at)
  VALUES(p_payment_id, p_order_id, p_status, p_amount, p_refunded, p_source_updated_at)
  ON CONFLICT(provider_payment_id) DO UPDATE SET status = EXCLUDED.status, refunded_cents = EXCLUDED.refunded_cents,
    source_updated_at = EXCLUDED.source_updated_at, updated_at = now()
  WHERE partner_payments.source_updated_at < EXCLUDED.source_updated_at;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN RETURN; END IF;
  SELECT coalesce(sum(amount_cents) FILTER (WHERE status IN ('approved','refunded')),0),
    coalesce(sum(refunded_cents) FILTER (WHERE status IN ('approved','refunded')),0),
    coalesce(bool_or(status IN ('charged_back','in_mediation')),false)
  INTO paid, refunded, disputed FROM partner_payments WHERE order_id = p_order_id;
  new_status := CASE WHEN disputed THEN 'DISPUTED' WHEN paid - refunded > item.total_cents THEN 'REVIEW'
    WHEN paid > 0 AND refunded >= paid THEN 'REFUNDED' WHEN paid > 0 AND refunded > 0 THEN 'PARTIALLY_REFUNDED'
    WHEN paid > 0 THEN 'PAID' WHEN item.status IN ('PAID','PARTIALLY_REFUNDED','REFUNDED') THEN 'REVIEW' ELSE item.status END;
  IF new_status IN ('PAID','PARTIALLY_REFUNDED') AND NOT item.stock_reserved THEN
    UPDATE partner_products SET stock = stock - 1, updated_at = clock_timestamp() WHERE id = item.product_id AND stock > 0;
    IF FOUND THEN item.stock_reserved := true; ELSE new_status := 'REVIEW'; END IF;
  END IF;
  IF new_status = 'REFUNDED' AND item.stock_reserved AND item.fulfillment_status = 'UNFULFILLED' THEN
    UPDATE partner_products SET stock = stock + 1, updated_at = clock_timestamp() WHERE id = item.product_id;
    item.stock_reserved := false;
  END IF;
  UPDATE partner_orders SET status = new_status, stock_reserved = item.stock_reserved, paid_cents = paid, refunded_cents = refunded,
    earned_commission_cents = CASE WHEN new_status IN ('PAID','PARTIALLY_REFUNDED')
      THEN round(item.commission_cents::numeric * (paid - refunded) / item.total_cents) ELSE 0 END,
    updated_at = now() WHERE id = p_order_id;
END;
$$;

DO $$
DECLARE table_name TEXT; function_signature TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['partners','partner_payment_accounts','partner_products','partner_orders','partner_payments','partner_oauth_states','partner_rate_limits']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
  END LOOP;
  FOREACH function_signature IN ARRAY ARRAY[
    'partner_rate_limit(text,integer)','reserve_partner_order(uuid,uuid,jsonb,integer)',
    'save_partner_payment_account(uuid,text,text,timestamptz,boolean)',
    'expire_partner_order(uuid)','apply_partner_payment(uuid,text,text,integer,integer,timestamptz)'
  ] LOOP
    EXECUTE 'REVOKE ALL ON FUNCTION public.' || function_signature || ' FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.' || function_signature || ' TO service_role';
  END LOOP;
END;
$$;

COMMIT;
