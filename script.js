// ============================================
// LIWA CONCEPT — 3D + interactions
// ============================================

(function () {
  "use strict";

  // ----------- Preloader (removed in luxury redesign) -----------
  const preloader = document.getElementById("preloader");
  if (preloader) preloader.remove();
  // Trigger reveal animations once DOM is ready
  setTimeout(initReveal, 50);

  // ----------- Year -----------
  document.getElementById("year").textContent = new Date().getFullYear();

  // ----------- Sticky Header -----------
  const header = document.getElementById("siteHeader");
  const hero = document.getElementById("hero");
  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 60);
    // Flip header to light theme once we leave the dark hero
    const heroHeight = hero ? hero.offsetHeight : 600;
    header.classList.toggle("on-light", window.scrollY > heroHeight - 100);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ----------- Mobile menu -----------
  const menuBtn = document.getElementById("menuBtn");
  const nav = document.getElementById("nav");
  menuBtn.addEventListener("click", () => {
    nav.classList.toggle("open");
    menuBtn.classList.toggle("open");
  });
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));

  // ----------- Language toggle -----------
  document.getElementById("langToggle").addEventListener("click", () => {
    const cur = document.documentElement.dataset.lang;
    applyLanguage(cur === "ar" ? "en" : "ar");
  });

  // ----------- Reveal on scroll -----------
  function initReveal() {
    document.querySelectorAll(".section-head, .about-narrative, .about-pullquote, .exp-card, .step, .vision-box, .contact-left, .contact-form")
      .forEach(el => el.classList.add("reveal"));

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      // Animate hero title lines in
      gsap.to(".hero-title .line > span", {
        y: 0, duration: 1.2, ease: "expo.out", stagger: 0.15, delay: 0.1
      });
      gsap.from(".hero-meta, .hero-sub, .hero-cta", {
        y: 30, opacity: 0, duration: 1, ease: "expo.out",
        stagger: 0.12, delay: 0.5
      });

      // Generic reveal
      document.querySelectorAll(".reveal").forEach(el => {
        ScrollTrigger.create({
          trigger: el, start: "top 85%",
          onEnter: () => el.classList.add("in")
        });
      });

      // Parallax-ish background
      ScrollTrigger.create({
        trigger: document.body, start: "top top", end: "bottom bottom",
        onUpdate: (self) => { window.__scrollT = self.progress; }
      });
    } else {
      // fallback simple reveal
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("in"); });
      }, { threshold: 0.15 });
      document.querySelectorAll(".reveal").forEach(el => io.observe(el));
      document.querySelectorAll(".hero-title .line > span").forEach(s => s.style.transform = "translateY(0)");
    }
  }

  // ----------- Contact form: save to CRM intake (Supabase) -----------
  window.sendWhatsApp = async function (e) {
    e.preventDefault();
    const lang = document.documentElement.dataset.lang;
    const name = document.getElementById("f-name").value.trim();
    const phone = document.getElementById("f-phone").value.trim();
    const type = document.getElementById("f-type").value;
    const msg = document.getElementById("f-msg").value.trim();

    // Save to CRM intake (Supabase via DB, or localStorage as fallback).
    if (window.CRM && CRM.intake) {
      try {
        const submitBtn = document.querySelector("#contactForm button[type=submit]");
        if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = ".7"; }
        await CRM.intake.submit({ name, phone, type, message: msg, source: "نموذج الموقع" });
      } catch (ex) { console.warn("intake submit failed:", ex); }

      // Show success state in the form
      const form = document.getElementById("contactForm");
      const successHTML = lang === "ar"
        ? `<div class="form-success">
             <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
             <h3>تم استلام طلبك بنجاح</h3>
             <p>شكراً ${name}، فريق لواء كونسبت سيتواصل معك على الرقم ${phone} خلال 24 ساعة.</p>
             <button type="button" class="btn btn-line" onclick="location.reload()">إرسال طلب آخر</button>
           </div>`
        : `<div class="form-success">
             <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
             <h3>Your request was received</h3>
             <p>Thanks ${name}, the Liwa Concept team will reach you on ${phone} within 24 hours.</p>
             <button type="button" class="btn btn-line" onclick="location.reload()">Send another</button>
           </div>`;
      form.innerHTML = successHTML;
    } else {
      // Fallback: WhatsApp
      const text = lang === "ar"
        ? `أهلاً، أنا ${name}\nجوالي: ${phone}\nنوع المشروع: ${type}\n\nتفاصيل المشروع:\n${msg}`
        : `Hello, I'm ${name}\nPhone: ${phone}\nProject type: ${type}\n\nProject details:\n${msg}`;
      const url = `https://wa.me/966544668836?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    }
    return false;
  };

  // ----------- 3D Background (Three.js) -----------
  function init3D() {
    if (!window.THREE) return;
    const canvas = document.getElementById("bg3d");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 18);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(6, 8, 6);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0xb89968, 0.5);
    rim.position.set(-6, -4, -2);
    scene.add(rim);

    // === Floating architectural objects ===
    const group = new THREE.Group();
    scene.add(group);

    // Material — black architectural
    const matBlack = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a, metalness: 0.15, roughness: 0.55, flatShading: false
    });
    const matGold = new THREE.MeshStandardMaterial({
      color: 0xb89968, metalness: 0.6, roughness: 0.35
    });
    const matWire = new THREE.MeshBasicMaterial({
      color: 0x0c0c0c, wireframe: true, transparent: true, opacity: 0.18
    });

    // Small gold sphere accent (subtle)
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 48, 48),
      matGold
    );
    sphere.position.set(-13, 4, -6);
    group.add(sphere);

    const sphere2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 48, 48),
      matGold.clone()
    );
    sphere2.position.set(13, -3, -7);
    group.add(sphere2);

    // Floating wire-frames — far corners only, very subtle
    const wires = [];
    const cornerPositions = [
      { x: -14, y:  5 },
      { x: -13, y: -5 },
      { x:  14, y:  5.5 },
      { x:  15, y: -4 }
    ];
    cornerPositions.forEach((pos, i) => {
      const g = new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.4, 0);
      const m = new THREE.Mesh(g, matWire.clone());
      m.position.set(pos.x, pos.y, -7 - Math.random() * 3);
      m.userData.rotSpeed = (Math.random() - 0.5) * 0.004;
      m.userData.floatSpeed = 0.4 + Math.random() * 0.5;
      m.userData.floatBase = m.position.y;
      group.add(m);
      wires.push(m);
    });

    // Particle field (dust) — fewer, lighter
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x0a0a0a, size: 0.04, transparent: true, opacity: 0.35
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Mouse parallax
    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    window.addEventListener("mousemove", (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 0.6;
      targetY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    });

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animate
    const clock = new THREE.Clock();
    function animate() {
      const t = clock.getElapsedTime();
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;

      group.rotation.y = curX * 0.4;
      group.rotation.x = -curY * 0.3;

      sphere.position.y = 4 + Math.sin(t * 1.2) * 0.2;
      sphere2.position.y = -3 + Math.sin(t * 1.2 + 1.4) * 0.2;

      wires.forEach((m, i) => {
        m.rotation.x += m.userData.rotSpeed;
        m.rotation.y += m.userData.rotSpeed * 0.7;
        m.position.y = m.userData.floatBase + Math.sin(t * m.userData.floatSpeed + i) * 0.3;
      });

      particles.rotation.y += 0.0006;

      // Scroll-based camera shift
      const sp = window.__scrollT || 0;
      camera.position.y = -sp * 4;
      camera.position.z = 18 - sp * 2;
      camera.lookAt(0, -sp * 2, 0);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();
  }


  // ----------- Tilt cards -----------
  document.querySelectorAll("[data-tilt]").forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });

  // Init 3D when ready
  if (document.readyState === "complete") {
    init3D();
  } else {
    window.addEventListener("load", init3D);
  }

  // ----------- Auto-load client logos -----------
  // If you drop images into assets/clients/, name them logo1.png … logoN.png
  function tryLoadClientLogos() {
    const grid = document.getElementById("clientsGrid");
    if (!grid) return;
    const slots = Array.from(grid.querySelectorAll(".client-slot"));
    slots.forEach((slot, i) => {
      const img = new Image();
      const src = `assets/clients/logo${i + 1}.png`;
      img.onload = () => {
        slot.classList.remove("client-slot");
        slot.classList.add("client-logo");
        slot.innerHTML = "";
        slot.appendChild(img);
      };
      img.onerror = () => {};
      img.src = src;
      img.alt = `Client ${i + 1}`;
    });
  }
  window.addEventListener("load", tryLoadClientLogos);

})();
