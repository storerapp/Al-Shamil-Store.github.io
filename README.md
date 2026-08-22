# Al-Shamil Vault — Final Render V10

نسخة نهائية مهيأة لـRender + PostgreSQL + تذاكر + سحب عشوائي + مخزون + لوحة إدارة + Provisioning Pterodactyl.

**الإعداد المختار:**
- Egg ID = 15
- Location ID = 1
- Panel provisioning مغلق افتراضيًا حتى لا يستخدم رابطًا وهميًا.

## تشغيل Render
Blueprint: `render.yaml`
- Web: Node.js
- Postgres: Render PostgreSQL
- Migration: `npm run migrate`
- Start: `npm start`
- Health: `/health`

## تفعيل Pterodactyl
بعد وضع رابط Panel الحقيقي وAPI key في Render:
`PANEL_ENABLED=true`

لا تضع API key داخل GitHub.

راجع `GO_LIVE.md` قبل فتح المسابقة.
