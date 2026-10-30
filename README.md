# سلامت‌بان — نسخه ۵.۰

نسخه آنلاین بیمار: https://ourgemeniprostudent-png.github.io/salamatban/next/?v=5.0.0
ورود پزشک و کارشناس: https://ourgemeniprostudent-png.github.io/salamatban/next/?staff=1&v=5.0.0

ورود خلوت، شش سوال، انتخاب پزشک و وقت، پرداخت نمایشی همان جلسه و داشبورد شخصی بیمار. داشبورد شامل قدم بعد، مسیرهای فعال و تمام شده، مدارک، پرونده پزشکی، داروها، پروفایل و پزشک همراه است. چهار نوع خدمت با چک لیست قابل تیک زدن کارشناس، تایید واقعی نقش بیمار و بررسی نقش پزشک به هم متصل اند. طراحی پزشک حفظ شده و انتخاب نوع مسیر به فرم آن افزوده شده است.

مریم کیانی نمونه کامل با شش جلسه، نه مسیر و هفت فایل ساختگی است. داده قبلی خودکار جایگزین نمی‌شود؛ برای دریافت نمونه جدید از گزینه مشخص بازیابی نمونه مریم استفاده کنید. سارا و نرگس برای آزمون مسیر از ابتدا هستند. ریست هر بیمار مستقل و ذخیره فقط در همان مرورگر است. درگاه بانک، پیامک و تماس واقعی فعال نیستند. اصلاح حجم از محدوده این تحویل خارج است.

- [راهنمای جاری و حساب ها](site/journey/README-fa.md)
- [معماری و قرارداد داده](site/journey/architecture-fa.md)
- سورس فعال: site/journey
- ساخت: python3 site/journey/build.py
- اجرای محلی: python3 -m http.server 4182 --directory site/dist-journey
- آزمون ها: browser.test.mjs، workflow.test.mjs، physician.test.mjs، coordinator.test.mjs و v5.test.mjs در site/journey؛ JOURNEY_TEST_URL مبدا آزمون را مشخص می‌کند. Playwright و Chromium لازم اند.
- ساخت بسته: python3 scripts/package_journey_v4.py
- انتشار: python3 scripts/publish_journey_v4.py

نسخه قدیمی ریشه، پیش نمایش مستقل و آرشیو /salamatban/archive/v3.5.0-next.1/ حفظ شده اند. site/next و reference-docs مراجع تاریخی نسخه های پیشین اند؛ برنامه جاری نیستند.
