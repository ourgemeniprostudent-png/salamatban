"""Self-contained, file-friendly entrance to the complete delivery."""
import base64
import html
from delivery_docs import VERSION, APP_VERSION, DOCS, page

ICONS={
 'arrow':'<path d="M20 12H4m6-6-6 6 6 6"/>',
 'book':'<path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/>',
 'code':'<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
 'route':'<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M9 5h7a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h7"/>',
 'file':'<path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 12h8m-8 4h6"/>',
 'doctor':'<path d="M5 3v6a5 5 0 0 0 10 0V3M3 3h4m6 0h4M10 14v2a5 5 0 0 0 10 0v-3"/><circle cx="20" cy="10" r="2"/>',
 'check':'<path d="m5 12 4 4L19 6"/>',
 'download':'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 'monitor':'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
 'chevron':'<path d="m6 9 6 6 6-6"/>',
}
def icon(name):return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[name]+'</svg>'
def fa(s):return s.translate(str.maketrans('0123456789.','۰۱۲۳۴۵۶۷۸۹٫'))
def render(root):
 fonts=''.join('@font-face{font-family:Peyda;font-weight:'+weight+';font-display:swap;src:url(data:font/woff2;base64,'+base64.b64encode((root/'site/public/fonts'/f'PeydaWebFaNum-{name}.woff2').read_bytes()).decode()+')}' for name,weight in [('Regular','400'),('Bold','700')])
 css=fonts+(root/'scripts/delivery-template/landing.css').read_text()
 mark=(root/'site/public/brand/symbol.svg').read_text()
 # The existing brand SVG is trusted local artwork, not generated clinical content.
 brand='<span class="brand-mark">'+mark+'</span><span class="brand-name">سلامت‌بان<small>همراه مسیر مراقبت</small></span>'
 doc='documents/Salamatban-Complete-Guide-fa.html'
 body='''<a class="skip" href="#start">رفتن به محتوای اصلی</a><div class="shell">'''
 body+=f'<header><a class="brand" href="index.html" aria-label="سلامت‌بان، صفحهٔ شروع">{brand}</a><div class="header-meta"><span class="edition">بستهٔ {fa(VERSION)}</span><a href="#resources">راهنماها {icon("arrow")}</a></div></header>'
 body+='<section class="hero" id="start"><div class="hero-copy"><p class="eyebrow"><span></span>به سلامت‌بان خوش آمدید</p><h1>مراقبت از سلامت،<br><em>با یک مسیر روشن.</em></h1><p class="lead">از تجربهٔ محصول شروع کنید.<br>راهنماها و ابزارهای ادامهٔ مسیر، همین‌جا در دسترس‌اند.</p>'
 body+=f'<div class="hero-actions"><a class="button primary" href="https://ourgemeniprostudent-png.github.io/salamatban/?v={APP_VERSION}">مشاهدهٔ سایت {icon("arrow")}</a><a class="button secondary" href="{doc}">{icon("book")} خواندن راهنما</a></div><p class="micro">نسخهٔ نمایشی · بدون نصب · با حساب‌های ساختگی</p></div>'
 body+='<aside class="journey" aria-label="مسیر کار در سلامت‌بان"><div class="journey-top"><span>از شناخت تا پیگیری</span><span class="path-label">مسیر مراقبت</span></div><h2>هر قدم،<br>با همراهی مشخص.</h2><ol class="steps">'
 for number,title,desc,ico in [('۰۱','شناخت وضعیت شما','تشکیل پرونده و ثبت اطلاعات','file'),('۰۲','بررسی پزشک','بررسی پرونده و تدوین برنامه','doctor'),('۰۳','پیگیری و هماهنگی','همراهی کارشناس در انجام اقدام‌ها','check')]:
  body+=f'<li><span class="step-icon">{icon(ico)}</span><div><strong>{title}</strong><small>{desc}</small></div><span class="step-no">{number}</span></li>'
 body+='</ol><p class="journey-foot">شما، پزشک و کارشناس؛ در یک مسیر مشترک</p></aside></section>'
 body+='<section class="resources" id="resources"><div class="section-heading"><div><p class="eyebrow">همه‌چیز در جای خودش</p><h2>برای قدم بعدی شما</h2></div><a class="text-link" href="documents/Salamatban-Complete-Guide-fa.pdf">دریافت راهنمای PDF '+icon('download')+'</a></div><div class="resource-grid">'
 cards=[('book','آشنایی با محصول','قابلیت‌ها، مسیر نقش‌ها و راهنمای استفاده از نسخهٔ نمایشی.',doc+'#doc-1','مرور محصول'),('code','توسعه و تحویل فنی','معماری، اجرای سورس، مدل داده و راهنمای شروع توسعه.',doc+'#doc-5','راهنمای برنامه‌نویس'),('route','آمادگی راه‌اندازی','کارهای باقی‌مانده، منابع موردنیاز و چک‌لیست خدمت واقعی.',doc+'#doc-7','برنامهٔ راه‌اندازی')]
 for ico,title,desc,url,action in cards:
  body+=f'<a class="resource-card" href="{url}"><span class="card-icon">{icon(ico)}</span><h3>{title}</h3><p>{desc}</p><span class="card-action">{action} {icon("arrow")}</span></a>'
 body+='</div></section><section class="utilities" aria-label="گزینه‌های بیشتر">'
 body+='<details><summary><span class="utility-icon">'+icon('monitor')+'</span><span><strong>اجرای نسخهٔ داخل بسته</strong><small>برای نمایش روی رایانهٔ خودتان</small></span>'+icon('chevron')+'</summary><div class="detail-body"><p>همهٔ ZIP را استخراج کنید. برای اجرای محلی، Python 3 باید نصب باشد. اجراگر مناسب دستگاهتان را باز کنید و پنجرهٔ آن را باز نگه دارید.</p><div class="local-actions"><a class="button secondary" href="Start-Mac-Linux.command">اجراگر مک / لینوکس</a><a class="button secondary" href="Start-Windows.cmd">اجراگر ویندوز</a></div><p>در مک می‌توانید در ترمینالِ پوشهٔ بسته این فرمان را اجرا کنید:</p><code class="command">python3 serve-demo.py</code><p>اگر اجراگر از مرورگر باز نشد، آن را در پوشهٔ استخراج‌شده پیدا کنید. <a href="website/index.html">ورودی محلی سایت</a> هم روش اجرا را توضیح می‌دهد. نقشه و جست‌وجوی مکان اینترنت می‌خواهند؛ فرم و آدرس دستی محلی‌اند.</p></div></details>'
 body+='<details><summary><span class="utility-icon">'+icon('doctor')+'</span><span><strong>حساب‌های نمونه برای بررسی نقش‌ها</strong><small>عضو، پزشک، کارشناس و مدیر</small></span>'+icon('chevron')+'</summary><div class="detail-body"><p>در صفحهٔ ورود سایت، یک حساب ساختگی انتخاب کنید؛ کد نمایشی پس از درخواست روی صفحه نشان داده می‌شود.</p><div class="accounts">'
 for role,phone in [('عضو','09000000001'),('پزشک','09000000011'),('کارشناس','09000000012'),('مدیر','09000000013')]:body+=f'<div><span>{role}</span><bdi>{phone}</bdi></div>'
 body+='</div><p>برای دیدن همان پرونده، در <strong>همان مرورگر</strong> حساب را تغییر دهید؛ دادهٔ نمایشی بین دستگاه‌ها مشترک نیست. اطلاعات واقعی پزشکی یا بانکی وارد نکنید.</p></div></details>'
 body+='<details><summary><span class="utility-icon">'+icon('file')+'</span><span><strong>فهرست کامل اسناد و منابع</strong><small>دسترسی مستقیم به همهٔ فصل‌ها و فایل‌های مرجع</small></span>'+icon('chevron')+'</summary><div class="detail-body"><div class="all-docs">'
 for i,n in enumerate(DOCS):
  title=(root/'deliverables'/n).read_text().splitlines()[0].lstrip('# ')
  body+=f'<div><a href="{doc}#doc-{i}">{html.escape(title)}</a><a class="source-link" href="technical/{n}" aria-label="فایل منبع {html.escape(title)}">فایل منبع</a></div>'
 body+='</div><p><a href="technical/launch-readiness-register.csv">کاربرگ آمادگی</a> · <a href="technical/launch-budget.csv">کاربرگ بودجه</a> · <a href="website/brand/index.html">راهنمای هویت بصری</a> · <a href="documents/Salamatban-Visual-Identity.pdf">PDF هویت</a></p></div></details></section>'
 body+=f'<footer><span>سلامت‌بان <span class="footer-dot">·</span> مراقبت آگاهانه، پیگیری پیوسته</span><span>بستهٔ {fa(VERSION)} <span class="footer-dot">/</span> برنامهٔ {fa(APP_VERSION)}</span></footer></div>'
 return page('سلامت‌بان | از اینجا شروع کنید',body,css).replace('<main>','<main class="page-root">')
