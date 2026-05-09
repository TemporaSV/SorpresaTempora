create extension if not exists pgcrypto;

create table if not exists public.campaign_settings (
  singleton boolean primary key default true check (singleton),
  brand_name text not null default 'Tu Negocio',
  meta_description text not null default 'Plantilla para una promocion con QR, registro unico y panel administrativo.',
  admin_email_placeholder text not null default 'admin@tunegocio.com',
  locale text not null default 'es-SV',
  time_zone text not null default 'America/El_Salvador',
  registration_deadline_at timestamptz not null default timestamptz '2026-05-16 23:59:59-06',
  redemption_deadline_at timestamptz not null default timestamptz '2026-05-31 23:59:59-06',
  intro_kicker text not null default 'Promocion exclusiva',
  intro_title text not null default 'Sorpresa',
  intro_copy text not null default 'Hay un beneficio reservado para ti.',
  hero_eyebrow text not null default 'Beneficio activado por QR',
  hero_title_prefix text not null default 'Sorpresa, te has ganado',
  hero_title_highlight text not null default 'un beneficio exclusivo',
  hero_body text not null default 'Valida la clave de tu QR y completa tu registro para reservar el beneficio.',
  offer_title text not null default 'Beneficio exclusivo',
  offer_description text not null default 'Completa tu registro para reservarlo.',
  registration_section_title text not null default 'Vamos a revisar que tu codigo QR sea valido.',
  registration_closed_title text not null default 'Proceso de registro para canjear beneficio.',
  code_validation_title text not null default 'Valida tu QR',
  form_section_title text not null default 'Completa tus datos',
  success_title text not null default 'Tu beneficio ya quedo reservado.',
  terms_section_title text not null default 'Condiciones oficiales de la promocion.',
  terms_modal_intro text not null default 'Revisa las condiciones antes de confirmar tu registro.',
  footer_note text not null default 'Promocion vigente hasta la fecha de canje publicada.',
  redemption_instructions jsonb not null default '[
    "Presenta el documento y el correo que registraste al momento del canje.",
    "El beneficio aplica una sola vez por participante y por codigo unico.",
    "El canje queda sujeto a validacion del equipo del negocio."
  ]'::jsonb,
  terms jsonb not null default '[
    "El beneficio aplica una sola vez por participante y por codigo unico.",
    "Consulta en el punto de canje cualquier restriccion adicional del beneficio.",
    "La fecha limite de registro y de canje se muestra en esta pagina.",
    "El negocio puede rechazar el canje si los datos del participante no coinciden."
  ]'::jsonb,
  participant_identifier_label text not null default 'Documento',
  participant_identifier_placeholder text not null default 'ABC-123456',
  participant_identifier_pattern text not null default '^[A-Z0-9-]{6,20}$',
  participant_identifier_normalization_pattern text not null default '[^A-Z0-9]',
  participant_identifier_input_mode text not null default 'text',
  whatsapp_label text not null default 'WhatsApp',
  whatsapp_placeholder text not null default '1234-5678',
  whatsapp_country_code text not null default '503',
  whatsapp_local_pattern text not null default '^[567][0-9]{7}$',
  whatsapp_format_groups jsonb not null default '[4,4]'::jsonb,
  admin_title text not null default 'Panel administrativo',
  admin_subtitle text not null default 'Consulta participantes y registra el canje de la promocion.',
  admin_search_placeholder text not null default 'Ejemplo: 1234-5678 o PROMO-2026-001',
  email_subject text not null default 'Tu registro fue confirmado',
  email_headline text not null default 'Tu registro fue confirmado',
  email_confirmation_message text not null default 'Hola {{first_name}}, tu beneficio ya quedo registrado.',
  email_instructions_title text not null default 'Indicaciones para canjear',
  email_terms_title text not null default 'Terminos y condiciones',
  updated_at timestamptz not null default now()
);

insert into public.campaign_settings (singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admin_users_email_lower check (email = lower(email))
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  active boolean not null default true,
  used_at timestamptz,
  used_by_email text,
  claim_id uuid unique,
  created_at timestamptz not null default now(),
  constraint promo_codes_code_upper check (code = upper(code))
);

create table if not exists public.promotion_claims (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null,
  first_name text not null,
  last_name text not null,
  participant_identifier text not null,
  participant_identifier_normalized text not null unique,
  whatsapp_phone text,
  claimed_code text not null,
  promo_code_id uuid not null unique references public.promo_codes (id),
  terms_accepted_at timestamptz not null default now(),
  notification_sent_at timestamptz,
  notification_dispatch_key_hash text,
  redeemed_at timestamptz,
  redeemed_by_email text,
  created_at timestamptz not null default now(),
  constraint promotion_claims_whatsapp_phone_format
    check (whatsapp_phone is null or whatsapp_phone ~ '^[0-9]{8,20}$')
);

alter table public.promo_codes
  drop constraint if exists promo_codes_claim_id_fkey;

alter table public.promo_codes
  add constraint promo_codes_claim_id_fkey
  foreign key (claim_id)
  references public.promotion_claims (id)
  on delete set null;

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where email = public.current_user_email()
  );
$$;

drop function if exists public.claim_promotion(text, text, text, text);
drop function if exists public.claim_promotion(text, text, text, text, text);
drop function if exists public.claim_promotion(text, text, text, text, text, text);

create or replace function public.claim_promotion(
  p_first_name text,
  p_last_name text,
  p_participant_identifier text,
  p_whatsapp_phone text,
  p_email text,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.campaign_settings%rowtype;
  v_code public.promo_codes%rowtype;
  v_claim public.promotion_claims%rowtype;
  v_identifier_raw text := upper(trim(coalesce(p_participant_identifier, '')));
  v_identifier_normalized text;
  v_whatsapp_digits text := regexp_replace(trim(coalesce(p_whatsapp_phone, '')), '\D', '', 'g');
  v_whatsapp_country_code text;
  v_whatsapp_local_digits text;
  v_whatsapp_canonical text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_code_normalized text := upper(trim(coalesce(p_code, '')));
  v_dispatch_key text := gen_random_uuid()::text;
begin
  select *
  into v_settings
  from public.campaign_settings
  where singleton = true
  limit 1;

  if not found then
    raise exception 'CAMPAIGN_SETTINGS_NOT_FOUND';
  end if;

  if now() > v_settings.registration_deadline_at then
    raise exception 'REGISTRATION_CLOSED';
  end if;

  if length(trim(coalesce(p_first_name, ''))) = 0 or length(trim(coalesce(p_last_name, ''))) = 0 then
    raise exception 'NAME_REQUIRED';
  end if;

  if v_identifier_raw = '' or v_identifier_raw !~* v_settings.participant_identifier_pattern then
    raise exception 'INVALID_PARTICIPANT_IDENTIFIER';
  end if;

  v_identifier_normalized := regexp_replace(
    v_identifier_raw,
    v_settings.participant_identifier_normalization_pattern,
    '',
    'g'
  );

  if v_identifier_normalized = '' then
    raise exception 'INVALID_PARTICIPANT_IDENTIFIER';
  end if;

  if v_email = '' or v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'INVALID_EMAIL';
  end if;

  v_whatsapp_country_code := regexp_replace(
    coalesce(v_settings.whatsapp_country_code, ''),
    '\D',
    '',
    'g'
  );

  if
    v_whatsapp_country_code <> '' and
    left(v_whatsapp_digits, char_length(v_whatsapp_country_code)) = v_whatsapp_country_code and
    char_length(v_whatsapp_digits) > char_length(v_whatsapp_country_code)
  then
    v_whatsapp_local_digits := substring(
      v_whatsapp_digits
      from char_length(v_whatsapp_country_code) + 1
    );
  else
    v_whatsapp_local_digits := v_whatsapp_digits;
  end if;

  if v_whatsapp_local_digits !~ v_settings.whatsapp_local_pattern then
    raise exception 'INVALID_WHATSAPP';
  end if;

  if v_code_normalized = '' then
    raise exception 'INVALID_CODE';
  end if;

  if exists (
    select 1
    from public.promotion_claims
    where participant_identifier_normalized = v_identifier_normalized
  ) then
    raise exception 'PARTICIPANT_IDENTIFIER_ALREADY_REGISTERED';
  end if;

  select *
  into v_code
  from public.promo_codes
  where code = v_code_normalized
    and active = true
  for update;

  if not found then
    raise exception 'INVALID_CODE';
  end if;

  if v_code.used_at is not null then
    raise exception 'CODE_ALREADY_USED';
  end if;

  v_whatsapp_canonical := v_whatsapp_country_code || v_whatsapp_local_digits;

  insert into public.promotion_claims (
    email,
    email_normalized,
    first_name,
    last_name,
    participant_identifier,
    participant_identifier_normalized,
    whatsapp_phone,
    claimed_code,
    promo_code_id,
    notification_dispatch_key_hash
  )
  values (
    v_email,
    v_email,
    trim(p_first_name),
    trim(p_last_name),
    v_identifier_raw,
    v_identifier_normalized,
    v_whatsapp_canonical,
    v_code_normalized,
    v_code.id,
    encode(extensions.digest(v_dispatch_key, 'sha256'), 'hex')
  )
  returning *
  into v_claim;

  update public.promo_codes
  set
    used_at = now(),
    used_by_email = v_email,
    claim_id = v_claim.id
  where id = v_code.id;

  return jsonb_build_object(
    'claim', to_jsonb(v_claim),
    'notification_dispatch_key', v_dispatch_key
  );
end;
$$;

create or replace function public.validate_promo_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.campaign_settings%rowtype;
  v_code public.promo_codes%rowtype;
  v_code_normalized text := upper(trim(coalesce(p_code, '')));
begin
  select *
  into v_settings
  from public.campaign_settings
  where singleton = true
  limit 1;

  if not found then
    raise exception 'CAMPAIGN_SETTINGS_NOT_FOUND';
  end if;

  if v_code_normalized = '' then
    return jsonb_build_object(
      'available', false,
      'reason', 'missing_code',
      'message', 'Ingresa un codigo valido.'
    );
  end if;

  select *
  into v_code
  from public.promo_codes
  where code = v_code_normalized
    and active = true;

  if not found then
    return jsonb_build_object(
      'available', false,
      'reason', 'invalid_code',
      'message', 'Ese QR no corresponde a una promocion activa.'
    );
  end if;

  if v_code.used_at is not null then
    return jsonb_build_object(
      'available', false,
      'reason', 'already_used',
      'message', 'Este QR ya fue registrado anteriormente.'
    );
  end if;

  if now() > v_settings.registration_deadline_at then
    return jsonb_build_object(
      'available', false,
      'reason', 'registration_closed',
      'message', 'El periodo de registro ya finalizo.'
    );
  end if;

  return jsonb_build_object(
    'available', true,
    'reason', 'available',
    'message', 'Codigo valido. Ya puedes completar tus datos.',
    'code', v_code_normalized
  );
end;
$$;

create or replace function public.redeem_promotion(p_claim_id uuid)
returns public.promotion_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.campaign_settings%rowtype;
  v_claim public.promotion_claims%rowtype;
  v_email text := public.current_user_email();
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select *
  into v_settings
  from public.campaign_settings
  where singleton = true
  limit 1;

  if not found then
    raise exception 'CAMPAIGN_SETTINGS_NOT_FOUND';
  end if;

  if now() > v_settings.redemption_deadline_at then
    raise exception 'REDEMPTION_CLOSED';
  end if;

  select *
  into v_claim
  from public.promotion_claims
  where id = p_claim_id
  for update;

  if not found then
    raise exception 'CLAIM_NOT_FOUND';
  end if;

  if v_claim.redeemed_at is not null then
    raise exception 'CLAIM_ALREADY_REDEEMED';
  end if;

  update public.promotion_claims
  set
    redeemed_at = now(),
    redeemed_by_email = v_email
  where id = p_claim_id
  returning *
  into v_claim;

  return v_claim;
end;
$$;

alter table public.campaign_settings enable row level security;
alter table public.admin_users enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promotion_claims enable row level security;

drop policy if exists "public_can_view_campaign_settings" on public.campaign_settings;
create policy "public_can_view_campaign_settings"
on public.campaign_settings
for select
to authenticated, anon
using (singleton = true);

drop policy if exists "admins_can_view_themselves" on public.admin_users;
create policy "admins_can_view_themselves"
on public.admin_users
for select
to authenticated
using (email = public.current_user_email());

drop policy if exists "admins_can_view_claims" on public.promotion_claims;
create policy "admins_can_view_claims"
on public.promotion_claims
for select
to authenticated
using (public.is_admin());

grant usage on schema public to authenticated, anon;
grant select on public.campaign_settings to authenticated, anon;
grant select on public.admin_users to authenticated;
grant select on public.promotion_claims to authenticated;
grant execute on function public.validate_promo_code(text) to authenticated, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.claim_promotion(text, text, text, text, text, text) to authenticated, anon;
grant execute on function public.redeem_promotion(uuid) to authenticated;
