/* ============================================
   LIWA — Service pages: per-service "Order now" WhatsApp button
   Injects an "اطلب الآن / Order now" button into every .svc-item,
   pre-filling a WhatsApp message with that specific service name.
   ============================================ */
(function () {
  "use strict";
  var PHONE = "966544668836";

  function build() {
    var isEn = (document.documentElement.lang || "ar").toLowerCase().indexOf("en") === 0;

    document.querySelectorAll(".svc-item").forEach(function (item) {
      if (item.querySelector(".svc-order-btn")) return; // avoid duplicates

      var eb = item.querySelector(".svc-eyebrow");
      var h2 = item.querySelector("h2");
      var name = ((eb && eb.textContent) || (h2 && h2.textContent) || "")
        .replace(/\s*\(.*?\)\s*/g, " ") // drop parenthetical e.g. (Salt Rooms)
        .replace(/\s+/g, " ")
        .trim();
      if (!name) return;

      var msg = isEn
        ? 'السلام عليكم، حاب استفسر عن خدمة ' + name
        : 'السلام عليكم، حاب استفسر عن خدمة ' + name;

      var a = document.createElement("a");
      a.className = "svc-order-btn";
      a.href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(msg);
      a.target = "_blank";
      a.rel = "noopener";
      a.setAttribute("aria-label", (isEn ? "Order: " : "اطلب: ") + name);
      a.innerHTML =
        '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">' +
        '<path d="M16 3C9 3 3.5 8.5 3.5 15.4c0 2.5.7 4.8 1.9 6.8L3 29l7-1.8a13 13 0 0 0 6 1.5c7 0 12.5-5.5 12.5-12.4S23 3 16 3zm0 23a10.5 10.5 0 0 1-5.4-1.5l-.4-.2-4 1 1.1-4-.3-.4A10.4 10.4 0 0 1 5.5 15.4C5.5 9.6 10.2 5 16 5s10.5 4.6 10.5 10.4S21.8 26 16 26z"/></svg>' +
        '<span>' + (isEn ? "Order now" : "اطلب الآن") + '</span>';

      var body = item.querySelector(".svc-item-body") || item;
      body.appendChild(a);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();

/* ============================================
   Header: flip to dark (.on-light) once scrolled past the dark hero,
   so the logo + nav stay readable over the cream content sections.
   ============================================ */
(function () {
  "use strict";
  var header = document.getElementById("siteHeader");
  if (!header) return;
  var hero = document.querySelector(".svc-hero");

  function onScroll() {
    var heroH = hero ? hero.offsetHeight : 480;
    header.classList.toggle("scrolled", window.scrollY > 60);
    header.classList.toggle("on-light", window.scrollY > heroH - 90);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();
})();
