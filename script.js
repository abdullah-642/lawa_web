// ============================================
// LIWA CONCEPT — 3D + interactions
// ============================================

(function () {
  "use strict";

  // ----------- Preloader -----------
  const preloader = document.getElementById("preloader");
  const bar = document.getElementById("preloaderBar");
  const count = document.getElementById("preloaderCount");
  let progress = 0;

  const loaderInterval = setInterval(() => {
    progress += Math.random() * 12 + 6;
    if (progress >= 100) {
      progress = 100;
      clearInterval(loaderInterval);
      setTimeout(() => preloader.classList.add("gone"), 400);
      setTimeout(initReveal, 700);
    }
    bar.style.width = progress + "%";
    count.textContent = Math.floor(progress) + "%";
  }, 110);

  // ----------- Year -----------
  document.getElementById("year").textContent = new Date().getFullYear();

  // ----------- Sticky Header -----------
  const header = document.getElementById("siteHeader");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 60);
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
    document.querySelectorAll(".section-head, .about-text, .about-visual, .exp-card, .step, .vision-box, .clients-grid, .contact-left, .contact-form")
      .forEach(el => el.classList.add("reveal"));

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      // Animate hero title lines in
      gsap.to(".hero-title .line > span", {
        y: 0, duration: 1.2, ease: "expo.out", stagger: 0.15, delay: 0.1
      });
      gsap.from(".hero-meta, .hero-sub, .hero-cta, .hero-stats", {
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

      // Counters
      document.querySelectorAll(".stat-num").forEach(el => {
        const target = +el.dataset.count;
        const obj = { v: 0 };
        ScrollTrigger.create({
          trigger: el, start: "top 90%", once: true,
          onEnter: () => gsap.to(obj, {
            v: target, duration: 2, ease: "power2.out",
            onUpdate: () => el.firstChild.nodeValue = Math.floor(obj.v)
          })
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

  // ----------- WhatsApp form -----------
  window.sendWhatsApp = function (e) {
    e.preventDefault();
    const lang = document.documentElement.dataset.lang;
    const name = document.getElementById("f-name").value.trim();
    const phone = document.getElementById("f-phone").value.trim();
    const type = document.getElementById("f-type").value;
    const msg = document.getElementById("f-msg").value.trim();

    const text = lang === "ar"
      ? `أهلاً، أنا ${name}\nجوالي: ${phone}\nنوع المشروع: ${type}\n\nتفاصيل المشروع:\n${msg}`
      : `Hello, I'm ${name}\nPhone: ${phone}\nProject type: ${type}\n\nProject details:\n${msg}`;

    const url = `https://wa.me/966544668836?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
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

  // ----------- About card 3D (small isolated scene) -----------
  function initAboutCard() {
    if (!window.THREE) return;
    const mount = document.getElementById("aboutCube");
    if (!mount) return;
    const w = mount.clientWidth || 400;
    const h = mount.clientHeight || 500;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(2, 1.6, 4.4);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const l1 = new THREE.DirectionalLight(0xffffff, 1.4);
    l1.position.set(4, 6, 3);
    scene.add(l1);
    const l2 = new THREE.DirectionalLight(0xb89968, 0.7);
    l2.position.set(-4, -2, -3);
    scene.add(l2);

    // Stack of architectural slabs (concept of layered design)
    const grp = new THREE.Group();
    const colors = [0xf6f4ef, 0xb89968, 0x0a0a0a];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1.6 - i * 0.25, 0.18, 1.6 - i * 0.25),
        new THREE.MeshStandardMaterial({ color: colors[i], metalness: i === 1 ? 0.6 : 0.1, roughness: i === 1 ? 0.35 : 0.6 })
      );
      m.position.y = -0.6 + i * 0.5;
      grp.add(m);
    }
    // Top thin frame
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.02, 12, 64),
      new THREE.MeshStandardMaterial({ color: 0xb89968, metalness: 0.7, roughness: 0.25 })
    );
    frame.position.y = 0.55;
    frame.rotation.x = Math.PI / 2;
    grp.add(frame);

    scene.add(grp);

    let mx = 0, my = 0, tx = 0, ty = 0;
    mount.addEventListener("mousemove", (e) => {
      const r = mount.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 1.2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 0.8;
    });

    const onResize = () => {
      const nw = mount.clientWidth || 400, nh = mount.clientHeight || 500;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    function loop() {
      const t = clock.getElapsedTime();
      mx += (tx - mx) * 0.08;
      my += (ty - my) * 0.08;
      grp.rotation.y = t * 0.25 + mx * 0.6;
      grp.rotation.x = my * 0.4;
      frame.rotation.z = t * 0.4;
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }
    loop();
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
    init3D(); initAboutCard();
  } else {
    window.addEventListener("load", () => { init3D(); initAboutCard(); });
  }

  // ----------- Auto-load local project photos (overrides Unsplash defaults) -----------
  function tryLoadLocalProjects() {
    const cards = document.querySelectorAll(".project-card .pc-img img");
    cards.forEach((img, i) => {
      const test = new Image();
      const local = `assets/projects/project${i + 1}.jpg`;
      test.onload = () => { img.src = local; };
      test.onerror = () => {};
      test.src = local;
    });
  }
  window.addEventListener("load", tryLoadLocalProjects);

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
