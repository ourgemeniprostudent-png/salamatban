# سند تاریخی اتصال جست‌وجوی نشان — نامزد ۲٫۳٫۱

**این سند تاریخی است و راهنمای اتصال نسخهٔ جاری نیست.** از نسخهٔ ۲٫۳٫۲، بنا بر انتخاب صاحب محصول، منبع جست‌وجو/دادهٔ مراکز به Geoapify تغییر کرده و نشان برای بازکردن مقصد و مسیریابی حفظ شده است. برای وضعیت فعلی، [راهنمای Geoapify](GEOAPIFY-INTEGRATION-fa.md) را بخوانید. جزئیات زیر وضعیت نامزد ۲٫۳٫۱ در زمان ثبت سند را توضیح می‌دهند؛ فعال‌سازی سرویس نشان انجام نشده بود.

بسته و برنامهٔ داخل آن **۲٫۳٫۱** است؛ سایت عمومی هنوز **۲٫۳** است. کد جست‌وجوی نشان و لینک نقطه آماده شده، اما **کلید سرویس، gateway مستقر و تأیید پاسخ زندهٔ احرازشده نداریم**. حالت پیش‌فرض برنامه «فهرست نشان در این نسخه هنوز متصل نشده است» را نشان می‌دهد؛ نتیجهٔ ساختگی یا بازگشت خاموش به ارائه‌دهندهٔ قبلی ندارد. این راهنما دستور انتشار انجام‌شده یا گواه آماده‌بودن سرویس نیست.

## محدودهٔ تغییر

جست‌وجوی بیمارستان و درمانگاه در راهنمای کمک فوری و لینک‌های همان راهنما برای نشان آماده شده‌اند. درخواست مرکز فقط شهر/شهرستان/استان یا شناسهٔ کاتالوگ را می‌پذیرد؛ نشانی دقیق عضو، پاسخ پزشکی، هویت و موقعیت دستگاه وارد آن نمی‌شوند. دریافت اختیاری موقعیت، تنها با دکمه و مجوز مرورگر انجام می‌شود؛ فقط بازکردن لینک نقطه، آن موقعیت را به نشان می‌فرستد.

نقشهٔ **انتخاب نشانی خدمت در محل** همچنان Leaflet/OpenStreetMap و Nominatim است؛ این بسته ادعا نمی‌کند همهٔ نقشه‌های سامانه به نشان منتقل شده‌اند. تماس با ۱۱۵ و متن راهنمای علائم به فعال‌بودن نقشه وابسته نیستند.

## مسیر اجرا و تنظیمات

مرورگر → `GET /api/maps/hospitals` روی gateway → Geocoding نشان برای مرکز شهر → جست‌وجوی «بیمارستان» و «درمانگاه» پیرامون آن مرکز. مرکز شهر، مبدأ مسیر بیمار نیست.

Worker مستقل در [maps-worker/index.ts](../source/site/maps-worker/index.ts) از همان handler سروری استفاده می‌کند؛ لازم نیست برنامهٔ پزشکی و پایگاه پرونده‌ها را برای این gateway منتشر کنید. [پیکربندی نمونه](../source/site/wrangler.maps.example.jsonc) و [مهاجرت تک‌جدولی](../source/site/maps-worker/migrations/0001_maps_rate_limits.sql) همراه سورس‌اند. مسیر موجود Vinext در `site/app/api/maps/hospitals/route.ts` نیز از همان قرارداد استفاده می‌کند؛ مسیر پیشنهادی برای سایت استاتیک، Worker مستقل است.

| تنظیم | محل | کاربرد |
|---|---|---|
| `NESHAN_API_KEY` | Secret سرور Worker | کلید مجاز برای سرویس‌های Search و Geocoding؛ هرگز داخل مرورگر، Git یا ZIP قرار نمی‌گیرد |
| `DB` | binding یک D1 مستقل | جدول `pilot_rate_limits` برای محدودسازی مشترک درخواست‌ها؛ هیچ جدول پروندهٔ پزشکی لازم نیست |
| `NESHAN_RATE_LIMIT_SECRET` | Secret اختیاری سرور | کلید مستقل HMAC برای شناسهٔ محدودسازی IP؛ اگر تنظیم نشود از کلید سرویس استفاده می‌شود |
| `NESHAN_ALLOWED_ORIGINS` | متغیر غیرمحرمانهٔ Worker | originهای دقیق و جداشده با ویرگول؛ بدون مسیر یا wildcard. دامنهٔ خود gateway و `https://ourgemeniprostudent-png.github.io` از ابتدا مجازند |
| `SALAMATBAN_MAPS_GATEWAY_URL` | فقط هنگام ساخت دموی استاتیک | نشانی عمومی HTTPS با مسیر دقیق `/api/maps/hospitals`؛ بدون query، fragment یا نام کاربری/رمز. این متغیر کلید API نیست |

سقف‌های فعلی gateway: ۱۲ درخواست برای هر IP در دقیقه، ۱۲۰ درخواست کل در دقیقه و ۲۰۰۰ درخواست کل در روز. هر lookup می‌تواند یک Geocoding و دو Search مصرف کند؛ سقف gateway معادل سقف تعداد فراخوانی حساب نشان نیست. نبود کلید، D1 یا جدول محدودکننده با `503 NESHAN_NOT_CONFIGURED` متوقف می‌شود؛ CORS به‌تنهایی محافظ سهمیه نیست.

## آماده‌سازی و استقرار gateway

فرمان‌ها از پوشهٔ `site/` اجرا می‌شوند. حساب Cloudflare، نام Worker، شناسهٔ D1 واقعی و کلید نشان باید از حساب مالک فراهم شوند؛ مقدار UUID داخل فایل نمونه فقط جای‌نگهدار است. فرمان‌های `--remote`، `secret put` و `deploy` تغییر بیرونی ایجاد می‌کنند و در این تحویل اجرا نشده‌اند.

```sh
npm ci
cp wrangler.maps.example.jsonc wrangler.maps.local.jsonc
npx wrangler d1 create salamatban-maps-rate-limits
```

شناسهٔ برگشتی D1 را در `database_id` فایل محلی قرار دهید؛ binding باید `DB` و مسیر migrations همان `maps-worker/migrations` بماند. در صورت نیاز نام Worker و originهای مجاز را برای مقصد واقعی تنظیم کنید. فایل محلیِ تنظیمات و secretها را به مخزن یا بسته اضافه نکنید.

```sh
npx wrangler d1 migrations apply DB --remote --config wrangler.maps.local.jsonc
npx wrangler secret put NESHAN_API_KEY --config wrangler.maps.local.jsonc
npx wrangler secret put NESHAN_RATE_LIMIT_SECRET --config wrangler.maps.local.jsonc
npx wrangler deploy --config wrangler.maps.local.jsonc
```

فرمان secret دوم اختیاری است؛ مقدار secret را در ورودی تعاملی وارد کنید، نه آرگومان فرمان یا متغیر عمومی build. خروجی deploy، hostname واقعی Worker را می‌دهد؛ هنوز هیچ hostname فعال برای این بسته ثبت نشده است. برای اجرای محلی، همان migrations را با `--local` اعمال و `npx wrangler dev --config wrangler.maps.local.jsonc` را اجرا کنید؛ secret محلی فقط در `.dev.vars` نادیده‌گرفته‌شده نگهداری شود.

## تأیید اتصال و ساخت برنامه

ابتدا با یک شهر ساختگی/غیرشخصی مانند `cityId=ir-tehran`، پاسخ endpoint مستقر را بررسی کنید. خطای نبود پیکربندی، خطای سرویس، نتیجهٔ خالی و پاسخ معتبر باید از هم متمایز باشند. درخواست را از origin مجاز سایت نیز بررسی کنید؛ یک آزمون Node یا پاسخ mock برای تأیید CORS مرورگر و دسترسی واقعی کافی نیست.

پس از تطبیق پاسخ احرازشدهٔ واقعی با آداپتر، نشانی عمومی Worker را هنگام ساخت وارد کنید؛ hostname زیر نمونه است و باید با نشانی واقعی جایگزین شود:

```sh
SALAMATBAN_MAPS_GATEWAY_URL=https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/api/maps/hospitals npm run build:demo
```

در `dist-demo/release.json`، بخش `maps` مقصد build و وضعیت پیکربندی را ثبت می‌کند. `gatewayConfigured: true` فقط وجود تنظیم build را نشان می‌دهد، نه صحت کلید، استقرار gateway یا تأیید زندهٔ سرویس. بدون این متغیر، دموی بسته endpoint نشان را درخواست نمی‌کند و همان وضعیت پیکربندی‌نشده را نشان می‌دهد. پس از آزمون واقعی، سایت و بسته را دوباره با نسخه و شواهد هماهنگ منتشر کنید؛ ZIP یا GitHub Pages به‌تنهایی کد Worker را اجرا نمی‌کنند.

## قرارداد فعلی و چیزهای تأییدنشده

آداپتر از `GET /geocoding/v1?json=…` و شکل قدیمی `GET /v1/search?lat=…&lng=…&term=…` استفاده می‌کند. این انتخاب از نمونه‌های رسمی بررسی‌شده آمده است؛ دسترسی فعلی حساب، سقف و شکل کامل پاسخ واقعی هنوز تأیید نشده‌اند. سرویس جاری v3 نیز وجود دارد، اما قرارداد کامل پاسخ و دسته‌بندی پزشکی آن در شواهد موجود احراز نشده است. پاسخ با شکل ناشناخته خطا می‌دهد و به فهرست خالی تبدیل نمی‌شود.

تطبیق واژهٔ بیمارستان/درمانگاه در نام نتیجه، **تأیید دسته‌بندی پزشکی** نیست. هیچ نتیجه‌ای به‌عنوان نزدیک‌ترین، باز، دارای ظرفیت اورژانس یا مناسب وضعیت فرد تضمین نمی‌شود. شمارهٔ تلفن یا مرکز ساختگی نیز تولید نمی‌شود.

قالب رسمی لینک نقطه `https://nshn.ir/?lat=…&lng=…` است؛ لینک فقط نقطه را نشان می‌دهد. مبدأ مسیر را کاربر در نشان انتخاب می‌کند؛ مرکز شهر جای مبدأ شخص قرار نمی‌گیرد. رفتار لینک و مسیریابی روی دستگاه واقعی هنوز بررسی نشده است.

منابع بررسی‌شده، کد رسمیِ پین‌شدهٔ نشان هستند: [احراز هویت Api-Key](https://github.com/NeshanMaps/Neshan-MCP/blob/99dd3518fbab13376a8c2ac2c4dcf60dfe04ae6c/src/neshan_mcp/services/base/neshanClient.py#L56)، [Geocoding و درخواست جاری](https://github.com/NeshanMaps/Neshan-MCP/blob/99dd3518fbab13376a8c2ac2c4dcf60dfe04ae6c/src/neshan_mcp/services/search/searchService.py#L13)، [نمونهٔ قدیمی Search v1](https://github.com/NeshanMaps/android-neshan-services-sdk/blob/6fc07b730af2a46b5dbac8247ad6b64449ab6406/servicessdk/src/main/java/org/neshan/servicessdk/search/NeshanSearch.java#L95) و [لینک نقطه و مسیر](https://github.com/NeshanMaps/Neshan-MCP/blob/99dd3518fbab13376a8c2ac2c4dcf60dfe04ae6c/src/neshan_mcp/utils/deeplinks.py#L19). دسترسی مستقیم این محیط به مستندات نشان با `Proxy CONNECT 403` مسدود بود؛ محدودیت دور زده نشده و فراخوانی زندهٔ احرازشده انجام نشده است.

شواهد جدید قرارداد/پیکربندی در `neshan-proxy-tests.json`، `maps-config-tests.json` و `neshan-readiness.json` از گزارش انتشار قابل پیگیری‌اند؛ نتیجهٔ واقعی هرکدام جدا ثبت می‌شود. `ux-baseline-v2.3.json` و دو گزارش قدیمی `facility-live-probe.json` و `facility-browser-probe.json` خط پایهٔ انتشار عمومی قبلی با OSM/Nominatim هستند، نه شواهد فعال‌بودن نشان.
