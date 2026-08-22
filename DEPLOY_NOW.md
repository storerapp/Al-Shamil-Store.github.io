# Al-Shamil Vault — Full Deployment

## 1. GitHub
Create an empty GitHub repository and upload the **contents of this package** (not the ZIP file).

## 2. Render
Render → New → Blueprint → choose the GitHub repository.

The repository contains `render.yaml`, which defines:
- Node Web Service
- PostgreSQL database
- migration before deploy
- production environment variables

## 3. Required Render secrets
Set these in Render Environment:

### Required
- `ADMIN_KEY` — generate a long random secret.
- `DATABASE_URL` — supplied automatically by Blueprint.

### Pterodactyl
The package is intentionally safe until these are provided:
- `PANEL_ENABLED=true`
- `PANEL_URL=https://YOUR-REAL-PANEL`
- `PANEL_PUBLIC_URL=https://YOUR-REAL-PANEL`
- `PANEL_API_KEY=...`
- `PANEL_EGG_ID=15`
- `PANEL_LOCATION_ID=1`
- `PANEL_EMAIL_DOMAIN=YOUR-DOMAIN`

Keep `PANEL_API_KEY` only in Render Secrets. Never commit it to GitHub.

## 4. First admin setup
Open:
`https://YOUR-RENDER-SERVICE.onrender.com/admin.html`

Use the `ADMIN_KEY`.

Add:
- inventory for 12 / 6 / 3 months
- available server inventory
- Panel configuration
- server metadata

## 5. Test before public launch
Perform exactly one test:
- issue a ticket
- perform a draw
- verify inventory goes down by 1
- verify winner appears in admin
- verify provision job appears
- verify Pterodactyl server is created
- verify WhatsApp claim message has winner + phone + prize + code

## 6. Production note
Do not launch publicly until the Pterodactyl Panel URL is real and the API key is configured. The placeholder domain is intentionally disabled by default.
