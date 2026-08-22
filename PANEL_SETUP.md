# ربط Panel تلقائيًا

هذا التكامل مبني على **Pterodactyl Application API**.

## المتغيرات المطلوبة في Render

- `PANEL_URL` = رابط لوحة Pterodactyl بدون `/` في النهاية.
- `PANEL_PUBLIC_URL` = الرابط الذي سيراه العميل.
- `PANEL_API_KEY` = Application API token بصلاحيات إنشاء المستخدمين والسيرفرات.
- `PANEL_EGG_ID` = Egg ID الذي سيستخدم لإنشاء السيرفر.
- `PANEL_NEST_ID` = Nest ID المرجعي.
- `PANEL_LOCATION_ID` = Location ID للتوزيع التلقائي.
- `PANEL_EMAIL_DOMAIN` = نطاق البريد الذي سيُنشأ به مستخدم الفائز، مثل `clients.example.com`.
- `PANEL_DOCKER_IMAGE` و `PANEL_STARTUP` = اختياريان إذا أردت فرضهما بدل إعدادات Egg.
- `PANEL_ENVIRONMENT_JSON` = متغيرات الـEgg بصيغة JSON إذا كان الـEgg يحتاجها.

## كيف يعمل

بعد السحب:
1. الفائز يسجل داخل PostgreSQL.
2. المخزون يُخصم.
3. يتم إنشاء `provision_job`.
4. عامل الخلفية يحاول إنشاء مستخدم Panel.
5. إذا لم يوجد، ينشئ المستخدم عبر `/api/application/users`.
6. ينشئ السيرفر عبر `/api/application/servers`.
7. يستخدم `external_id=shamil-<winner-id>` لمنع إنشاء نفس السيرفر مرتين.
8. يحفظ `panel_user_id`, `panel_server_id`, `panel_identifier`, `panel_url`.
9. في حال فشل Panel، يعاد المحاولة حتى 5 مرات ثم يصبح `failed`.

Pterodactyl Application API يعتمد Bearer token لإنشاء المستخدمين والسيرفرات، ويدعم `external_id` والتوزيع التلقائي عبر `deploy.locations`. citeturn388141search0turn388141search1turn807503search0

## نقطة مهمة
يجب أن يكون الـEgg موجودًا ويقبل متغيراته، وأن يكون الـNode/Location لديه allocations صالحة؛ Pterodactyl يعتمد على الـNodes/Wings لتشغيل السيرفر فعليًا. citeturn859945search7turn859945search5
