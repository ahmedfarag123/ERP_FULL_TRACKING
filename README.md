# Horeca Smart — Project Root (/srv/horecasmart)

كل مكونات المشروع موجودة هنا داخل هذا المجلد وحده.

## الهيكل
- apps/            — فرونت إند builds ثابتة (admin / driver / dispatcher / sales) → تتحط في apps/<app>/dist
- backend/         — القاعدة والـ API (self-hosted Supabase لما ننقل)
  - db/            — بيانات القاعدة (volumes)
  - migrations/    — schema.sql + data.sql (source of truth)
  - volumes/       — مساحات التخزين
- functions/       — مصدر الـ Edge Functions (18 فنكشن)
- proxy/           — nginx للمشروع (conf.d + ssl)
- scripts/         — deploy / backup / monitor
- data/backups/    — النسخ الاحتياطي
- logs/            — سجلات

## الحالة الحالية
- القاعدة والفنكشنات حالياً على Supabase cloud (wlxlcmvwujhwflyrrkol) — تحت الهجرة هنا.
- الفرونت حالياً على Vercel (horecasmart-dashboard-eta.vercel.app) — تحت النقل هنا.
- الـ Odoo على سيرفر مستقل (72.60.38.24) — لا يُلمس.
- CRM على VPS أودو — لا يُلمس.

## صلاحيات
- المجلد مملوك للمستخدم ubuntu.
