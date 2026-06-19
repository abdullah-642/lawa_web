# -*- coding: utf-8 -*-
"""Build services/areas.html (hub) + sitemap-locations.xml + refresh sitemap-index.xml."""
import os
from generate_locations import SERVICES, CITIES, SITE, ROOT

OUT = os.path.join(ROOT, "services")
TODAY = "2026-06-20"


def build_areas():
    # Grouped by city: each city lists all services
    by_city = []
    for ck, c in CITIES.items():
        cards = "\n".join(
            '          <a href="%s-%s.html" class="svc-related-card"><span class="rc-cat">%s</span><span class="rc-t">%s في %s</span></a>'
            % (sk, ck, s["label"], s["term"], c["ar"]) for sk, s in SERVICES.items())
        by_city.append(
            '      <h2 class="areas-city">%s</h2>\n      <div class="svc-related-grid">\n%s\n      </div>' % (c["ar"], cards))
    body = "\n\n".join(by_city)

    html = '''<!DOCTYPE html>
<html lang="ar" dir="rtl" data-lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>مناطق خدمة لواء كونسبت | تنفيذ سبا، كهف ملح، ديكور ومكاتب في الرياض وجدة والدمام</title>
  <meta name="description" content="مناطق خدمة شركة لواء كونسبت: تصميم وتنفيذ السبا، كهوف الملح، الحمامات المغربية، الصالونات، المكاتب، المطاعم والفلل في الرياض وجدة والدمام والخبر ومكة والمدينة." />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="%(site)s/services/areas.html" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="مناطق خدمة لواء كونسبت" />
  <meta property="og:url" content="%(site)s/services/areas.html" />
  <meta property="og:locale" content="ar_SA" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500;600&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../styles.css" />
  <link rel="stylesheet" href="../services.css" />
  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg" />
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"الرئيسية","item":"%(site)s/"},{"@type":"ListItem","position":2,"name":"مناطق الخدمة","item":"%(site)s/services/areas.html"}]}</script>
</head>
<body data-lang="ar">
  <header class="site-header" id="siteHeader">
    <a href="../index.html" class="brand"><img class="brand-img" src="../assets/logo.svg" alt="Liwa Concept Design" /></a>
    <nav class="nav" id="nav">
      <a href="../index.html#about">من نحن</a>
      <a href="../index.html#expertise">تخصصنا</a>
      <a href="areas.html">مناطق الخدمة</a>
      <a href="../blog.html">المدونة</a>
      <a href="../index.html#contact">تواصل</a>
    </nav>
    <div class="header-actions"><button class="menu-btn" id="menuBtn" aria-label="Menu"><span></span><span></span></button></div>
  </header>

  <main class="svc-page">
    <section class="svc-hero" style="min-height:auto">
      <div class="svc-hero-bg" style="background-image:url('https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1600&q=85')"></div>
      <div class="svc-hero-inner">
        <nav class="svc-breadcrumb" aria-label="مسار التنقل"><a href="../index.html">الرئيسية</a><span class="sep">/</span><span>مناطق الخدمة</span></nav>
        <span class="svc-kicker">تغطية المملكة</span>
        <h1>مناطق <span class="italic">خدمة لواء كونسبت</span></h1>
        <p class="svc-hero-lead">نصمم وننفّذ السبا والديكورات والمكاتب والمطاعم والفلل في كبرى مدن المملكة — اختر مدينتك وخدمتك.</p>
      </div>
    </section>

    <section class="svc-list">
%(body)s
    </section>

    <section class="svc-cta">
      <span class="svc-kicker">أينما كنت</span>
      <h2>مشروعك القادم <span class="italic">يبدأ هنا</span></h2>
      <p>تواصل مع فريق لواء كونسبت لاستشارة مجانية أينما كان موقع مشروعك في المملكة.</p>
      <a href="https://wa.me/966544668836" class="btn btn-primary" target="_blank" rel="noopener">استشارة مجانية عبر واتساب</a>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-grid">
      <div class="foot-brand"><img src="../assets/logo.svg" alt="Liwa Concept Design" /><p>علامة تجارية ضمن مجموعة غرين زون · تأسست 2017</p></div>
      <div class="foot-cols">
        <div class="foot-col"><span class="foot-h">روابط</span><a href="../index.html#about">من نحن</a><a href="areas.html">مناطق الخدمة</a><a href="../blog.html">المدونة</a></div>
        <div class="foot-col"><span class="foot-h">تواصل</span><a href="https://wa.me/966544668836" target="_blank" rel="noopener" dir="ltr">0544668836</a><a href="mailto:info@liwa1.com">info@liwa1.com</a></div>
      </div>
    </div>
    <div class="foot-bottom"><span>© <span id="year"></span> Liwa Concept Design — جميع الحقوق محفوظة</span></div>
  </footer>

  <a href="https://wa.me/966544668836" target="_blank" rel="noopener" class="wa-float" aria-label="واتساب"><svg viewBox="0 0 32 32" width="26" height="26" fill="currentColor"><path d="M16 3C9 3 3.5 8.5 3.5 15.4c0 2.5.7 4.8 1.9 6.8L3 29l7-1.8a13 13 0 0 0 6 1.5c7 0 12.5-5.5 12.5-12.4S23 3 16 3z"/></svg><span class="wa-pulse"></span></a>
  <script>document.getElementById("menuBtn")?.addEventListener("click",()=>document.getElementById("nav").classList.toggle("open"));document.getElementById("year").textContent=new Date().getFullYear();</script>
  <script src="../services.js"></script>
</body>
</html>
''' % {"site": SITE, "body": body}
    with open(os.path.join(OUT, "areas.html"), "w", encoding="utf-8", newline="") as fh:
        fh.write(html)
    print("Built services/areas.html")


def build_sitemap():
    urls = ['%s/services/areas.html' % SITE]
    for sk in SERVICES:
        for ck in CITIES:
            urls.append('%s/services/%s-%s.html' % (SITE, sk, ck))
    items = "\n".join(
        '  <url><loc>%s</loc><lastmod>%s</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>' % (u, TODAY)
        for u in urls)
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n' % items
    with open(os.path.join(ROOT, "sitemap-locations.xml"), "w", encoding="utf-8", newline="") as fh:
        fh.write(xml)
    print("Built sitemap-locations.xml (%d urls)" % len(urls))


if __name__ == "__main__":
    build_areas()
    build_sitemap()
