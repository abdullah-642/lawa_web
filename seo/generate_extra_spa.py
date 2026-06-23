# -*- coding: utf-8 -*-
"""Extra SPA location pages (Al-Ahsa + Riyadh zones) — same design as the
service×city pages, with SAFE related links to existing pages only."""
import os, html, urllib.parse, json
from generate_locations import SITE, PHONE, ROOT, CHECK, WA_ICON, ARROW, HERO_IMG, wa, SERVICES

OUT = os.path.join(ROOT, "services")
TERM = "تنفيذ وتصميم سبا"
NOUN = "السبا"
LABEL = "مشاريع سبا"

# New spa locations (slug -> data). Districts are UNIQUE per area.
LOCATIONS = {
    "spa-ahsa": {"ar": "الأحساء", "region": "المنطقة الشرقية",
        "districts": ["المبرز", "الهفوف", "الرقيقة", "النعاثل", "الطرف", "العمران", "الجفر", "البطالية"],
        "context": "واحة الأحساء أكبر واحة نخيل في العالم ومدينة تراثية حيوية، بطلب متنامٍ على المنتجعات الصحية والسبا الفاخر"},
    "spa-south-riyadh": {"ar": "جنوب الرياض", "region": "مدينة الرياض",
        "districts": ["الحائر", "نمار", "العزيزية", "الدار البيضاء", "بدر", "الشفا", "المنصورة", "عريض"],
        "context": "منطقة حيوية سريعة التوسّع جنوب العاصمة، بطلب متزايد على مشاريع السبا والصالونات ومراكز العناية"},
    "spa-north-riyadh": {"ar": "شمال الرياض", "region": "مدينة الرياض",
        "districts": ["النرجس", "الملقا", "الياسمين", "العارض", "القيروان", "حطين", "الربيع", "النفل"],
        "context": "وجهة الأحياء الراقية والمشاريع الفاخرة شمال العاصمة، حيث يتركّز الطلب على السبا الفاخر ومراكز التجميل"},
    "spa-east-riyadh": {"ar": "شرق الرياض", "region": "مدينة الرياض",
        "districts": ["الرمال", "اليرموك", "قرطبة", "غرناطة", "النهضة", "إشبيلية", "المونسية", "الحمراء"],
        "context": "منطقة سكنية وتجارية واسعة شرق العاصمة، بنمو لافت في مرافق السبا والعناية والصالونات"},
}

# Existing spa city pages we can safely link to for "مناطق أخرى"
EXISTING_SPA_CITIES = [("spa-riyadh", "الرياض"), ("spa-jeddah", "جدة"),
                       ("spa-dammam", "الدمام"), ("spa-khobar", "الخبر"), ("spa-makkah", "مكة المكرمة")]


def page(slug, d):
    city = d["ar"]
    H1 = "%s في %s" % (TERM, city)
    title = "%s | شركة لواء كونسبت" % H1
    desc = "%s مع لواء كونسبت: غرف بخار، حمام مغربي، كهف ملح، ساونا. نخدم %s بإشراف هندسي مباشر وضمانات حقيقية. استشارة مجانية." % (H1, city)
    canonical = "%s/services/%s.html" % (SITE, slug)
    districts = "، ".join(d["districts"])
    order_msg = "السلام عليكم، حاب استفسر عن %s في %s" % (TERM, city)
    bullets = "\n".join('            <li>%s%s</li>' % (CHECK, html.escape(b)) for b in SERVICES["spa"]["bullets"])

    faqs = [
        ("كم تكلفة %s في %s؟" % (TERM, city),
         "تُحدَّد تكلفة %s بدقة بعد دراسة مساحة ومتطلبات مشروعك في %s. تواصل معنا لعرض سعر مخصص ومجاني خلال 24 ساعة." % (NOUN, city)),
        ("هل تنفذون السبا في جميع أحياء %s؟" % city,
         "نعم، نخدم %s بالكامل ومنها %s، بإشراف ميداني مباشر." % (city, "، ".join(d["districts"][:5]))),
        ("ما الذي يميز تنفيذكم للسبا؟",
         "أنظمة عزل متعددة الطبقات مقاومة للرطوبة، أنظمة بخار وتدفئة وتهوية، وأعمال رخام وإضاءة عاطفية — بإشراف هندسي مباشر منذ 2017."),
        ("هل تقدمون استشارة مجانية في %s؟" % city,
         "نعم، نقدّم استشارة مجانية وعرض سعر تفصيلي لمشاريع السبا في %s عبر الواتساب أو نموذج الموقع." % city),
    ]
    faq_html = "\n".join(
        '''      <div class="faq-item">
        <button class="faq-q" type="button">%s<span class="faq-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></span></button>
        <div class="faq-a"><div class="faq-a-inner">%s</div></div>
      </div>''' % (html.escape(q), html.escape(a)) for q, a in faqs)
    faq_ld = ",".join('{"@type":"Question","name":%s,"acceptedAnswer":{"@type":"Answer","text":%s}}'
                      % (json.dumps(q, ensure_ascii=False), json.dumps(a, ensure_ascii=False)) for q, a in faqs)

    # Related: other existing spa locations + the other new zones (all exist)
    rel = [(s, n) for s, n in EXISTING_SPA_CITIES] + [(k, v["ar"]) for k, v in LOCATIONS.items() if k != slug]
    rel_cards = "\n".join(
        '        <a href="%s.html" class="svc-related-card"><span class="rc-cat">مشاريع سبا</span><span class="rc-t">%s في %s</span></a>'
        % (s, TERM, n) for s, n in rel[:6])

    service_ld = ('{"@context":"https://schema.org","@type":"Service","serviceType":"%s","name":%s,"url":"%s",'
        '"areaServed":{"@type":"Place","name":%s},'
        '"provider":{"@type":"InteriorDesignBusiness","name":"Liwa Concept Design","telephone":"+%s","url":"%s/","areaServed":"SA"}}'
        % (LABEL, json.dumps(H1, ensure_ascii=False), canonical, json.dumps(city, ensure_ascii=False), PHONE, SITE))
    breadcrumb_ld = ('{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":['
        '{"@type":"ListItem","position":1,"name":"الرئيسية","item":"%s/"},'
        '{"@type":"ListItem","position":2,"name":"مناطق الخدمة","item":"%s/services/areas.html"},'
        '{"@type":"ListItem","position":3,"name":%s,"item":"%s"}]}'
        % (SITE, SITE, json.dumps(H1, ensure_ascii=False), canonical))

    return '''<!DOCTYPE html>
<html lang="ar" dir="rtl" data-lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0a0a0a" />
  <title>%(title)s</title>
  <meta name="description" content="%(desc)s" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <meta name="author" content="Liwa Concept Design" />
  <link rel="canonical" href="%(canonical)s" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Liwa Concept Design" />
  <meta property="og:title" content="%(h1)s — لواء كونسبت" />
  <meta property="og:description" content="%(desc)s" />
  <meta property="og:url" content="%(canonical)s" />
  <meta property="og:image" content="%(site)s/assets/logo.svg" />
  <meta property="og:locale" content="ar_SA" />
  <meta name="geo.region" content="SA" />
  <meta name="geo.placename" content="%(city)s" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500;600&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../styles.css" />
  <link rel="stylesheet" href="../services.css" />
  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg" />
  <script type="application/ld+json">%(service_ld)s</script>
  <script type="application/ld+json">%(breadcrumb_ld)s</script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[%(faq_ld)s]}</script>
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
    <section class="svc-hero">
      <div class="svc-hero-bg" style="background-image:url('%(hero)s')"></div>
      <div class="svc-hero-inner">
        <nav class="svc-breadcrumb" aria-label="مسار التنقل">
          <a href="../index.html">الرئيسية</a><span class="sep">/</span>
          <a href="areas.html">مناطق الخدمة</a><span class="sep">/</span>
          <span>%(h1)s</span>
        </nav>
        <span class="svc-kicker">%(label)s · %(city)s</span>
        <h1>%(term)s في <span class="italic">%(city)s</span></h1>
        <p class="svc-hero-lead">من غرف البخار والحمامات المغربية إلى كهوف الملح والساونا — في %(city)s، %(context)s. خبرة لواء كونسبت منذ 2017 بإشراف هندسي مباشر وضمانات حقيقية.</p>
        <a href="%(order_url)s" class="svc-order-btn" target="_blank" rel="noopener" style="margin-top:24px">%(wa_icon)s<span>اطلب الآن</span></a>
      </div>
    </section>

    <section class="svc-intro">
      <p><strong>%(h1)s</strong> — تقدّم <strong>شركة لواء كونسبت</strong> خدمات تصميم وتنفيذ السبا الفاخر في %(city)s و%(region)s: غرف البخار، الحمامات المغربية، كهوف الملح، الساونا، أثاث السبا المخصص، وأنظمة التدفئة. نرافق مشروعك من الفكرة حتى تسليم المفتاح.</p>
    </section>

    <section class="svc-list">
      <article class="svc-item">
        <div class="svc-item-head">
          <span class="svc-index">01</span>
          <div class="svc-item-titles">
            <span class="svc-eyebrow">السبا في %(city)s</span>
            <h2>ماذا نقدّم في %(term)s بـ%(city)s</h2>
          </div>
        </div>
        <div class="svc-item-body">
          <ul class="svc-features">
%(bullets)s
          </ul>
          <p class="svc-closer">نجمع بين الجودة التشغيلية والتصميم الراقي لتحقيق سبا يليق بمشروعك في %(city)s.</p>
        </div>
      </article>

      <article class="svc-item">
        <div class="svc-item-head">
          <span class="svc-index">02</span>
          <div class="svc-item-titles">
            <span class="svc-eyebrow">تغطية %(city)s</span>
            <h2>نخدم جميع أحياء %(city)s</h2>
          </div>
        </div>
        <div class="svc-item-body">
          <p>ينفّذ فريق لواء كونسبت مشاريع السبا في مختلف أحياء %(city)s، ومنها: %(districts)s — وكامل نطاق %(region)s.</p>
          <p class="svc-closer">أينما كان موقع مشروعك في %(city)s، نصل إليك بنفس معايير الجودة والإشراف.</p>
        </div>
      </article>
    </section>

    <section class="svc-why">
      <div class="svc-why-inner">
        <h2>لماذا <span class="italic">لواء كونسبت</span> في %(city)s</h2>
        <div class="svc-why-grid">
          <div class="svc-why-card"><h3>خبرة منذ 2017</h3><p>عشرات مشاريع السبا المنفذة في الرياض والمملكة بمعايير عالية.</p></div>
          <div class="svc-why-card"><h3>عزل وضمانات</h3><p>أنظمة عزل متعددة الطبقات مقاومة للرطوبة وضمانات موثّقة.</p></div>
          <div class="svc-why-card"><h3>إشراف مباشر</h3><p>متابعة ميدانية يومية تضمن تطابق المُنفَّذ مع التصميم المعتمد.</p></div>
        </div>
      </div>
    </section>

    <section class="svc-faq">
      <h2>أسئلة <span class="italic">شائعة</span> · %(city)s</h2>
%(faq_html)s
    </section>

    <section class="svc-cta">
      <span class="svc-kicker">ابدأ مشروعك في %(city)s</span>
      <h2>جاهزون لـ<span class="italic">%(term)s</span> في %(city)s</h2>
      <p>شاركنا فكرتك وسيتولى فريق لواء كونسبت ترجمتها إلى مرفق سبا استثنائي في %(city)s.</p>
      <a href="%(order_url)s" class="btn btn-primary" target="_blank" rel="noopener">احصل على استشارة مجانية عبر واتساب %(arrow)s</a>
    </section>

    <section class="svc-related">
      <h2>السبا في مناطق أخرى</h2>
      <div class="svc-related-grid">
%(rel_cards)s
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-grid">
      <div class="foot-brand"><img src="../assets/logo.svg" alt="Liwa Concept Design" /><p>علامة تجارية ضمن مجموعة غرين زون · تأسست 2017</p></div>
      <div class="foot-cols">
        <div class="foot-col"><span class="foot-h">روابط</span><a href="../index.html#about">من نحن</a><a href="areas.html">مناطق الخدمة</a><a href="../blog.html">المدونة</a><a href="../index.html#contact">تواصل</a></div>
        <div class="foot-col"><span class="foot-h">تواصل</span><a href="https://wa.me/%(phone)s" target="_blank" rel="noopener" dir="ltr">0%(phone_local)s</a><a href="mailto:info@liwa1.com">info@liwa1.com</a><a href="https://www.instagram.com/liwa.ksa" target="_blank" rel="noopener" dir="ltr">@liwa.ksa</a></div>
      </div>
    </div>
    <div class="foot-bottom"><span>© <span id="year"></span> Liwa Concept Design — جميع الحقوق محفوظة</span></div>
  </footer>

  <a href="%(order_url)s" target="_blank" rel="noopener" class="wa-float" aria-label="استشارة مجانية عبر واتساب">%(wa_icon)s<span class="wa-pulse"></span></a>

  <script>
    document.getElementById("menuBtn")?.addEventListener("click",()=>document.getElementById("nav").classList.toggle("open"));
    document.getElementById("year").textContent=new Date().getFullYear();
    document.querySelectorAll(".faq-q").forEach(function(q){q.addEventListener("click",function(){var i=q.closest(".faq-item"),a=i.querySelector(".faq-a"),o=i.classList.toggle("open");a.style.maxHeight=o?a.scrollHeight+"px":null;});});
  </script>
  <script src="../services.js"></script>
</body>
</html>
''' % {
        "title": html.escape(title), "desc": html.escape(desc), "canonical": canonical,
        "h1": html.escape(H1), "site": SITE, "city": city, "region": d["region"],
        "service_ld": service_ld, "breadcrumb_ld": breadcrumb_ld, "faq_ld": faq_ld,
        "hero": HERO_IMG, "label": LABEL, "term": TERM, "context": d["context"],
        "districts": districts, "bullets": bullets, "faq_html": faq_html, "rel_cards": rel_cards,
        "order_url": wa(order_msg), "wa_icon": WA_ICON, "arrow": ARROW,
        "phone": PHONE, "phone_local": PHONE[3:],
    }


def main():
    urls = []
    for slug, d in LOCATIONS.items():
        with open(os.path.join(OUT, slug + ".html"), "w", encoding="utf-8", newline="") as fh:
            fh.write(page(slug, d))
        urls.append("%s/services/%s.html" % (SITE, slug))
    # append to sitemap-locations.xml
    sp = os.path.join(ROOT, "sitemap-locations.xml")
    sm = open(sp, encoding="utf-8").read()
    if "spa-ahsa" not in sm:
        add = "\n".join('  <url><loc>%s</loc><lastmod>2026-06-20</lastmod><changefreq>monthly</changefreq><priority>0.85</priority></url>' % u for u in urls)
        sm = sm.replace("\n</urlset>", "\n" + add + "\n</urlset>", 1)
        open(sp, "w", encoding="utf-8", newline="").write(sm)
    print("Generated %d extra spa pages + sitemap updated" % len(urls))
    for u in urls: print(" -", u)


if __name__ == "__main__":
    main()
