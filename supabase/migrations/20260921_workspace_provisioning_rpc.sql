-- ==============================================================================
-- ECOMHUB OS: Workspace Provisioning Atomicity & Idempotency Migration
-- ==============================================================================

-- 1. Idempotency tracking table
CREATE TABLE IF NOT EXISTS public.provisioning_idempotency (
    idempotency_key UUID PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    response_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.provisioning_idempotency ENABLE ROW LEVEL SECURITY;

-- 2. Atomic Provisioning RPC Function with Advisory Lock Serialization
CREATE OR REPLACE FUNCTION public.provision_workspace_atomic(
    p_idempotency_key UUID,
    p_business_id UUID,
    p_name TEXT,
    p_currency TEXT,
    p_owner_user_id UUID,
    p_role_template_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing_payload JSONB;
    v_role_id UUID;
    v_count INT;
    v_biz RECORD;
    v_distinct_count INT;
    v_lock_key BIGINT;
BEGIN
    -- 1. Derive deterministic bigint lock key from UUID and acquire transaction-scoped advisory lock
    v_lock_key := ('x' || left(replace(p_idempotency_key::text, '-', ''), 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 2. Check idempotency key inside lock critical section
    SELECT response_payload INTO v_existing_payload
    FROM public.provisioning_idempotency
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_payload IS NOT NULL THEN
        RETURN v_existing_payload;
    END IF;

    -- 3. Validate role template array length
    IF p_role_template_ids IS NULL OR array_length(p_role_template_ids, 1) IS NULL OR array_length(p_role_template_ids, 1) = 0 THEN
        RAISE EXCEPTION 'At least one business role must be selected.';
    END IF;

    -- 4. Reject duplicate role UUIDs
    SELECT count(DISTINCT u) INTO v_distinct_count
    FROM unnest(p_role_template_ids) AS u;

    IF v_distinct_count <> array_length(p_role_template_ids, 1) THEN
        RAISE EXCEPTION 'Duplicate role template IDs are not allowed.';
    END IF;

    -- 5. Validate every supplied UUID exists and has status = 'Active' in public.business_role_templates
    SELECT count(*) INTO v_count
    FROM public.business_role_templates
    WHERE id = ANY(p_role_template_ids)
      AND status = 'Active';

    IF v_count <> array_length(p_role_template_ids, 1) THEN
        RAISE EXCEPTION 'One or more provided role template IDs are invalid or not active.';
    END IF;

    -- 6. Insert business (defaulting currency to 'PKR' if missing/blank)
    INSERT INTO public.businesses (id, name, currency)
    VALUES (
        p_business_id, 
        p_name, 
        CASE WHEN p_currency IS NULL OR trim(p_currency) = '' THEN 'PKR' ELSE p_currency END
    )
    RETURNING * INTO v_biz;

    -- 7. Insert owner membership referencing auth.users(id)
    INSERT INTO public.business_members (id, business_id, user_id, role)
    VALUES (gen_random_uuid(), p_business_id, p_owner_user_id, 'Owner');

    -- 8. Insert assigned roles with status = 'Active'
    FOREACH v_role_id IN ARRAY p_role_template_ids
    LOOP
        INSERT INTO public.workspace_assigned_roles (id, business_id, role_template_id, status)
        VALUES (gen_random_uuid(), p_business_id, v_role_id, 'Active');
    END LOOP;

    -- 9. Build response payload
    v_existing_payload := jsonb_build_object(
        'success', true,
        'business_id', v_biz.id,
        'name', v_biz.name,
        'currency', v_biz.currency,
        'created_at', v_biz.created_at
    );

    -- 10. Store idempotency record (canonical insert)
    INSERT INTO public.provisioning_idempotency (idempotency_key, business_id, response_payload)
    VALUES (p_idempotency_key, p_business_id, v_existing_payload);

    RETURN v_existing_payload;
END;
$$;

-- 3. Security Hardening: Revoke and Grant execution permissions
REVOKE ALL ON FUNCTION public.provision_workspace_atomic(UUID, UUID, TEXT, TEXT, UUID, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_workspace_atomic(UUID, UUID, TEXT, TEXT, UUID, UUID[]) TO service_role;
