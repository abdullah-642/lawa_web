"""Enrich every blog article with extra SEO meta + structured data:
- og:locale, og:site_name
- twitter:card, twitter:title, twitter:description, twitter:image
- googlebot/bingbot directives
- BreadcrumbList JSON-LD
- BlogPosting: add dateModified + articleSection
- Ensure all logo refs point to /assets/logo.svg (not .png)
"""
import os, re, json

ROOT_URL = "https://www.liwa1.com"
LOGO_URL = f"{ROOT_URL}/assets/logo.svg"
TODAY = "2026-05-22"

# Section map by slug keyword
def category_for(slug):
    if "kahf" in slug or "kohuf" in slug or "thalj" in slug: return "كهوف الملح وغرف الثلج"
    if "nail-spa" in slug: return "نيل سبا"
    if "spa" in slug or "hammam" in slug or "wellness" in slug: return "السبا والعافية"
    if "salon" in slug or "tajmeel" in slug: return "الصالونات ومراكز التجميل"
    if "makateb" in slug or "maktab" in slug or "egtema" in slug or "isbtoqbal" in slug: return "المكاتب الإدارية"
    if "fonduki" in slug or "matam" in slug or "cafe" in slug: return "الفنادق والمطاعم"
    if "villa" in slug or "sakani" in slug: return "السكني"
    if "mqaw" in slug or "shrekat" in slug: return "أدلة مرجعية"
    return "تصميم داخلي"

def enrich_article(path, slug):
    with open(path, 'r', encoding='utf-8') as f:
        s = f.read()
    orig = s

    # 1. Replace any logo.png → logo.svg in this file
    s = s.replace('/assets/logo.png', '/assets/logo.svg')

    # 2. Extract title and description from existing meta
    m_title = re.search(r'<title>([^<]+)</title>', s)
    m_desc = re.search(r'<meta name="description" content="([^"]+)"', s)
    title = m_title.group(1) if m_title else "Liwa Concept Design"
    desc = m_desc.group(1) if m_desc else ""

    # 3. Add OG locale, site_name, Twitter card, googlebot, etc. — only if missing
    canonical_match = re.search(r'<link rel="canonical" href="([^"]+)"\s*/>', s)
    if not canonical_match:
        return False
    canonical = canonical_match.group(1)

    article_section = category_for(slug)

    extra = []
    if 'og:locale' not in s:
        extra.append('  <meta property="og:locale" content="ar_SA" />')
    if 'og:site_name' not in s:
        extra.append('  <meta property="og:site_name" content="Liwa Concept Design" />')
    if 'twitter:card' not in s:
        extra.extend([
            '  <meta name="twitter:card" content="summary_large_image" />',
            f'  <meta name="twitter:title" content="{title}" />',
            f'  <meta name="twitter:description" content="{desc}" />',
            f'  <meta name="twitter:image" content="{LOGO_URL}" />',
        ])
    if '<meta name="googlebot"' not in s:
        extra.append('  <meta name="googlebot" content="index, follow, max-image-preview:large" />')
    if '<meta name="bingbot"' not in s:
        extra.append('  <meta name="bingbot" content="index, follow" />')
    if '<meta name="author"' not in s:
        extra.append('  <meta name="author" content="Liwa Concept Design" />')

    if extra:
        s = s.replace(
            f'<link rel="canonical" href="{canonical}" />',
            f'<link rel="canonical" href="{canonical}" />\n' + '\n'.join(extra)
        )

    # 4. Add BreadcrumbList schema if missing
    if '"BreadcrumbList"' not in s:
        # Extract category from breadcrumb
        crumb_match = re.search(r'<span class="sep">/</span><span>([^<]+)</span>', s)
        category = crumb_match.group(1) if crumb_match else article_section
        title_clean = title.split('|')[0].strip()

        breadcrumb = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "الرئيسية", "item": f"{ROOT_URL}/"},
                {"@type": "ListItem", "position": 2, "name": "المدونة", "item": f"{ROOT_URL}/blog.html"},
                {"@type": "ListItem", "position": 3, "name": category, "item": canonical},
            ]
        }
        bc_json = json.dumps(breadcrumb, ensure_ascii=False, separators=(',', ':'))
        bc_script = f'\n\n  <script type="application/ld+json">\n  {bc_json}\n  </script>'
        # Insert before </head>
        s = s.replace('</head>', f'{bc_script}\n</head>')

    # 5. Enrich existing BlogPosting JSON-LD with dateModified + articleSection
    def add_blog_fields(m):
        body = m.group(0)
        if '"dateModified"' not in body:
            body = body.replace('"datePublished":"2026-05-18"', f'"datePublished":"2026-05-18","dateModified":"{TODAY}"')
        if '"articleSection"' not in body:
            body = body.replace(
                '"inLanguage":"ar"',
                f'"inLanguage":"ar","articleSection":"{article_section}"'
            )
        return body

    s = re.sub(
        r'\{"@context":"https://schema\.org","@type":"BlogPosting"[^}]+\}',
        add_blog_fields,
        s
    )

    if s != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(s)
        return True
    return False

count = 0
for fn in os.listdir('blog'):
    if fn.endswith('.html'):
        slug = fn[:-5]  # remove .html
        if enrich_article(os.path.join('blog', fn), slug):
            count += 1
            print('enriched:', fn)

print(f'\nTOTAL articles enriched: {count}')
