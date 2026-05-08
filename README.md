# Plantilla - Landing de promocion con QR

Base estatica para GitHub Pages con backend en Supabase:

- landing publica con acceso por QR
- validacion de codigo antes del formulario
- registro unico por codigo
- panel administrativo con autenticacion
- canje manual desde admin
- correo de confirmacion opcional por Edge Function
- copy, fechas y validaciones centralizadas en `campaign_settings`

## Estructura

- `index.html`: landing publica
- `admin.html`: panel administrador
- `styles.css`: identidad visual base
- `app.js`: flujo del participante
- `admin.js`: flujo del administrador
- `config.js`: conexion publica a Supabase y fallback local
- `config.example.js`: ejemplo para un nuevo despliegue
- `scripts/build-site.mjs`: genera el `site/` para GitHub Pages usando secretos del repo
- `supabase/schema.sql`: schema base para un proyecto Supabase nuevo
- `supabase/setup.template.sql`: script base para personalizar campana, admins y codigos
- `supabase/config.toml`: configuracion de Edge Functions
- `supabase/functions/send-claim-email/index.ts`: correo de confirmacion
- `supabase/functions/send-claim-email/google-apps-script.gs`: opcion Gmail sin dominio propio
- `assets/brand-logo.svg`: logo placeholder de la plantilla

## Como quedo la plantilla

### 1. Frontend

- ya no depende de la marca anterior
- usa `config.js` como fallback local
- si Supabase esta configurado, carga `campaign_settings` y renderiza:
  - marca
  - fechas
  - textos principales
  - terminos
  - reglas de validacion

### 2. Backend

- `campaign_settings` reemplaza fechas y textos quemados
- el identificador del participante ya no esta amarrado a DUI
- WhatsApp ya no esta amarrado a `+503`
- `claim_promotion` devuelve un `notification_dispatch_key` de un solo uso
- la Edge Function exige `claimId + notificationDispatchKey`
- GitHub Pages puede tomar la conexion a Supabase desde secretos del repo

## Paso 1 - Configurar `config.js`

Completa estos valores:

```js
export const appConfig = {
  supabaseUrl: "https://TU_PROYECTO.supabase.co",
  supabasePublishableKey: "TU_SUPABASE_PUBLISHABLE_KEY_PUBLICA",
  supabaseAnonKey: "TU_SUPABASE_ANON_KEY_PUBLICA",
  notificationFunctionName: "send-claim-email",
  brand: {
    name: "Tu Negocio",
    logoPath: "./assets/brand-logo.svg",
  },
};
```

Notas:

- Supabase recomienda usar una `publishable key` (`sb_publishable_...`) para clientes publicos
- el campo `supabaseAnonKey` sigue existiendo por compatibilidad si quieres usar la clave legacy
- si cambias el logo, puedes reemplazar `assets/brand-logo.svg` o apuntar `logoPath` a otro archivo
- `config.js` sirve como fallback; la configuracion real de campana vive en Supabase
- si vas a desplegar con GitHub Actions, no necesitas commitear aqui la clave real

## Paso 2 - Crear el nuevo proyecto Supabase

1. Crea un proyecto nuevo en la otra organizacion de Supabase.
2. Ejecuta completo `supabase/schema.sql` en `SQL Editor`.
3. Habilita `Email` en `Authentication > Providers`.
4. Crea el usuario administrador en `Authentication > Users`.
5. Autoriza ese correo dentro de `public.admin_users`.
6. Copia el `Project URL` y tu `publishable key` desde el dialogo `Connect` o desde `Settings > API Keys`.

Ejemplo:

```sql
insert into public.admin_users (email)
values ('admin@tunegocio.com');
```

## Paso 3 - Ajustar `campaign_settings`

La tabla `campaign_settings` queda con una fila unica. Actualizala para tu negocio.
Si quieres arrancar mas rapido, puedes editar y ejecutar `supabase/setup.template.sql`.

Ejemplo:

```sql
update public.campaign_settings
set
  brand_name = 'Mi Negocio',
  meta_description = 'Landing para registrar participantes de la promocion de Mi Negocio.',
  admin_email_placeholder = 'admin@minegocio.com',
  locale = 'es-MX',
  time_zone = 'America/Mexico_City',
  registration_deadline_at = '2026-06-30 23:59:59-06',
  redemption_deadline_at = '2026-07-15 23:59:59-06',
  intro_kicker = 'Promocion exclusiva',
  intro_title = 'Sorpresa',
  intro_copy = 'Hay un beneficio reservado para ti.',
  hero_eyebrow = 'Beneficio activado por QR',
  hero_title_prefix = 'Sorpresa, te has ganado',
  hero_title_highlight = '15% de descuento en tu siguiente compra',
  hero_body = 'Valida la clave de tu QR y completa tu registro para reservar el beneficio.',
  offer_title = '15% de descuento',
  offer_description = 'Completa tu registro para reservarlo.',
  registration_section_title = 'Vamos a revisar que tu codigo QR sea valido.',
  registration_closed_title = 'Proceso de registro para canjear beneficio.',
  code_validation_title = 'Valida tu QR',
  form_section_title = 'Completa tus datos',
  success_title = 'Tu beneficio ya quedo reservado.',
  terms_section_title = 'Condiciones oficiales de la promocion.',
  terms_modal_intro = 'Revisa las condiciones antes de confirmar tu registro.',
  footer_note = 'Promocion vigente hasta la fecha de canje publicada.',
  participant_identifier_label = 'RFC',
  participant_identifier_placeholder = 'ABCD010203EF4',
  participant_identifier_pattern = '^[A-Z0-9]{12,13}$',
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
```

## Paso 4 - Cargar codigos QR

```sql
insert into public.promo_codes (code)
values
  ('PROMO-2026-001'),
  ('PROMO-2026-002'),
  ('PROMO-2026-003');
```

La landing espera un QR o enlace como este:

```text
https://tu-usuario.github.io/tu-repo/?code=PROMO-2026-001
```

## Paso 5 - Correo de confirmacion

La landing invoca la Edge Function `send-claim-email` despues de un registro exitoso.

### Opcion A - Gmail con Google Apps Script

1. Crea un proyecto en `script.google.com`.
2. Copia `supabase/functions/send-claim-email/google-apps-script.gs`.
3. Reemplaza `WEBHOOK_SECRET`.
4. Despliega como `Web app`.
5. Guarda la URL publicada.
6. En `Supabase > Edge Functions > Secrets`, crea:

```text
GOOGLE_APPS_SCRIPT_WEBHOOK_URL=tu_url_publicada
GOOGLE_APPS_SCRIPT_SHARED_SECRET=el_mismo_secreto
```

### Opcion B - Resend

```text
RESEND_API_KEY=tu_api_key
CLAIM_EMAIL_FROM=Promociones <promos@tudominio.com>
```

### Despliegue de la funcion

Si tienes Supabase CLI:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy send-claim-email
```

La funcion toma:

- `claimId`
- `notificationDispatchKey`

Y solo envia el correo si ambos coinciden con el registro que acaba de crearse.

Si prefieres dejarlo automatizado desde GitHub, el repo ya incluye:

- `.github/workflows/deploy-supabase-functions.yml`
- `supabase/config.toml`

Secretos que necesita ese workflow:

```text
SUPABASE_ACCESS_TOKEN=tu_token_personal_de_supabase
SUPABASE_PROJECT_ID=tu_project_ref
```

## Paso 6 - GitHub Pages

1. Sube el repo al nuevo GitHub.
2. Usa `main` como rama principal.
3. En `Settings > Secrets and variables > Actions`, crea estos secretos del repo:

```text
PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Si sigues usando la clave legacy, puedes usar:

```text
PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

Variable opcional del repo:

```text
PUBLIC_NOTIFICATION_FUNCTION_NAME=send-claim-email
```

4. En `Settings > Pages > Build and deployment`, selecciona `GitHub Actions`.
5. El workflow `deploy.yml` generara `site/config.js` con esos secretos y publicara el sitio.
6. Cuando hagas push a `main`, GitHub Pages se desplegara; si cambias Edge Functions, tambien correra `deploy-supabase-functions.yml`.

## Checklist de salida

- `config.js` apunta al Supabase nuevo
- GitHub tiene `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `campaign_settings` ya fue personalizado
- `promo_codes` ya tiene codigos
- `admin_users` ya tiene los correos autorizados
- la Edge Function ya esta desplegada
- se probo un QR libre
- se probo el mismo QR por segunda vez y quedo bloqueado
- se probo el login admin
- se probo marcar un beneficio como canjeado

## Alcance de este schema

Este `schema.sql` esta pensado para un proyecto Supabase nuevo.
Si quieres migrar un proyecto viejo que ya tenia las columnas `dui` y la version anterior del flujo,
conviene hacer una migracion aparte en lugar de ejecutar esta plantilla sobre esa base existente.
