# نشر Al-Shamil Vault على Render

## الطريقة الموصى بها
هذا المشروع يحتوي على `render.yaml` جاهز كـ Blueprint.

1. ارفع محتويات المشروع إلى GitHub.
2. في Render اختر New → Blueprint.
3. اربط مستودع GitHub الذي يحتوي على `render.yaml`.
4. اختر الفرع `main`.
5. راجع الخدمة `al-shamil-vault`.
6. اسمح لـ Render بإنشاء الخدمة.
7. Render سيستخدم:
   - Build: `npm install`
   - Start: `npm start`
   - Health: `/health`
   - `ADMIN_KEY`: يتم توليده تلقائيًا.
8. بعد النشر افتح:
   `https://YOUR-SERVICE.onrender.com/`
9. لوحة التحكم:
   `https://YOUR-SERVICE.onrender.com/admin.html`

## مهم
النسخة الحالية تستخدم `data/control.json` للتجربة. لا تعتمد عليها كقاعدة بيانات دائمة لمسابقات حقيقية على Render. قبل فتح المسابقة للجمهور يجب نقل tickets/winners/inventory/draws إلى PostgreSQL واستخدام transaction + row locking.

## بعد ربط PostgreSQL
اجعل `DATABASE_URL` متغيرًا سريًا في Render، ولا تضع كلمة المرور أو أي secret داخل GitHub أو `render.yaml`.
