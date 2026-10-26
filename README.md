# سلامت‌بان — نسخه ۴.۳

مسیر جاری: https://ourgemeniprostudent-png.github.io/salamatban/next/

ورود خلوت با سه حساب نمونه، شش سوال کوتاه، انتخاب پزشک و وقت در ۱۴ روز آینده، سپس خانه کاربر و مدارک اختیاری. پاسخ‌ها، مرحله، وقت و مدارک هر حساب در همان مرورگر ذخیره می‌شوند. ریست فقط کاربر جاری را پاک می‌کند. این نسخه احراز هویت، تماس یا ارسال مدارک واقعی ندارد.

- [راهنمای تجربه و اجرا](site/journey/README-fa.md)
- [معماری و مدل ذخیره](site/journey/architecture-fa.md)
- سورس فعال نسخه ۴: `site/journey/`
- ساخت: `python3 site/journey/build.py`
- اجرای محلی: `python3 -m http.server 4180 --directory site/dist-journey`
- آزمون: `node site/journey/browser.test.mjs` و `node site/journey/workflow.test.mjs` و `node site/journey/physician.test.mjs` و `node site/journey/coordinator.test.mjs` (نیازمند نصب وابستگی‌های site و Chromium)
- ساخت بسته کامل: `python3 scripts/package_journey_v4.py`
- انتشار مسیر next: `python3 scripts/publish_journey_v4.py`

میزکار پزشک و کارشناس در نسخه ۴.۳ از مسیر /next/?staff=1 به پرونده همین کاربران وصل است. بیمار پیش از جلسه فیلدی برای نوشتن موضوع یا شرح حال ندارد.

نسخه قدیمی ریشه سایت محفوظ است. نسخه قبلی next در `/salamatban/archive/v3.5.0-next.1/` حفظ می‌شود. سورس `site/next/`، آزمون‌های `test:next`، سرور نمونه پیشین و سایر اسناد قدیمی، مراجع نسخه ۳ هستند؛ راهنمای نسخه جاری محسوب نمی‌شوند. ساخت قدیمی با `npm run build:next:legacy` انجام می‌شود. [معرفی قبلی](reference-docs/README-before-v4.md) برای رجوع نگهداری شده است.

داشبورد پزشک با نمای امروز، پرونده، بررسی سند، تقویم و پروفایل پیاده شده است. مریم کیانی پرونده کامل ساختگی دارد؛ داده قبلی او خودکار جایگزین نمی‌شود. راهنمای بازیابی نمونه در راهنمای نسخه آمده است. داشبورد کارشناس با صف کارها، فیلترهای واقعی، جستجو و مسیر شش مرحله ای پیاده شده است. لینک کوچک پایین هر فرم ورود، فرم نقش دیگر را باز می‌کند.
