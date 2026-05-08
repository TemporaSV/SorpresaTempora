-- 1. Personaliza la campana
update public.campaign_settings
set
  brand_name = 'Tempora',
  meta_description = 'Registro de beneficio y experiencia de marca de Tempora, velas decorativas artesanales.',
  admin_email_placeholder = 'temporasv2025@gmail.com',
  locale = 'es-SV',
  time_zone = 'America/El_Salvador',
  registration_deadline_at = '2026-05-31 23:59:59-06',
  redemption_deadline_at = '2026-07-30 23:59:59-06',
  intro_kicker = 'Velas decorativas artesanales',
  intro_title = 'Tiempo de luz',
  intro_copy = 'Tiempo para ti.',
  hero_eyebrow = 'Coleccion artesanal',
  hero_title_prefix = 'Un detalle de luz',
  hero_title_highlight = 'descuento del 10% en velitas',
  hero_body = 'Valida la clave de tu QR y completa tu registro para reservar tu beneficio exclusivo de Tempora.',
  offer_title = 'Descuento',
  offer_description = 'Descuento del 10% en la compra de velitas.',
  registration_section_title = 'Vamos a confirmar tu codigo para preparar tu beneficio.',
  registration_closed_title = 'Proceso de registro para canjear beneficio.',
  code_validation_title = 'Valida tu QR',
  form_section_title = 'Completa tus datos',
  success_title = 'Tu beneficio Tempora ya quedo reservado.',
  terms_section_title = 'Condiciones de tu beneficio Tempora.',
  terms_modal_intro = 'Revisa las condiciones antes de confirmar tu registro.',
  footer_note = 'Tempora crea velas decorativas artesanales hechas con dedicacion y amor.',
  participant_identifier_label = 'DUI',
  participant_identifier_placeholder = '12345678-9',
  participant_identifier_pattern = '^[A-Z0-9-]{6,20}$',
  participant_identifier_normalization_pattern = '[^A-Z0-9]',
  participant_identifier_input_mode = 'text',
  whatsapp_label = 'WhatsApp',
  whatsapp_placeholder = '1234-5678',
  whatsapp_country_code = '503',
  whatsapp_local_pattern = '^[567][0-9]{7}$',
  whatsapp_format_groups = '[4,4]'::jsonb,
  admin_title = 'Panel Tempora',
  admin_subtitle = 'Consulta participantes y valida beneficios reservados por la marca.',
  admin_search_placeholder = 'Ejemplo: 1234-5678 o TEMPORA-001',
  email_subject = 'Tu beneficio Tempora fue confirmado',
  email_headline = 'Tu beneficio Tempora fue confirmado',
  email_confirmation_message = 'Hola {{first_name}}, tu beneficio Tempora ya quedo registrado.',
  email_instructions_title = 'Indicaciones para canjear',
  email_terms_title = 'Terminos y condiciones',
  redemption_instructions = '[
    "Presenta el documento y el correo que registraste al momento del canje.",
    "El beneficio aplica una sola vez por participante y por codigo unico.",
    "El canje queda sujeto a validacion del equipo Tempora."
  ]'::jsonb,
  terms = '[
    "El beneficio aplica una sola vez por participante y por codigo unico.",
    "Consulta en el punto de canje cualquier restriccion adicional del beneficio.",
    "La fecha limite de registro y de canje se muestra en esta pagina.",
    "Tempora puede rechazar el canje si los datos del participante no coinciden."
  ]'::jsonb
where singleton = true;

-- 2. Autoriza administradores
insert into public.admin_users (email)
values
  ('temporasv2025@gmail.com')
on conflict (email) do nothing;

-- 3. Carga codigos
-- Dejalo comentado hasta que tengas los codigos definitivos.
-- insert into public.promo_codes (code)
-- values
--   ('TEMPORA-001'),
--   ('TEMPORA-002'),
--   ('TEMPORA-003')
-- on conflict (code) do nothing;
