-- 1. Personaliza la campana
update public.campaign_settings
set
  brand_name = 'Tu Negocio',
  meta_description = 'Landing para registrar participantes de la promocion de Tu Negocio.',
  admin_email_placeholder = 'admin@tunegocio.com',
  locale = 'es-MX',
  time_zone = 'America/Mexico_City',
  registration_deadline_at = '2026-06-30 23:59:59-06',
  redemption_deadline_at = '2026-07-15 23:59:59-06',
  intro_kicker = 'Promocion exclusiva',
  intro_title = 'Sorpresa',
  intro_copy = 'Hay un beneficio reservado para ti.',
  hero_eyebrow = 'Beneficio activado por QR',
  hero_title_prefix = 'Sorpresa, te has ganado',
  hero_title_highlight = 'un beneficio exclusivo',
  hero_body = 'Valida la clave de tu QR y completa tu registro para reservar el beneficio.',
  offer_title = 'Beneficio exclusivo',
  offer_description = 'Completa tu registro para reservarlo.',
  registration_section_title = 'Vamos a revisar que tu codigo QR sea valido.',
  registration_closed_title = 'Proceso de registro para canjear beneficio.',
  code_validation_title = 'Valida tu QR',
  form_section_title = 'Completa tus datos',
  success_title = 'Tu beneficio ya quedo reservado.',
  terms_section_title = 'Condiciones oficiales de la promocion.',
  terms_modal_intro = 'Revisa las condiciones antes de confirmar tu registro.',
  footer_note = 'Promocion vigente hasta la fecha de canje publicada.',
  participant_identifier_label = 'Documento',
  participant_identifier_placeholder = 'ABC-123456',
  participant_identifier_pattern = '^[A-Z0-9-]{6,20}$',
  participant_identifier_normalization_pattern = '[^A-Z0-9]',
  participant_identifier_input_mode = 'text',
  whatsapp_label = 'WhatsApp',
  whatsapp_placeholder = '5512345678',
  whatsapp_country_code = '52',
  whatsapp_local_pattern = '^[0-9]{10}$',
  whatsapp_format_groups = '[3,3,4]'::jsonb,
  admin_title = 'Panel administrativo',
  admin_subtitle = 'Consulta participantes y registra el canje de la promocion.',
  admin_search_placeholder = 'Ejemplo: 5512345678 o PROMO-2026-001',
  email_subject = 'Tu registro fue confirmado',
  email_headline = 'Tu registro fue confirmado',
  email_confirmation_message = 'Hola {{first_name}}, tu beneficio de {{offer_title}} ya quedo registrado.',
  email_instructions_title = 'Indicaciones para canjear',
  email_terms_title = 'Terminos y condiciones',
  redemption_instructions = '[
    "Presenta el documento y el correo que registraste al momento del canje.",
    "El beneficio aplica una sola vez por participante y por codigo unico.",
    "El canje queda sujeto a validacion del equipo del negocio."
  ]'::jsonb,
  terms = '[
    "El beneficio aplica una sola vez por participante y por codigo unico.",
    "Consulta en el punto de canje cualquier restriccion adicional del beneficio.",
    "La fecha limite de registro y de canje se muestra en esta pagina.",
    "El negocio puede rechazar el canje si los datos del participante no coinciden."
  ]'::jsonb
where singleton = true;

-- 2. Autoriza administradores
insert into public.admin_users (email)
values
  ('admin@tunegocio.com')
on conflict (email) do nothing;

-- 3. Carga codigos
insert into public.promo_codes (code)
values
  ('PROMO-2026-001'),
  ('PROMO-2026-002'),
  ('PROMO-2026-003')
on conflict (code) do nothing;
