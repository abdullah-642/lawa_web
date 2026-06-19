# -*- coding: utf-8 -*-
"""
Liwa Concept — programmatic Service×City landing-page generator.
Generates SEO-strong, locally-differentiated pages under /services/{service}-{city}.html
Each page reuses styles.css + services.css + services.js (header on-light).

Run:  python seo/generate_locations.py
"""
import os, html, urllib.parse, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "services")
SITE = "https://www.liwa1.com"
PHONE = "966544668836"

# ------------------------------------------------------------------ CITIES
# Each city carries UNIQUE local data (districts + context) so every page differs.
CITIES = {
    "riyadh":  {"ar": "الرياض", "region": "منطقة الرياض",
        "districts": ["العليا", "الملقا", "النرجس", "حطين", "الياسمين", "الربيع", "القيروان", "السفارات"],
        "context": "العاصمة وأكبر سوق للمشاريع التجارية والصحية في المملكة، حيث ينمو الطلب على السبا ومراكز التجميل الراقية بوتيرة متسارعة"},
    "jeddah":  {"ar": "جدة", "region": "منطقة مكة المكرمة",
        "districts": ["الشاطئ", "الروضة", "الحمراء", "أبحر الشمالية", "السلامة", "الزهراء", "النعيم", "الأندلس"],
        "context": "عروس البحر الأحمر ووجهة الضيافة والرفاهية، بسوق واسع للمنتجعات الصحية والمطاعم والصالونات الفاخرة"},
    "dammam":  {"ar": "الدمام", "region": "المنطقة الشرقية",
        "districts": ["الشاطئ", "الفيصلية", "الجلوية", "الروضة", "أحد", "النور", "الأمل", "البديع"],
        "context": "قلب المنطقة الشرقية ومركزها التجاري، بطلب متنامٍ على مشاريع السبا والمكاتب ومراكز العناية"},
    "khobar":  {"ar": "الخبر", "region": "المنطقة الشرقية",
        "districts": ["العقربية", "الراكة", "اليرموك", "الخبر الشمالية", "الثقبة", "الحزام الذهبي", "العزيزية", "الكورنيش"],
        "context": "مدينة الأعمال والترفيه الراقية على الخليج، بوجهات تجارية وصحية تنافس كبرى المدن"},
    "makkah":  {"ar": "مكة المكرمة", "region": "منطقة مكة المكرمة",
        "districts": ["العزيزية", "الششة", "النسيم", "الزاهر", "الشوقية", "العوالي", "الكعكية", "بطحاء قريش"],
        "context": "مدينة مقدسة تستقبل ملايين الزوار، بطلب مرتفع على الفنادق والمنتجعات الصحية ومرافق الضيافة الفاخرة"},
    "madinah": {"ar": "المدينة المنورة", "region": "منطقة المدينة المنورة",
        "districts": ["قباء", "العوالي", "الحرة الشرقية", "شظاة", "الدفاع", "العزيزية", "الرانوناء", "النخيل"],
        "context": "مدينة الضيافة والروحانية، بنمو لافت في المرافق الفندقية والصحية ومراكز التجميل الراقية"},
}

# ------------------------------------------------------------------ SERVICES
# term  -> used in headings: "{term} في {city}"
# label -> category eyebrow
# slug-keyed. Each service has unique intro + bullets (shared across cities = same service).
SERVICES = {
    "spa": {"term": "تنفيذ سبا", "label": "السبا", "noun": "السبا",
        "intro": "تصميم وتنفيذ مرافق السبا الفاخرة من العزل ومعالجة الرطوبة حتى أنظمة البخار والتشطيبات النهائية",
        "bullets": ["دراسة وتصميم معماري متكامل للسبا", "أنظمة عزل متعددة الطبقات مقاومة للرطوبة", "أنظمة البخار والتدفئة والتهوية", "أعمال الرخام والحجر الطبيعي", "إضاءة عاطفية وأنظمة تحكم ذكية"]},
    "kahf-melh": {"term": "تنفيذ كهف ملح", "label": "كهوف الملح", "noun": "كهف الملح",
        "intro": "تنفيذ كهوف وغرف الملح العلاجية بكسوة ملح الهيمالايا الطبيعي وأنظمة نشر دقيقة لجزيئات الملح",
        "bullets": ["كسوة جدران وأسقف بملح الهيمالايا", "أنظمة توليد ونشر جزيئات الملح (Halogenerator)", "التحكم بالرطوبة ودرجة الحرارة", "إضاءة ملحية وتصاميم جمالية", "تهوية مصممة خصيصاً لغرف الملح"]},
    "hammam-maghribi": {"term": "تنفيذ حمام مغربي", "label": "الحمام المغربي", "noun": "الحمام المغربي",
        "intro": "تصميم وتنفيذ الحمامات المغربية الفاخرة بعزل احترافي وأسقف منحنية وتدفئة متخصصة",
        "bullets": ["عزل مقاوم للبخار والرطوبة", "الأسقف المنحنية وأنظمة التصريف", "تدفئة الأسرّة والمصاطب الرخامية", "أعمال الرخام والموزاييك", "أنظمة التهوية والتحكم بالرطوبة"]},
    "sauna": {"term": "تنفيذ ساونا", "label": "الساونا", "noun": "الساونا",
        "intro": "تنفيذ غرف الساونا الجافة والرطبة بأخشاب عالية الجودة وأنظمة تدفئة متطورة",
        "bullets": ["ساونا فنلندية تقليدية وكهربائية", "أخشاب مقاومة للحرارة والرطوبة", "أنظمة تحكم ذكية بالحرارة", "إضاءة مخفية وعلاجية", "تصميم حسب المساحة والمتطلبات"]},
    "ghorfa-bukhar": {"term": "تنفيذ غرفة بخار", "label": "غرف البخار", "noun": "غرفة البخار",
        "intro": "تنفيذ غرف البخار التجارية والفندقية بأنظمة بخار ذكية وعزل وتشطيبات راقية",
        "bullets": ["أنظمة بخار ذكية وتحكم رقمي", "عزل متعدد الطبقات", "أعمال الرخام والزجاج", "إضاءة وتهوية مدروسة", "تنفيذ تجاري وفندقي ومنزلي"]},
    "nail-spa": {"term": "تنفيذ نيل سبا", "label": "نيل سبا", "noun": "نيل سبا",
        "intro": "تصميم وتنفيذ صالات النيل سبا العصرية بمحطات عناية مريحة وأجواء راقية",
        "bullets": ["محطات مانيكير وبديكير مريحة", "أنظمة تهوية وشفط الروائح", "إضاءة وأجواء عصرية", "دمج الهوية البصرية للعلامة", "أثاث ومحطات مخصصة"]},
    "salon-nisai": {"term": "تنفيذ صالون نسائي", "label": "الصالونات النسائية", "noun": "الصالون النسائي",
        "intro": "تصميم وتنفيذ الصالونات النسائية ومراكز التجميل بأجواء فاخرة وخصوصية تامة",
        "bullets": ["مناطق قص وتصفيف وعناية", "خصوصية وعزل بصري", "إضاءة مثالية للمرايا", "أثاث ومحطات فاخرة", "تنفيذ متكامل بهوية مميزة"]},
    "salon-rijali": {"term": "تنفيذ صالون رجالي", "label": "الصالونات الرجالية", "noun": "الصالون الرجالي",
        "intro": "تصميم وتنفيذ الصالونات الرجالية والبربر شوب بطابع عصري أنيق",
        "bullets": ["كراسي حلاقة ومحطات احترافية", "تصميم بربر شوب عصري", "إضاءة وأجواء مميزة", "مواد تشطيب متينة", "هوية بصرية متكاملة"]},
    "markaz-tajmeel": {"term": "تصميم مركز تجميل", "label": "مراكز التجميل", "noun": "مركز التجميل",
        "intro": "تصميم وتنفيذ مراكز التجميل والعناية بالبشرة وفق المعايير الصحية والجمالية",
        "bullets": ["غرف عناية ومعالجة مجهزة", "مطابقة الاشتراطات الصحية", "إضاءة وأجواء مريحة", "مناطق استقبال وانتظار راقية", "تصميم بهوية احترافية"]},
    "ghorf-masaj": {"term": "تنفيذ غرف مساج", "label": "غرف المساج", "noun": "غرف المساج",
        "intro": "تنفيذ غرف المساج والعلاج بأسرّة مخصصة وعزل صوتي وأجواء استرخاء",
        "bullets": ["أسرّة مساج بتصنيع خاص", "عزل صوتي للخصوصية", "تدفئة مدمجة وإضاءة هادئة", "تهوية وتحكم بالأجواء", "تشطيبات طبيعية فاخرة"]},
    "makateb": {"term": "تصميم وتنفيذ مكاتب", "label": "المكاتب الإدارية", "noun": "المكاتب",
        "intro": "تصميم وتنفيذ المكاتب والمقرات الإدارية بكفاءة وظيفية ورقي بصري",
        "bullets": ["مكاتب تنفيذية ومساحات عمل", "أثاث مكتبي مخصص", "عزل صوتي ودمج التقنية", "إضاءة وظيفية وعاطفية", "هوية الشركة في التصميم"]},
    "ghoraf-egtemaat": {"term": "تنفيذ غرف اجتماعات", "label": "غرف الاجتماعات", "noun": "غرف الاجتماعات",
        "intro": "تصميم وتنفيذ غرف الاجتماعات وقاعات المؤتمرات بأنظمة عرض وعزل أكوستيكي",
        "bullets": ["أنظمة عرض وصوتيات متكاملة", "عزل أكوستيكي احترافي", "طاولات ومقاعد مريحة", "إضاءة قابلة للتحكم", "حلول مؤتمرات عن بُعد"]},
    "mataem": {"term": "تصميم وتنفيذ مطاعم", "label": "المطاعم", "noun": "المطاعم",
        "intro": "تصميم وتنفيذ المطاعم بمختلف أنماطها بما يخدم التشغيل وتجربة الضيف",
        "bullets": ["تصميم الصالات ومناطق الجلوس", "توزيع تشغيلي يخدم الكفاءة", "أنظمة الإضاءة والصوتيات", "مواد مقاومة للاستخدام الكثيف", "مطابقة اشتراطات البلدية"]},
    "cafes": {"term": "تصميم كافيهات", "label": "الكافيهات", "noun": "الكافيهات",
        "intro": "تصميم وتنفيذ الكافيهات بمفاهيم عصرية تترك انطباعاً يدوم",
        "bullets": ["مفاهيم كافيهات عصرية", "مناطق التحضير والباريستا", "جلسات داخلية وخارجية", "إضاءة وأجواء مميزة", "أركان تصوير جاذبة"]},
    "mahalat": {"term": "ديكور محلات تجارية", "label": "المحلات والمعارض", "noun": "المحلات التجارية",
        "intro": "تصميم وتنفيذ المحلات التجارية والمعارض بتجربة تسوّق تدفع للشراء",
        "bullets": ["تصميم محلات التجزئة والمعارض", "أنظمة العرض والرفوف", "إضاءة إبراز المنتجات", "تنظيم مسارات الحركة", "واجهات عرض جاذبة"]},
    "flal": {"term": "تصميم وتنفيذ فلل", "label": "الفلل", "noun": "الفلل",
        "intro": "تصميم وتنفيذ الفلل الفاخرة بخامات راقية وتفاصيل تعكس ذوق المالك",
        "bullets": ["تصميم داخلي متكامل للفيلا", "خامات وتشطيبات فاخرة", "أعمال الجبس والأسقف المعلقة", "الإضاءة المعمارية", "إشراف تنفيذي كامل"]},
    "qosor": {"term": "تصميم قصور", "label": "القصور", "noun": "القصور",
        "intro": "تصميم وتنفيذ القصور والملاحق بفخامة كلاسيكية وحديثة لا تساوم على التفاصيل",
        "bullets": ["تصاميم كلاسيكية وحديثة فخمة", "أعمال الرخام والحجر الطبيعي", "عناصر معمارية مميزة", "تفاصيل فنية مصنوعة يدوياً", "تنسيق متكامل للمساحات"]},
    "majles": {"term": "تصميم مجالس", "label": "المجالس", "noun": "المجالس",
        "intro": "تصميم وتنفيذ المجالس وغرف الضيافة بطُرز عربية وحديثة تليق بضيوفك",
        "bullets": ["مجالس رجال ونساء فاخرة", "تصاميم عربية وحديثة", "أعمال الجبس والديكورات", "إضاءة عاطفية مميزة", "مفروشات وأقمشة منسقة"]},
}

CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 6"/></svg>'
ARROW = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
WA_ICON = '<svg viewBox="0 0 32 32" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M16 3C9 3 3.5 8.5 3.5 15.4c0 2.5.7 4.8 1.9 6.8L3 29l7-1.8a13 13 0 0 0 6 1.5c7 0 12.5-5.5 12.5-12.4S23 3 16 3z"/></svg>'
HERO_IMG = "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1600&q=85"


def wa(text):
    return "https://wa.me/%s?text=%s" % (PHONE, urllib.parse.quote(text))


def page(svc_slug, city_slug):
    s = SERVICES[svc_slug]
    c = CITIES[city_slug]
    term, city, noun = s["term"], c["ar"], s["noun"]
    H1 = "%s في %s" % (term, city)
    title = "%s | شركة لواء كونسبت — تصميم وتنفيذ %s" % (H1, s["label"])
    desc = "%s مع لواء كونسبت: %s. نخدم جميع أحياء %s بإشراف هندسي مباشر وضمانات حقيقية. استشارة مجانية." % (H1, s["intro"], city)
    canonical = "%s/services/%s-%s.html" % (SITE, svc_slug, city_slug)
    districts = "، ".join(c["districts"])
    order_msg = "السلام عليكم، حاب استفسر عن %s في %s" % (term, city)

    bullets = "\n".join(
        '            <li>%s%s</li>' % (CHECK, html.escape(b)) for b in s["bullets"]
    )

    # FAQ (mix of service + city templated) — also mirrored in JSON-LD
    faqs = [
        ("كم تكلفة %s في %s؟" % (term, city),
         "تُحدَّد تكلفة %s بدقة بعد دراسة مساحة ومتطلبات مشروعك في %s. تواصل معنا للحصول على عرض سعر مخصص ومجاني خلال 24 ساعة." % (noun, city)),
        ("هل تنفذون %s في جميع أحياء %s؟" % (term, city),
         "نعم، نخدم جميع أحياء %s ومنها %s، بإشراف ميداني مباشر." % (city, "، ".join(c["districts"][:5]))),
        ("كم تستغرق مدة %s؟" % term,
         "تعتمد المدة على نطاق العمل والمساحة؛ نضع جدولاً زمنياً واضحاً بعد اعتماد التصميم ونلتزم به حتى تسليم المفتاح."),
        ("هل تقدمون استشارة مجانية في %s؟" % city,
         "نعم، نقدّم استشارة مجانية وعرض سعر تفصيلي لمشاريع %s في %s عبر الواتساب أو نموذج الموقع." % (noun, city)),
    ]
    faq_html = "\n".join(
        '''      <div class="faq-item">
        <button class="faq-q" type="button">%s<span class="faq-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></span></button>
        <div class="faq-a"><div class="faq-a-inner">%s</div></div>
      </div>''' % (html.escape(q), html.escape(a)) for q, a in faqs)
    faq_ld = ",".join(
        '{"@type":"Question","name":%s,"acceptedAnswer":{"@type":"Answer","text":%s}}'
        % (json.dumps(q, ensure_ascii=False), json.dumps(a, ensure_ascii=False)) for q, a in faqs)

    # Related: same service in other cities + other services in same city
    other_cities = [k for k in CITIES if k != city_slug][:5]
    same_city_services = [k for k in SERVICES if k != svc_slug][:5]
    rel_cities = "\n".join(
        '        <a href="%s-%s.html" class="svc-related-card"><span class="rc-cat">%s</span><span class="rc-t">%s في %s</span></a>'
        % (svc_slug, oc, s["label"], term, CITIES[oc]["ar"]) for oc in other_cities)
    rel_services = "\n".join(
        '        <a href="%s-%s.html" class="svc-related-card"><span class="rc-cat">%s</span><span class="rc-t">%s في %s</span></a>'
        % (os_, city_slug, SERVICES[os_]["label"], SERVICES[os_]["term"], city) for os_ in same_city_services[:3])

    breadcrumb_ld = ('{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":['
        '{"@type":"ListItem","position":1,"name":"الرئيسية","item":"%s/"},'
        '{"@type":"ListItem","position":2,"name":"مناطق الخدمة","item":"%s/services/areas.html"},'
        '{"@type":"ListItem","position":3,"name":%s,"item":"%s"}]}'
        % (SITE, SITE, json.dumps(H1, ensure_ascii=False), canonical))

    service_ld = ('{"@context":"https://schema.org","@type":"Service",'
        '"serviceType":%s,"name":%s,"url":"%s",'
        '"areaServed":{"@type":"City","name":%s},'
        '"provider":{"@type":"InteriorDesignBusiness","name":"Liwa Concept Design","telephone":"+%s","url":"%s/","areaServed":"SA"}}'
        % (json.dumps(s["label"], ensure_ascii=False), json.dumps(H1, ensure_ascii=False),
           canonical, json.dumps(city, ensure_ascii=False), PHONE, SITE))

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
        <p class="svc-hero-lead">%(intro)s — في %(city)s، %(context)s. خبرة لواء كونسبت منذ 2017 بإشراف هندسي مباشر وضمانات حقيقية.</p>
        <a href="%(order_url)s" class="svc-order-btn" target="_blank" rel="noopener" style="margin-top:24px">%(wa_icon)s<span>اطلب الآن</span></a>
      </div>
    </section>

    <section class="svc-intro">
      <p><strong>%(h1)s</strong> — تقدّم <strong>شركة لواء كونسبت</strong> خدمات %(intro)s في %(city)s و%(region)s. نرافق مشروعك من الفكرة الأولى حتى تسليم المفتاح بإشراف ميداني مباشر يومي.</p>
    </section>

    <section class="svc-list">
      <article class="svc-item">
        <div class="svc-item-head">
          <span class="svc-index">01</span>
          <div class="svc-item-titles">
            <span class="svc-eyebrow">%(label)s في %(city)s</span>
            <h2>ماذا نقدّم في %(term)s بـ%(city)s</h2>
          </div>
        </div>
        <div class="svc-item-body">
          <ul class="svc-features">
%(bullets)s
          </ul>
          <p class="svc-closer">نجمع بين الجودة التشغيلية والتصميم الراقي لتحقيق نتيجة تليق بمشروعك في %(city)s.</p>
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
          <p>ينفّذ فريق لواء كونسبت مشاريع %(noun)s في مختلف أحياء %(city)s، ومنها: %(districts)s — وكامل نطاق %(region)s.</p>
          <p class="svc-closer">أينما كان موقع مشروعك في %(city)s، نصل إليك بنفس معايير الجودة والإشراف.</p>
        </div>
      </article>
    </section>

    <section class="svc-why">
      <div class="svc-why-inner">
        <h2>لماذا <span class="italic">لواء كونسبت</span> في %(city)s</h2>
        <div class="svc-why-grid">
          <div class="svc-why-card"><h3>خبرة منذ 2017</h3><p>عشرات المشاريع المنفذة في %(city)s والمملكة بمعايير عالية.</p></div>
          <div class="svc-why-card"><h3>إشراف مباشر</h3><p>متابعة ميدانية يومية تضمن تطابق المُنفَّذ مع التصميم المعتمد.</p></div>
          <div class="svc-why-card"><h3>ضمانات حقيقية</h3><p>عقود تفصيلية وضمانات موثّقة على الأعمال والمواد.</p></div>
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
      <p>شاركنا فكرتك وسيتولى فريق لواء كونسبت ترجمتها إلى واقع استثنائي في %(city)s.</p>
      <a href="%(order_url)s" class="btn btn-primary" target="_blank" rel="noopener">احصل على استشارة مجانية عبر واتساب %(arrow)s</a>
    </section>

    <section class="svc-related">
      <h2>%(label)s في مدن أخرى</h2>
      <div class="svc-related-grid">
%(rel_cities)s
      </div>
    </section>

    <section class="svc-related">
      <h2>خدمات أخرى في %(city)s</h2>
      <div class="svc-related-grid">
%(rel_services)s
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
        "h1": html.escape(H1), "site": SITE, "city": city, "region": c["region"],
        "service_ld": service_ld, "breadcrumb_ld": breadcrumb_ld, "faq_ld": faq_ld,
        "hero": HERO_IMG, "label": s["label"], "term": term, "noun": noun,
        "intro": s["intro"], "context": c["context"], "districts": districts,
        "bullets": bullets, "faq_html": faq_html, "rel_cities": rel_cities, "rel_services": rel_services,
        "order_url": wa(order_msg), "wa_icon": WA_ICON, "arrow": ARROW,
        "phone": PHONE, "phone_local": PHONE[3:],
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    urls = []
    for svc in SERVICES:
        for city in CITIES:
            fn = "%s-%s.html" % (svc, city)
            with open(os.path.join(OUT_DIR, fn), "w", encoding="utf-8", newline="") as fh:
                fh.write(page(svc, city))
            urls.append("%s/services/%s" % (SITE, fn))
    # write url list for sitemap step
    with open(os.path.join(os.path.dirname(__file__), "location_urls.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(urls))
    print("Generated %d service×city pages (%d services × %d cities)" % (len(urls), len(SERVICES), len(CITIES)))


if __name__ == "__main__":
    main()
