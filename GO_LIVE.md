# V10 Go-Live Checklist

## مثبتات المشروع
- Egg ID: **15**
- Location ID: **1**
- Panel provisioning: **مغلق بأمان** حتى إدخال لوحة حقيقية.
- PostgreSQL: مطلوب.
- السحب العشوائي + خصم المخزون + التذكرة + الفائز: على الخادم.

## قبل فتح المسابقة
1. في Render غيّر:
   `PANEL_ENABLED=true`
2. استبدل:
   `PANEL_URL=https://panel.example.com`
   برابط لوحة Pterodactyl الحقيقي.
3. ضع `PANEL_API_KEY` داخل Render Secret.
4. اترك:
   `PANEL_EGG_ID=15`
   `PANEL_LOCATION_ID=1`
   ما لم تكن تريد تغييرهما.
5. تحقق أن الـEgg 15 صالح للـNest الذي سيستخدمه، وأن Location 1 لديه Node/allocations/Wings جاهزة.
6. أضف مخزون 12/6/3 من لوحة الإدارة.
7. اختبر فائزًا واحدًا فقط.
8. راقب قسم **التسليم التلقائي** في `/admin.html`.
9. لا تبدأ المسابقة العامة حتى تظهر حالة Panel `provisioned` في اختبار ناجح.

Pterodactyl يتطلب Node يعمل عليه Wings وموارد/allocations صالحة للسيرفرات. citeturn742747search2turn742747search5
