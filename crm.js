/* ============================================
   LIWA CRM — Core (Auth, Store, Views, Router)
   ============================================ */

window.CRM = (function () {
  "use strict";

  // ========== Storage ==========
  const NS = "liwa.crm.";
  const store = {
    get(key, fb) {
      try {
        const v = localStorage.getItem(NS + key);
        return v ? JSON.parse(v) : fb;
      } catch { return fb; }
    },
    set(key, val) {
      try { localStorage.setItem(NS + key, JSON.stringify(val)); } catch {}
    }
  };

  // ========== Seed data ==========
  function seedIfEmpty() {
    if (!store.get("users")) {
      store.set("users", [
        { id: "u1", username: "admin", password: "Liwa@2026", name: "المسؤول", role: "Admin" }
      ]);
    }
    if (!store.get("requests")) store.set("requests", []);
    if (!store.get("customers")) store.set("customers", []);
    if (!store.get("projects")) store.set("projects", []);
    if (!store.get("quotes")) store.set("quotes", []);
    if (!store.get("invoices")) store.set("invoices", []);
    if (!store.get("tasks")) store.set("tasks", []);
    if (!store.get("employees")) store.set("employees", []);
    if (!store.get("settings")) {
      store.set("settings", {
        companyName: "لواء كونسبت",
        companyEmail: "info@liwa1.com",
        companyPhone: "0544668836",
        whatsapp: "966544668836"
      });
    }
  }
  seedIfEmpty();

  // ========== Auth (delegates to DB layer if available) ==========
  const auth = {
    async login(u, p) {
      if (window.DB && window.DB.login) {
        const sess = await window.DB.login(u, p);
        return !!sess;
      }
      // Local fallback
      const users = store.get("users", []);
      const found = users.find(x => x.username === u && x.password === p);
      if (found) {
        store.set("session", { id: found.id, username: found.username, name: found.name, role: found.role, ts: Date.now() });
        return true;
      }
      return false;
    },
    logout() {
      if (window.DB && window.DB.logout) window.DB.logout();
      try { localStorage.removeItem(NS + "session"); } catch {}
    },
    current() {
      if (window.DB && window.DB.currentSession) return window.DB.currentSession();
      return store.get("session");
    },
    async changePassword(oldP, newP) {
      if (window.DB && window.DB.changePassword) return await window.DB.changePassword(oldP, newP);
      const sess = auth.current();
      if (!sess) return false;
      const users = store.get("users", []);
      const idx = users.findIndex(u => u.id === sess.id);
      if (idx === -1 || users[idx].password !== oldP) return false;
      users[idx].password = newP;
      store.set("users", users);
      return true;
    }
  };

  // ========== DB bridge (Supabase via window.DB if available) ==========
  async function dbUpsert(table, item) {
    if (window.DB && window.DB.upsert) return await window.DB.upsert(table, item);
    const arr = store.get(table, []);
    const idx = arr.findIndex(x => x.id === item.id);
    if (idx >= 0) arr[idx] = { ...arr[idx], ...item }; else arr.unshift(item);
    store.set(table, arr);
    return { ok: true, offline: true };
  }
  async function dbRemove(table, id) {
    if (window.DB && window.DB.remove) return await window.DB.remove(table, id);
    store.set(table, store.get(table, []).filter(x => x.id !== id));
    return { ok: true, offline: true };
  }

  // ========== Helpers ==========
  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("ar-SA-u-ca-gregory", { year: "numeric", month: "short", day: "numeric" });
  };
  const fmtDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("ar-SA-u-ca-gregory", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  const fmtCurrency = (n) => new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n || 0);
  const uid = () => "id_" + Math.random().toString(36).slice(2, 10);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function toast(msg, kind = "success") {
    const el = document.getElementById("crmToast");
    if (!el) return;
    el.textContent = msg;
    el.className = "crm-toast " + kind;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 2800);
  }

  function modal(html) {
    const m = document.getElementById("crmModal");
    document.getElementById("cmBody").innerHTML = html;
    m.hidden = false;
    m.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
  }
  function closeModal() { document.getElementById("crmModal").hidden = true; }

  // ========== Status maps ==========
  const REQ_STATUSES = {
    new:       { ar: "جديد",      cls: "new" },
    review:    { ar: "قيد المراجعة", cls: "review" },
    contacted: { ar: "تم التواصل",   cls: "contacted" },
    converted: { ar: "تم التحويل",   cls: "converted" },
    archived:  { ar: "مؤرشف",       cls: "archived" }
  };
  const PROJ_STATUSES = {
    discovery: { ar: "اكتشاف",  cls: "discovery" },
    design:    { ar: "تصميم",   cls: "design" },
    execution: { ar: "تنفيذ",   cls: "execution" },
    delivered: { ar: "مسلَّم",   cls: "delivered" }
  };
  const QUOTE_STATUSES = {
    draft:    { ar: "مسودة",   cls: "draft" },
    sent:     { ar: "مُرسل",   cls: "sent" },
    accepted: { ar: "مقبول",  cls: "accepted" },
    rejected: { ar: "مرفوض",  cls: "rejected" }
  };
  const INVOICE_STATUSES = {
    draft:   { ar: "مسودة",  cls: "draft" },
    sent:    { ar: "مُرسلة", cls: "sent" },
    paid:    { ar: "مدفوعة", cls: "converted" },
    overdue: { ar: "متأخرة", cls: "overdue" }
  };
  const PERMISSIONS = [
    { key: "requests", label: "الطلبات" },
    { key: "customers", label: "العملاء" },
    { key: "projects", label: "المشاريع" },
    { key: "quotes", label: "عروض الأسعار" },
    { key: "invoices", label: "الفواتير" },
    { key: "tasks", label: "المهام" },
    { key: "employees", label: "شؤون الموظفين" },
    { key: "reports", label: "التقارير" },
    { key: "users", label: "المستخدمون" },
    { key: "settings", label: "الإعدادات" }
  ];
  const JOB_TITLES = [
    "مدير عام", "مدير تنفيذي", "مدير مشاريع", "مهندس معماري", "مهندس ديكور",
    "مصمم داخلي", "مدير مالي", "محاسب", "مسؤول مبيعات", "مدير تسويق",
    "مشرف موقع", "فني تنفيذ", "مساعد إداري", "مسؤول علاقات عملاء", "أخرى"
  ];
  const TASK_STATUSES = {
    pending: { ar: "قيد التنفيذ", cls: "pending" },
    done:    { ar: "منجز",      cls: "done" },
    overdue: { ar: "متأخر",     cls: "overdue" }
  };

  const PROJECT_TYPES = [
    "سبا / منتجع صحي", "حمام مغربي / غرفة بخار", "صالون تجميل نسائي", "صالون حلاقة رجالي",
    "مركز عناية / تجميل", "عيادة / مركز طبي", "مطعم", "كافيه / مقهى",
    "محل تجاري / بوتيك", "معرض / شوروم", "مكتب / مساحة عمل", "صالة رياضية / جيم",
    "فيلا / قصر", "شقة سكنية راقية", "فندق / جناح فندقي", "أخرى"
  ];

  // ========== Views ==========
  const views = {};

  // ---------- Dashboard ----------
  views.dashboard = function () {
    const reqs = store.get("requests", []);
    const customers = store.get("customers", []);
    const projects = store.get("projects", []);
    const quotes = store.get("quotes", []);
    const newRequests = reqs.filter(r => r.status === "new").length;
    const activeProjects = projects.filter(p => p.status !== "delivered").length;
    const acceptedQuotesTotal = quotes.filter(q => q.status === "accepted").reduce((s, q) => s + (q.total || 0), 0);

    // Requests by type (top 6)
    const byType = {};
    reqs.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1; });
    const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxVal = Math.max(1, ...topTypes.map(t => t[1]));

    const recent = [...reqs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    return `
      <div class="page-head">
        <h1>مرحباً، ${esc(auth.current()?.name || "")}</h1>
        <div class="ph-actions">
          <button class="btn btn-line" onclick="CRM.app.go('requests')">عرض كل الطلبات</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card accent">
          <div class="sc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v4H4zM4 12h16v4H4zM4 20h10"/></svg></div>
          <span class="sc-label">طلبات جديدة</span>
          <div class="sc-value">${newRequests}</div>
          <span class="sc-meta">إجمالي الطلبات: ${reqs.length}</span>
        </div>
        <div class="stat-card blue">
          <div class="sc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 22c0-4 4-7 8-7s8 3 8 7"/></svg></div>
          <span class="sc-label">العملاء</span>
          <div class="sc-value">${customers.length}</div>
          <span class="sc-meta">قاعدة العملاء الكلية</span>
        </div>
        <div class="stat-card orange">
          <div class="sc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h18v14H3zM8 7V3h8v4"/></svg></div>
          <span class="sc-label">مشاريع نشطة</span>
          <div class="sc-value">${activeProjects}</div>
          <span class="sc-meta">من ${projects.length} مشروع</span>
        </div>
        <div class="stat-card green">
          <div class="sc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          <span class="sc-label">عروض مقبولة</span>
          <div class="sc-value">${fmtCurrency(acceptedQuotesTotal)}</div>
          <span class="sc-meta">إجمالي القيمة</span>
        </div>
      </div>

      <div class="two-col">
        <div class="panel">
          <div class="panel-head">
            <h3>أحدث الطلبات</h3>
            <button class="btn btn-line" onclick="CRM.app.go('requests')">عرض الكل</button>
          </div>
          <div class="panel-body tight">
            ${recent.length === 0 ? emptyState("لا توجد طلبات بعد", "ستظهر هنا الطلبات الواردة من نموذج الموقع.") : `
              <div class="table-wrap">
                <table class="crm-table">
                  <thead><tr><th>الاسم</th><th>النوع</th><th>التاريخ</th><th>الحالة</th></tr></thead>
                  <tbody>
                    ${recent.map(r => `
                      <tr style="cursor:pointer" onclick="CRM.app.openRequest('${r.id}')">
                        <td class="td-strong">${esc(r.name)}</td>
                        <td>${esc(r.type)}</td>
                        <td>${fmtDate(r.date)}</td>
                        <td>${pill(REQ_STATUSES[r.status])}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>
              </div>`}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>أكثر أنواع المشاريع طلباً</h3></div>
          <div class="panel-body">
            ${topTypes.length === 0 ? `<p style="color:var(--mute);font-size:13px">لا توجد بيانات بعد.</p>` : `
              <div class="chart-bars">
                ${topTypes.map(([t, n]) => `
                  <div class="chart-bar">
                    <span class="cb-value">${n}</span>
                    <div class="cb-fill" style="height:${(n / maxVal) * 130}px"></div>
                    <span class="cb-label">${esc(t.split(" / ")[0])}</span>
                  </div>`).join("")}
              </div>`}
          </div>
        </div>
      </div>
    `;
  };

  // ---------- Requests ----------
  views.requests = function () {
    const reqs = store.get("requests", []).sort((a, b) => new Date(b.date) - new Date(a.date));
    const q = (document.getElementById("reqSearch")?.value || "").toLowerCase();
    const filter = document.getElementById("reqFilter")?.value || "all";
    const filtered = reqs.filter(r => {
      const matchQ = !q || (r.name + r.phone + r.type + r.message).toLowerCase().includes(q);
      const matchS = filter === "all" || r.status === filter;
      return matchQ && matchS;
    });

    return `
      <div class="page-head">
        <h1>استقبال الطلبات (${reqs.length})</h1>
        <div class="ph-actions">
          <button class="btn btn-line" onclick="CRM.app.demoRequest()">+ طلب تجريبي</button>
          <button class="btn btn-dark" onclick="CRM.app.openRequestForm()">+ طلب يدوي</button>
        </div>
      </div>

      <div class="panel">
        <div class="toolbar">
          <input id="reqSearch" oninput="CRM.app.render()" class="tool-input" placeholder="ابحث بالاسم، الجوال، أو نوع المشروع..." value="${esc(q)}"/>
          <select id="reqFilter" onchange="CRM.app.render()">
            <option value="all">كل الحالات</option>
            ${Object.entries(REQ_STATUSES).map(([k, v]) => `<option value="${k}" ${filter === k ? "selected" : ""}>${v.ar}</option>`).join("")}
          </select>
        </div>
        <div class="panel-body tight">
          ${filtered.length === 0 ? emptyState("لا توجد طلبات", "عبئ نموذج التواصل في الموقع أو أضف طلباً يدوياً.") : `
            <div class="table-wrap">
              <table class="crm-table">
                <thead>
                  <tr>
                    <th>#</th><th>الاسم</th><th>الجوال</th><th>نوع المشروع</th>
                    <th>التاريخ</th><th>الحالة</th><th style="text-align:end">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map((r, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td class="td-strong">${esc(r.name)}</td>
                      <td dir="ltr">${esc(r.phone)}</td>
                      <td>${esc(r.type)}</td>
                      <td>${fmtDateTime(r.date)}</td>
                      <td>${pill(REQ_STATUSES[r.status])}</td>
                      <td class="td-actions">
                        <button class="btn-icon" onclick="CRM.app.openRequest('${r.id}')" title="فتح">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <a class="btn-icon" href="https://wa.me/966${(r.phone || '').replace(/^0/, '').replace(/\\s+/g, '')}" target="_blank" title="واتساب">
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6 2 2 6 2 12c0 2 .5 3.8 1.5 5.3L2 22l4.8-1.5C8.3 21.5 10 22 12 22c6 0 10-4 10-10S18 2 12 2z"/></svg>
                        </a>
                        <button class="btn-icon btn-danger" onclick="CRM.app.deleteRequest('${r.id}')" title="حذف">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14"/></svg>
                        </button>
                      </td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `;
  };

  // ---------- Customers ----------
  views.customers = function () {
    const customers = store.get("customers", []);
    return `
      <div class="page-head">
        <h1>العملاء (${customers.length})</h1>
        <div class="ph-actions">
          <button class="btn btn-dark" onclick="CRM.app.openCustomerForm()">+ إضافة عميل</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-body tight">
          ${customers.length === 0 ? emptyState("لا يوجد عملاء", "حوّل طلباً إلى عميل من شاشة الطلبات، أو أضف عميلاً يدوياً.") : `
            <div class="table-wrap">
              <table class="crm-table">
                <thead><tr><th>#</th><th>الاسم</th><th>الجوال</th><th>البريد</th><th>المصدر</th><th>تاريخ الإضافة</th><th></th></tr></thead>
                <tbody>
                  ${customers.map((c, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td class="td-strong">${esc(c.name)}</td>
                      <td dir="ltr">${esc(c.phone || "—")}</td>
                      <td>${esc(c.email || "—")}</td>
                      <td>${esc(c.source || "يدوي")}</td>
                      <td>${fmtDate(c.date)}</td>
                      <td class="td-actions">
                        <button class="btn-icon btn-danger" onclick="CRM.app.deleteCustomer('${c.id}')">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `;
  };

  // ---------- Projects ----------
  views.projects = function () {
    const projects = store.get("projects", []);
    const customers = store.get("customers", []);
    const cName = (id) => customers.find(c => c.id === id)?.name || "—";

    return `
      <div class="page-head">
        <h1>المشاريع (${projects.length})</h1>
        <div class="ph-actions">
          <button class="btn btn-dark" onclick="CRM.app.openProjectForm()">+ مشروع جديد</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-body tight">
          ${projects.length === 0 ? emptyState("لا توجد مشاريع", "أضف مشروعاً أو حوّل طلباً إلى مشروع.") : `
            <div class="table-wrap">
              <table class="crm-table">
                <thead><tr><th>اسم المشروع</th><th>العميل</th><th>النوع</th><th>القيمة</th><th>التقدم</th><th>الحالة</th><th></th></tr></thead>
                <tbody>
                  ${projects.map(p => `
                    <tr>
                      <td class="td-strong">${esc(p.name)}</td>
                      <td>${esc(cName(p.customerId))}</td>
                      <td>${esc(p.type)}</td>
                      <td dir="ltr">${fmtCurrency(p.value)}</td>
                      <td style="min-width:140px">
                        <span style="font-size:11px;color:var(--mute)">${p.progress || 0}%</span>
                        <div class="progress-bar"><div style="width:${p.progress || 0}%"></div></div>
                      </td>
                      <td>${pill(PROJ_STATUSES[p.status])}</td>
                      <td class="td-actions">
                        <button class="btn-icon btn-danger" onclick="CRM.app.deleteProject('${p.id}')">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `;
  };

  // ---------- Quotes ----------
  views.quotes = function () {
    const quotes = store.get("quotes", []);
    const customers = store.get("customers", []);
    const cName = (id) => customers.find(c => c.id === id)?.name || "—";

    return `
      <div class="page-head">
        <h1>عروض الأسعار (${quotes.length})</h1>
        <div class="ph-actions">
          <button class="btn btn-dark" onclick="CRM.app.openQuoteForm()">+ عرض جديد</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-body tight">
          ${quotes.length === 0 ? emptyState("لا توجد عروض", "أنشئ عرض سعر لأحد العملاء.") : `
            <div class="table-wrap">
              <table class="crm-table">
                <thead><tr><th>رقم العرض</th><th>العميل</th><th>القيمة</th><th>التاريخ</th><th>الحالة</th><th></th></tr></thead>
                <tbody>
                  ${quotes.map(q => `
                    <tr>
                      <td class="td-strong">${esc(q.number)}</td>
                      <td>${esc(cName(q.customerId))}</td>
                      <td dir="ltr">${fmtCurrency(q.total)}</td>
                      <td>${fmtDate(q.date)}</td>
                      <td>${pill(QUOTE_STATUSES[q.status])}</td>
                      <td class="td-actions">
                        <button class="btn-icon btn-danger" onclick="CRM.app.deleteQuote('${q.id}')">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `;
  };

  // ---------- Tasks ----------
  views.tasks = function () {
    const tasks = store.get("tasks", []);
    return `
      <div class="page-head">
        <h1>المهام (${tasks.length})</h1>
        <div class="ph-actions">
          <button class="btn btn-dark" onclick="CRM.app.openTaskForm()">+ مهمة جديدة</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-body tight">
          ${tasks.length === 0 ? emptyState("لا توجد مهام", "أضف مهمة جديدة لتتبع أعمال الفريق.") : `
            <div class="table-wrap">
              <table class="crm-table">
                <thead><tr><th>المهمة</th><th>تاريخ الاستحقاق</th><th>الحالة</th><th></th></tr></thead>
                <tbody>
                  ${tasks.map(t => `
                    <tr>
                      <td class="td-strong">${esc(t.title)}</td>
                      <td>${fmtDate(t.dueDate)}</td>
                      <td>${pill(TASK_STATUSES[t.status])}</td>
                      <td class="td-actions">
                        ${t.status !== "done" ? `<button class="btn-icon" onclick="CRM.app.completeTask('${t.id}')" title="إكمال">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12l5 5L20 7"/></svg>
                        </button>` : ""}
                        <button class="btn-icon btn-danger" onclick="CRM.app.deleteTask('${t.id}')">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `;
  };

  // ---------- Reports ----------
  views.reports = function () {
    const reqs = store.get("requests", []);
    const projects = store.get("projects", []);
    const quotes = store.get("quotes", []);

    // Monthly requests (last 6 months)
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("ar-SA-u-ca-gregory", { month: "short" }), count: 0 });
    }
    reqs.forEach(r => {
      const d = new Date(r.date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find(x => x.key === k);
      if (m) m.count++;
    });
    const maxM = Math.max(1, ...months.map(m => m.count));

    // Conversion stats
    const totalLeads = reqs.length;
    const converted = reqs.filter(r => r.status === "converted").length;
    const convRate = totalLeads ? Math.round((converted / totalLeads) * 100) : 0;

    // Project status breakdown
    const statusBreak = {};
    Object.keys(PROJ_STATUSES).forEach(k => statusBreak[k] = 0);
    projects.forEach(p => { if (statusBreak[p.status] !== undefined) statusBreak[p.status]++; });

    const totalQuoted = quotes.reduce((s, q) => s + (q.total || 0), 0);
    const totalAccepted = quotes.filter(q => q.status === "accepted").reduce((s, q) => s + (q.total || 0), 0);

    return `
      <div class="page-head"><h1>التقارير</h1></div>

      <div class="stats-grid">
        <div class="stat-card accent">
          <span class="sc-label">إجمالي الطلبات</span>
          <div class="sc-value">${totalLeads}</div>
          <span class="sc-meta">من بداية التشغيل</span>
        </div>
        <div class="stat-card green">
          <span class="sc-label">تحويل إلى عميل</span>
          <div class="sc-value">${convRate}%</div>
          <span class="sc-meta">${converted} طلب تم تحويله</span>
        </div>
        <div class="stat-card blue">
          <span class="sc-label">قيمة العروض</span>
          <div class="sc-value">${fmtCurrency(totalQuoted)}</div>
          <span class="sc-meta">إجمالي ${quotes.length} عرض</span>
        </div>
        <div class="stat-card orange">
          <span class="sc-label">عروض مقبولة</span>
          <div class="sc-value">${fmtCurrency(totalAccepted)}</div>
          <span class="sc-meta">المحقّق فعلياً</span>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>الطلبات الشهرية (آخر 6 أشهر)</h3></div>
        <div class="panel-body">
          <div class="chart-bars">
            ${months.map(m => `
              <div class="chart-bar">
                <span class="cb-value">${m.count}</span>
                <div class="cb-fill" style="height:${(m.count / maxM) * 150}px"></div>
                <span class="cb-label">${m.label}</span>
              </div>`).join("")}
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>حالة المشاريع</h3></div>
        <div class="panel-body">
          ${Object.entries(statusBreak).map(([k, n]) => `
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line-soft)">
              <span>${pill(PROJ_STATUSES[k])}</span>
              <span class="td-strong">${n}</span>
            </div>`).join("")}
        </div>
      </div>
    `;
  };

  // ---------- Invoices ----------
  views.invoices = function () {
    const invoices = store.get("invoices", []);
    const customers = store.get("customers", []);
    const cName = (id) => customers.find(c => c.id === id)?.name || "—";

    return `
      <div class="page-head">
        <h1>الفواتير (${invoices.length})</h1>
        <div class="ph-actions">
          <button class="btn btn-dark" onclick="CRM.app.openInvoiceForm()">+ فاتورة جديدة</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-body tight">
          ${invoices.length === 0 ? emptyState("لا توجد فواتير", "أنشئ فاتورة جديدة لأحد العملاء.") : `
            <div class="table-wrap">
              <table class="crm-table">
                <thead><tr><th>رقم الفاتورة</th><th>العميل</th><th>المبلغ</th><th>التاريخ</th><th>الحالة</th><th></th></tr></thead>
                <tbody>
                  ${invoices.map(inv => `
                    <tr>
                      <td class="td-strong">${esc(inv.number)}</td>
                      <td>${esc(cName(inv.customerId)) || esc(inv.customerName || "—")}</td>
                      <td dir="ltr">${fmtCurrency(inv.total)}</td>
                      <td>${fmtDate(inv.date)}</td>
                      <td>${pill(INVOICE_STATUSES[inv.status])}</td>
                      <td class="td-actions">
                        <button class="btn-icon" onclick="CRM.app.viewInvoice('${inv.id}')" title="عرض">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button class="btn-icon" onclick="CRM.app.downloadInvoicePDF('${inv.id}')" title="تنزيل PDF">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        </button>
                        <button class="btn-icon btn-danger" onclick="CRM.app.deleteInvoice('${inv.id}')" title="حذف">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `;
  };

  // ---------- Employees ----------
  views.employees = function () {
    const employees = store.get("employees", []);
    const totalSalaries = employees.reduce((s, e) => s + (+e.salary || 0), 0);

    return `
      <div class="page-head">
        <h1>شؤون الموظفين (${employees.length})</h1>
        <div class="ph-actions">
          <button class="btn btn-dark" onclick="CRM.app.openEmployeeForm()">+ إضافة موظف</button>
        </div>
      </div>

      ${employees.length > 0 ? `
        <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
          <div class="stat-card accent">
            <span class="sc-label">عدد الموظفين</span>
            <div class="sc-value">${employees.length}</div>
            <span class="sc-meta">إجمالي الفريق</span>
          </div>
          <div class="stat-card green">
            <span class="sc-label">إجمالي الرواتب</span>
            <div class="sc-value" style="font-size:32px">${fmtCurrency(totalSalaries)}</div>
            <span class="sc-meta">شهرياً</span>
          </div>
          <div class="stat-card blue">
            <span class="sc-label">متوسط الراتب</span>
            <div class="sc-value" style="font-size:32px">${fmtCurrency(employees.length ? totalSalaries / employees.length : 0)}</div>
            <span class="sc-meta">للموظف</span>
          </div>
        </div>
      ` : ""}

      <div class="panel">
        <div class="panel-body tight">
          ${employees.length === 0 ? emptyState("لا يوجد موظفون", "أضف أول موظف لفريق العمل.") : `
            <div class="table-wrap">
              <table class="crm-table">
                <thead><tr><th>الاسم</th><th>المسمى الوظيفي</th><th>الجوال</th><th>الراتب</th><th>تاريخ المباشرة</th><th></th></tr></thead>
                <tbody>
                  ${employees.map(emp => `
                    <tr>
                      <td class="td-strong">
                        <div style="display:flex;align-items:center;gap:10px">
                          <div class="cs-avatar" style="width:32px;height:32px;font-size:13px">${esc(emp.name.charAt(0).toUpperCase())}</div>
                          <div><span>${esc(emp.name)}</span>${emp.email ? `<br><span style="font-size:11px;color:var(--mute)">${esc(emp.email)}</span>` : ""}</div>
                        </div>
                      </td>
                      <td>${esc(emp.title)}</td>
                      <td dir="ltr">${esc(emp.phone || "—")}</td>
                      <td dir="ltr">${fmtCurrency(emp.salary)}</td>
                      <td>${fmtDate(emp.startDate || emp.date)}</td>
                      <td class="td-actions">
                        <button class="btn-icon" onclick="CRM.app.openEmployeeForm('${emp.id}')" title="تعديل">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-icon btn-danger" onclick="CRM.app.deleteEmployee('${emp.id}')" title="حذف">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `;
  };

  // ---------- Users ----------
  views.users = function () {
    const users = store.get("users", []);
    const sess = auth.current();
    return `
      <div class="page-head">
        <h1>المستخدمون (${users.length})</h1>
        <div class="ph-actions">
          <button class="btn btn-dark" onclick="CRM.app.openUserForm()">+ إضافة مستخدم</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-body tight">
          ${users.length === 0 ? emptyState("لا يوجد مستخدمون", "أضف المستخدم الأول للنظام.") : `
            <div class="table-wrap">
              <table class="crm-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>اسم المستخدم</th>
                    <th>الدور</th>
                    <th>تاريخ الإضافة</th>
                    <th style="text-align:end">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map(u => `
                    <tr>
                      <td class="td-strong">
                        <div style="display:flex;align-items:center;gap:10px">
                          <div class="cs-avatar" style="width:32px;height:32px;font-size:13px">${esc(u.name.charAt(0).toUpperCase())}</div>
                          <span>${esc(u.name)}${u.id === sess.id ? ' <span style="font-size:10px;color:var(--accent);letter-spacing:.1em">(أنت)</span>' : ''}</span>
                        </div>
                      </td>
                      <td><code style="background:var(--bg-deep);padding:2px 8px;border-radius:2px;font-family:monospace">${esc(u.username)}</code></td>
                      <td><span class="pill ${u.role === 'Admin' ? 'converted' : 'review'}">${esc(u.role)}</span></td>
                      <td>${fmtDate(u.date || u.created_at)}</td>
                      <td class="td-actions">
                        <button class="btn-icon" onclick="CRM.app.openUserForm('${u.id}')" title="تعديل">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        ${u.id !== sess.id ? `
                          <button class="btn-icon btn-danger" onclick="CRM.app.deleteUser('${u.id}')" title="حذف">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14"/></svg>
                          </button>
                        ` : ''}
                      </td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `;
  };

  // ---------- Settings ----------
  views.settings = function () {
    const s = store.get("settings", {});
    const u = auth.current();
    return `
      <div class="page-head"><h1>الإعدادات</h1></div>
      <div class="two-col">
        <div class="panel">
          <div class="panel-head"><h3>معلومات الشركة</h3></div>
          <div class="panel-body">
            <form id="settingsForm" onsubmit="return CRM.app.saveSettings(event)">
              <div class="form-grid">
                <div class="field full"><label>اسم الشركة</label><input id="setCompany" value="${esc(s.companyName)}"/></div>
                <div class="field"><label>البريد</label><input id="setEmail" value="${esc(s.companyEmail)}"/></div>
                <div class="field"><label>الجوال</label><input id="setPhone" value="${esc(s.companyPhone)}" dir="ltr"/></div>
                <div class="field full"><label>رقم الواتساب (بصيغة دولية بدون +)</label><input id="setWA" value="${esc(s.whatsapp)}" dir="ltr"/></div>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-dark">حفظ</button>
              </div>
            </form>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>الحساب</h3></div>
          <div class="panel-body">
            <p style="margin-bottom:14px;color:var(--mute);font-size:13px">
              المستخدم: <strong style="color:var(--ink)">${esc(u.username)}</strong>
            </p>
            <form onsubmit="return CRM.app.changePassword(event)">
              <div class="field" style="margin-bottom:14px"><label>كلمة المرور الحالية</label><input type="password" id="oldPw" required/></div>
              <div class="field" style="margin-bottom:14px"><label>كلمة المرور الجديدة</label><input type="password" id="newPw" required minlength="6"/></div>
              <button type="submit" class="btn btn-dark btn-block">تغيير كلمة المرور</button>
            </form>
          </div>
        </div>

        <div class="panel" style="grid-column: span 2">
          <div class="panel-head"><h3>إدارة البيانات</h3></div>
          <div class="panel-body">
            <p style="color:var(--mute);font-size:13px;margin-bottom:14px">
              يتم حفظ بيانات النظام في متصفحك (localStorage). يمكنك تصدير نسخة احتياطية أو استيراد بيانات سابقة.
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-line" onclick="CRM.app.exportData()">⇩ تصدير البيانات</button>
              <label class="btn btn-line" style="cursor:pointer">
                ⇧ استيراد البيانات
                <input type="file" accept=".json" style="display:none" onchange="CRM.app.importData(event)"/>
              </label>
              <button class="btn btn-line btn-danger" onclick="CRM.app.resetData()" style="margin-inline-start:auto">حذف كل البيانات</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // ========== Helpers (HTML) ==========
  function pill(meta) {
    if (!meta) return "—";
    return `<span class="pill ${meta.cls}">${meta.ar}</span>`;
  }
  function emptyState(title, sub) {
    return `
      <div class="empty">
        <svg class="em-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M9 12h6M9 16h6M9 8h6"/><rect x="5" y="3" width="14" height="18" rx="2"/></svg>
        <h4>${title}</h4>
        <p>${sub}</p>
      </div>`;
  }

  // ========== App / Router ==========
  const app = {
    async init() {
      window.addEventListener("hashchange", () => app.render());
      document.querySelectorAll("[data-view]").forEach(a => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          app.go(a.dataset.view);
        });
      });

      // Pull latest data from Supabase
      if (window.DB && window.DB.pullAll) {
        try {
          if (window.DB.ready) {
            const view = document.getElementById("crmView");
            if (view) view.innerHTML = `<div class="empty"><h4>جاري المزامنة مع السحابة...</h4></div>`;
          }
          await window.DB.pullAll();
        } catch (e) { console.warn("[CRM] sync failed:", e); }
      }

      // Scan for overdue tasks (notify once per task)
      const tasks = store.get("tasks", []);
      const seenOverdue = new Set(store.get("seenOverdue", []));
      const today = new Date().toISOString().slice(0, 10);
      tasks.forEach(t => {
        if (t.status !== "done" && t.dueDate && t.dueDate < today && !seenOverdue.has(t.id)) {
          notif.add({ type: "task", title: `مهمة متأخرة: ${t.title}`, body: `موعد الاستحقاق: ${t.dueDate}`, link: "tasks" });
          seenOverdue.add(t.id);
        }
      });
      store.set("seenOverdue", [...seenOverdue]);

      // Initial notification render
      notif.render();
      app.render();
    },

    go(view) {
      location.hash = view;
    },

    currentView() {
      const v = location.hash.replace("#", "") || "dashboard";
      return views[v] ? v : "dashboard";
    },

    render() {
      const v = app.currentView();
      // sidebar active
      document.querySelectorAll(".cs-link").forEach(a => a.classList.toggle("active", a.dataset.view === v));
      // breadcrumb
      const titles = {
        dashboard: ["لوحة التحكم", "نظرة عامة على نشاط الشركة"],
        requests: ["استقبال الطلبات", "جميع الطلبات الواردة من نموذج التواصل"],
        customers: ["العملاء", "قاعدة بيانات العملاء"],
        projects: ["المشاريع", "متابعة المشاريع الجارية"],
        quotes: ["عروض الأسعار", "إدارة عروض الأسعار"],
        invoices: ["الفواتير", "إنشاء وإدارة الفواتير وتصديرها PDF"],
        tasks: ["المهام", "متابعة مهام الفريق"],
        employees: ["شؤون الموظفين", "إدارة الموظفين والرواتب والمسميات"],
        reports: ["التقارير", "إحصائيات وتحليلات"],
        users: ["المستخدمون", "إدارة حسابات الفريق وصلاحياتهم"],
        settings: ["الإعدادات", "إعدادات النظام والحساب"]
      };
      const [t, s] = titles[v];
      document.getElementById("tbSection").textContent = t;
      document.getElementById("tbSub").textContent = s;
      // badge
      const newReqs = store.get("requests", []).filter(r => r.status === "new").length;
      const badge = document.getElementById("badgeRequests");
      if (badge) {
        badge.textContent = newReqs;
        badge.style.display = newReqs > 0 ? "inline-block" : "none";
      }
      // close mobile sidebar
      document.getElementById("crmSidebar")?.classList.remove("open");
      // render
      document.getElementById("crmView").innerHTML = views[v]();
    },

    // ===== Request actions =====
    openRequest(id) {
      const reqs = store.get("requests", []);
      const r = reqs.find(x => x.id === id);
      if (!r) return;
      modal(`
        <h3>تفاصيل الطلب</h3>
        <p class="cm-sub">رقم: ${r.id} · ${fmtDateTime(r.date)}</p>
        <div class="detail-field"><span class="df-label">الاسم</span><span class="df-value">${esc(r.name)}</span></div>
        <div class="detail-field"><span class="df-label">الجوال</span><span class="df-value" dir="ltr">${esc(r.phone)}</span></div>
        <div class="detail-field"><span class="df-label">نوع المشروع</span><span class="df-value">${esc(r.type)}</span></div>
        <div class="detail-field"><span class="df-label">تفاصيل الطلب</span><span class="df-value" style="white-space:pre-wrap">${esc(r.message)}</span></div>
        <div class="detail-field"><span class="df-label">الحالة</span>
          <select id="reqStatus" style="margin-top:4px;padding:8px 12px;border:1px solid var(--line);border-radius:3px;width:100%">
            ${Object.entries(REQ_STATUSES).map(([k, v]) => `<option value="${k}" ${r.status === k ? "selected" : ""}>${v.ar}</option>`).join("")}
          </select>
        </div>
        <div class="form-actions">
          <a class="btn btn-line" href="https://wa.me/966${(r.phone || '').replace(/^0/, '').replace(/\\s+/g, '')}" target="_blank">فتح واتساب</a>
          <button class="btn btn-line" onclick="CRM.app.convertRequest('${r.id}')">تحويل لعميل</button>
          <button class="btn btn-dark" onclick="CRM.app.saveRequestStatus('${r.id}')">حفظ التغييرات</button>
        </div>
      `);
    },

    async saveRequestStatus(id) {
      const reqs = store.get("requests", []);
      const r = reqs.find(x => x.id === id);
      if (!r) return;
      r.status = document.getElementById("reqStatus").value;
      await dbUpsert("requests", r);
      closeModal(); app.render();
      toast("تم تحديث الحالة");
    },

    async deleteRequest(id) {
      if (!confirm("هل تريد حذف هذا الطلب؟")) return;
      await dbRemove("requests", id);
      app.render();
      toast("تم الحذف");
    },

    async convertRequest(id) {
      const reqs = store.get("requests", []);
      const r = reqs.find(x => x.id === id);
      if (!r) return;
      const customers = store.get("customers", []);
      const exists = customers.find(c => c.phone === r.phone);
      if (!exists) {
        await dbUpsert("customers", {
          id: uid(), name: r.name, phone: r.phone, email: "",
          source: "نموذج الموقع", date: new Date().toISOString(), requestId: r.id
        });
      }
      r.status = "converted";
      await dbUpsert("requests", r);
      closeModal();
      app.render();
      toast("تم تحويل الطلب إلى عميل");
    },

    openRequestForm() {
      modal(`
        <h3>إضافة طلب يدوي</h3>
        <p class="cm-sub">سجّل طلباً وصلك عبر اتصال أو وسيلة أخرى.</p>
        <form onsubmit="return CRM.app.saveManualRequest(event)">
          <div class="form-grid">
            <div class="field"><label>الاسم *</label><input id="mr-name" required/></div>
            <div class="field"><label>الجوال *</label><input id="mr-phone" required dir="ltr"/></div>
            <div class="field full"><label>نوع المشروع</label>
              <select id="mr-type">${PROJECT_TYPES.map(t => `<option>${t}</option>`).join("")}</select>
            </div>
            <div class="field full"><label>تفاصيل الطلب</label><textarea id="mr-msg" rows="3"></textarea></div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-line" data-close>إلغاء</button>
            <button type="submit" class="btn btn-dark">حفظ الطلب</button>
          </div>
        </form>
      `);
    },

    async saveManualRequest(e) {
      e.preventDefault();
      const item = {
        id: uid(),
        name: document.getElementById("mr-name").value.trim(),
        phone: document.getElementById("mr-phone").value.trim(),
        type: document.getElementById("mr-type").value,
        message: document.getElementById("mr-msg").value.trim(),
        status: "new",
        date: new Date().toISOString(),
        source: "يدوي"
      };
      await dbUpsert("requests", item);
      notif.add({ type: "new_request", title: `طلب يدوي: ${item.name}`, body: `نوع: ${item.type}`, link: "requests" });
      closeModal(); app.render();
      toast("تم إضافة الطلب");
      return false;
    },

    async demoRequest() {
      const samples = [
        { name: "خالد العتيبي", phone: "0501234567", type: "سبا / منتجع صحي", message: "أرغب بتنفيذ سبا بمساحة 200 متر شمال الرياض، يحتوي على حمام مغربي وغرفة بخار." },
        { name: "هند المطيري", phone: "0567654321", type: "صالون تجميل نسائي", message: "صالون نسائي بمساحة 180 متر — كوافير، أظافر، عناية." },
        { name: "ماجد الدوسري", phone: "0512223344", type: "مطعم", message: "مطعم إيطالي راقي 350 متر — حي حطين." }
      ];
      const s = samples[Math.floor(Math.random() * samples.length)];
      const item = { id: uid(), ...s, status: "new", date: new Date().toISOString(), source: "تجريبي" };
      await dbUpsert("requests", item);
      notif.add({ type: "new_request", title: `طلب جديد من ${s.name}`, body: `نوع: ${s.type}`, link: "requests" });
      app.render();
      toast("تم إضافة طلب تجريبي");
    },

    // ===== Customer actions =====
    openCustomerForm() {
      modal(`
        <h3>إضافة عميل</h3>
        <form onsubmit="return CRM.app.saveCustomer(event)">
          <div class="form-grid">
            <div class="field"><label>الاسم *</label><input id="c-name" required/></div>
            <div class="field"><label>الجوال</label><input id="c-phone" dir="ltr"/></div>
            <div class="field"><label>البريد</label><input id="c-email" type="email"/></div>
            <div class="field"><label>المصدر</label><input id="c-source" value="يدوي"/></div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-line" data-close>إلغاء</button>
            <button type="submit" class="btn btn-dark">حفظ</button>
          </div>
        </form>
      `);
    },
    async saveCustomer(e) {
      e.preventDefault();
      await dbUpsert("customers", {
        id: uid(),
        name: document.getElementById("c-name").value.trim(),
        phone: document.getElementById("c-phone").value.trim(),
        email: document.getElementById("c-email").value.trim(),
        source: document.getElementById("c-source").value.trim() || "يدوي",
        date: new Date().toISOString()
      });
      closeModal(); app.render(); toast("تم إضافة العميل");
      return false;
    },
    async deleteCustomer(id) {
      if (!confirm("حذف هذا العميل؟")) return;
      await dbRemove("customers", id);
      app.render(); toast("تم الحذف");
    },

    // ===== Project actions =====
    openProjectForm() {
      const customers = store.get("customers", []);
      modal(`
        <h3>مشروع جديد</h3>
        <form onsubmit="return CRM.app.saveProject(event)">
          <div class="form-grid">
            <div class="field full"><label>اسم المشروع *</label><input id="p-name" required/></div>
            <div class="field"><label>العميل</label>
              <select id="p-customer">
                <option value="">— اختر —</option>
                ${customers.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}
              </select>
            </div>
            <div class="field"><label>النوع</label>
              <select id="p-type">${PROJECT_TYPES.map(t => `<option>${t}</option>`).join("")}</select>
            </div>
            <div class="field"><label>القيمة (ريال)</label><input id="p-value" type="number" min="0" value="0"/></div>
            <div class="field"><label>التقدم %</label><input id="p-progress" type="number" min="0" max="100" value="0"/></div>
            <div class="field full"><label>الحالة</label>
              <select id="p-status">${Object.entries(PROJ_STATUSES).map(([k, v]) => `<option value="${k}">${v.ar}</option>`).join("")}</select>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-line" data-close>إلغاء</button>
            <button type="submit" class="btn btn-dark">إنشاء</button>
          </div>
        </form>
      `);
    },
    async saveProject(e) {
      e.preventDefault();
      await dbUpsert("projects", {
        id: uid(),
        name: document.getElementById("p-name").value.trim(),
        customerId: document.getElementById("p-customer").value || null,
        type: document.getElementById("p-type").value,
        value: +document.getElementById("p-value").value || 0,
        progress: +document.getElementById("p-progress").value || 0,
        status: document.getElementById("p-status").value,
        date: new Date().toISOString()
      });
      closeModal(); app.render(); toast("تم إنشاء المشروع");
      return false;
    },
    async deleteProject(id) {
      if (!confirm("حذف هذا المشروع؟")) return;
      await dbRemove("projects", id);
      app.render(); toast("تم الحذف");
    },

    // ===== Quote actions =====
    openQuoteForm() {
      const customers = store.get("customers", []);
      modal(`
        <h3>عرض سعر جديد</h3>
        <form onsubmit="return CRM.app.saveQuote(event)">
          <div class="form-grid">
            <div class="field"><label>رقم العرض *</label><input id="q-num" required value="Q-${Date.now().toString().slice(-6)}"/></div>
            <div class="field"><label>العميل *</label>
              <select id="q-customer" required>
                <option value="">— اختر —</option>
                ${customers.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}
              </select>
            </div>
            <div class="field"><label>القيمة الإجمالية</label><input id="q-total" type="number" min="0" required value="0"/></div>
            <div class="field"><label>الحالة</label>
              <select id="q-status">${Object.entries(QUOTE_STATUSES).map(([k, v]) => `<option value="${k}">${v.ar}</option>`).join("")}</select>
            </div>
            <div class="field full"><label>ملاحظات</label><textarea id="q-notes" rows="3"></textarea></div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-line" data-close>إلغاء</button>
            <button type="submit" class="btn btn-dark">حفظ</button>
          </div>
        </form>
      `);
    },
    async saveQuote(e) {
      e.preventDefault();
      await dbUpsert("quotes", {
        id: uid(),
        number: document.getElementById("q-num").value.trim(),
        customerId: document.getElementById("q-customer").value || null,
        total: +document.getElementById("q-total").value || 0,
        status: document.getElementById("q-status").value,
        notes: document.getElementById("q-notes").value.trim(),
        date: new Date().toISOString()
      });
      closeModal(); app.render(); toast("تم حفظ العرض");
      return false;
    },
    async deleteQuote(id) {
      if (!confirm("حذف هذا العرض؟")) return;
      await dbRemove("quotes", id);
      app.render(); toast("تم الحذف");
    },

    // ===== Task actions =====
    openTaskForm() {
      modal(`
        <h3>مهمة جديدة</h3>
        <form onsubmit="return CRM.app.saveTask(event)">
          <div class="form-grid">
            <div class="field full"><label>عنوان المهمة *</label><input id="t-title" required/></div>
            <div class="field"><label>تاريخ الاستحقاق</label><input id="t-due" type="date"/></div>
            <div class="field"><label>الحالة</label>
              <select id="t-status">${Object.entries(TASK_STATUSES).map(([k, v]) => `<option value="${k}">${v.ar}</option>`).join("")}</select>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-line" data-close>إلغاء</button>
            <button type="submit" class="btn btn-dark">حفظ</button>
          </div>
        </form>
      `);
    },
    async saveTask(e) {
      e.preventDefault();
      const due = document.getElementById("t-due").value;
      await dbUpsert("tasks", {
        id: uid(),
        title: document.getElementById("t-title").value.trim(),
        dueDate: due || null,
        status: document.getElementById("t-status").value,
        date: new Date().toISOString()
      });
      closeModal(); app.render(); toast("تم إضافة المهمة");
      return false;
    },
    async completeTask(id) {
      const tasks = store.get("tasks", []);
      const t = tasks.find(x => x.id === id);
      if (!t) return;
      t.status = "done";
      await dbUpsert("tasks", t);
      app.render(); toast("تم إنجاز المهمة");
    },
    async deleteTask(id) {
      if (!confirm("حذف هذه المهمة؟")) return;
      await dbRemove("tasks", id);
      app.render(); toast("تم الحذف");
    },

    // ===== Invoices =====
    openInvoiceForm() {
      const customers = store.get("customers", []);
      modal(`
        <h3>فاتورة جديدة</h3>
        <p class="cm-sub">سيتم احتساب ضريبة القيمة المضافة 15% تلقائياً.</p>
        <form onsubmit="return CRM.app.saveInvoice(event)">
          <div class="form-grid">
            <div class="field"><label>رقم الفاتورة</label><input id="inv-num" value="INV-${Date.now().toString().slice(-6)}"/></div>
            <div class="field"><label>العميل</label>
              <select id="inv-customer">
                <option value="">— اختر أو اكتب اسماً يدوياً —</option>
                ${customers.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}
              </select>
            </div>
            <div class="field full"><label>اسم العميل (إن لم يكن في القائمة)</label><input id="inv-cname" placeholder="اتركه فارغاً إن اخترت من القائمة"/></div>
          </div>

          <div style="margin-top:18px;padding:14px;background:var(--bg-deep);border-radius:3px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <strong style="font-size:13px">البنود</strong>
              <button type="button" class="btn btn-line" onclick="CRM.app.addInvoiceItem()" style="padding:6px 12px;font-size:12px">+ إضافة بند</button>
            </div>
            <div id="inv-items"></div>
          </div>

          <div class="form-grid" style="margin-top:18px">
            <div class="field"><label>الحالة</label>
              <select id="inv-status">${Object.entries(INVOICE_STATUSES).map(([k, v]) => `<option value="${k}">${v.ar}</option>`).join("")}</select>
            </div>
            <div class="field"><label>تاريخ الاستحقاق</label><input type="date" id="inv-due"/></div>
            <div class="field full"><label>ملاحظات</label><textarea id="inv-notes" rows="2" placeholder="ملاحظات تظهر أسفل الفاتورة..."></textarea></div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-line" data-close>إلغاء</button>
            <button type="submit" class="btn btn-dark">حفظ الفاتورة</button>
          </div>
        </form>
      `);
      app.addInvoiceItem();
    },

    addInvoiceItem() {
      const wrap = document.getElementById("inv-items");
      const row = document.createElement("div");
      row.className = "inv-item-row";
      row.style.cssText = "display:grid;grid-template-columns:2fr 70px 100px 80px 28px;gap:8px;margin-bottom:8px;align-items:center";
      row.innerHTML = `
        <input class="ii-desc" placeholder="وصف البند" style="padding:8px 10px;border:1px solid var(--line);border-radius:3px;font-size:13px" required/>
        <input class="ii-qty" type="number" min="1" value="1" placeholder="الكمية" style="padding:8px 10px;border:1px solid var(--line);border-radius:3px;font-size:13px;text-align:center" required/>
        <input class="ii-price" type="number" min="0" step="0.01" value="0" placeholder="السعر" style="padding:8px 10px;border:1px solid var(--line);border-radius:3px;font-size:13px;text-align:center" required/>
        <span class="ii-total" style="font-size:13px;font-weight:600;text-align:center" dir="ltr">0</span>
        <button type="button" onclick="this.parentElement.remove()" style="background:transparent;border:0;cursor:pointer;color:var(--red);font-size:18px;padding:4px">×</button>
      `;
      const update = () => {
        const qty = +row.querySelector(".ii-qty").value || 0;
        const price = +row.querySelector(".ii-price").value || 0;
        row.querySelector(".ii-total").textContent = (qty * price).toFixed(2);
      };
      row.querySelector(".ii-qty").addEventListener("input", update);
      row.querySelector(".ii-price").addEventListener("input", update);
      wrap.appendChild(row);
    },

    async saveInvoice(e) {
      e.preventDefault();
      const items = [...document.querySelectorAll(".inv-item-row")].map(r => ({
        desc: r.querySelector(".ii-desc").value.trim(),
        qty: +r.querySelector(".ii-qty").value || 0,
        price: +r.querySelector(".ii-price").value || 0
      })).filter(i => i.desc);
      if (!items.length) { toast("أضف بنداً واحداً على الأقل", "error"); return false; }
      const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
      const vat = subtotal * 0.15;
      const total = subtotal + vat;

      const customerId = document.getElementById("inv-customer").value;
      const customerName = document.getElementById("inv-cname").value.trim();
      const customers = store.get("customers", []);
      const cname = customerId ? customers.find(c => c.id === customerId)?.name : customerName;

      const inv = {
        id: uid(),
        number: document.getElementById("inv-num").value.trim(),
        customerId: customerId || null,
        customerName: cname || "—",
        items, subtotal, vat, total,
        status: document.getElementById("inv-status").value,
        dueDate: document.getElementById("inv-due").value || null,
        notes: document.getElementById("inv-notes").value.trim(),
        date: new Date().toISOString()
      };
      const invoices = store.get("invoices", []);
      invoices.unshift(inv);
      store.set("invoices", invoices);
      if (window.DB && window.DB.sb) {
        try { await window.DB.sb.from("invoices").upsert(inv); } catch (e) {}
      }
      notif.add({ type: "info", title: `فاتورة جديدة ${inv.number}`, body: `${cname || "—"} · ${fmtCurrency(total)}`, link: "invoices" });
      closeModal(); app.render(); toast("تم إنشاء الفاتورة");
      return false;
    },

    viewInvoice(id) {
      const inv = store.get("invoices", []).find(x => x.id === id);
      if (!inv) return;
      const s = store.get("settings", {});
      modal(`
        <div id="invoice-printable" style="background:#fff;color:#0a0a0a;padding:36px;font-family:'Tajawal',sans-serif;direction:rtl">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #0a0a0a;margin-bottom:24px">
            <div>
              <img src="assets/logo.svg" alt="Liwa Concept" style="height:64px;width:auto;max-width:200px"/>
              <div style="margin-top:12px;font-size:12px;color:#444;line-height:1.7">
                <strong style="color:#0a0a0a;font-size:13px">${esc(s.companyName || "لواء كونسبت")}</strong><br/>
                ${esc(s.companyEmail || "info@liwa1.com")} · <span dir="ltr">${esc(s.companyPhone || "0544668836")}</span><br/>
                https://www.liwa1.com · الرياض، المملكة العربية السعودية
              </div>
            </div>
            <div style="text-align:left">
              <h2 style="font-family:'Cormorant Garamond',serif;font-size:34px;letter-spacing:.05em;margin:0">INVOICE</h2>
              <div style="font-size:12px;color:#444;margin-top:8px;line-height:1.7">
                <strong>رقم الفاتورة:</strong> ${esc(inv.number)}<br/>
                <strong>التاريخ:</strong> ${fmtDate(inv.date)}<br/>
                ${inv.dueDate ? `<strong>تاريخ الاستحقاق:</strong> ${fmtDate(inv.dueDate)}<br/>` : ""}
                <strong>الحالة:</strong> ${INVOICE_STATUSES[inv.status]?.ar || ""}
              </div>
            </div>
          </div>

          <div style="margin-bottom:20px">
            <span style="font-size:10px;letter-spacing:.3em;color:#888;text-transform:uppercase">فاتورة إلى</span>
            <div style="font-size:16px;font-weight:700;margin-top:4px">${esc(inv.customerName)}</div>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px">
            <thead>
              <tr style="background:#f6f4ef;border-bottom:2px solid #0a0a0a">
                <th style="padding:12px 14px;text-align:right;font-size:11px;letter-spacing:.1em">الوصف</th>
                <th style="padding:12px;text-align:center;width:70px;font-size:11px;letter-spacing:.1em">الكمية</th>
                <th style="padding:12px;text-align:center;width:110px;font-size:11px;letter-spacing:.1em">السعر</th>
                <th style="padding:12px;text-align:center;width:110px;font-size:11px;letter-spacing:.1em">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map(i => `
                <tr style="border-bottom:1px solid #eee">
                  <td style="padding:12px 14px">${esc(i.desc)}</td>
                  <td style="padding:12px;text-align:center">${i.qty}</td>
                  <td style="padding:12px;text-align:center" dir="ltr">${(+i.price).toFixed(2)}</td>
                  <td style="padding:12px;text-align:center" dir="ltr"><strong>${(i.qty * i.price).toFixed(2)}</strong></td>
                </tr>`).join("")}
            </tbody>
          </table>

          <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
            <table style="font-size:13px;width:280px">
              <tr><td style="padding:6px 0;color:#666">الإجمالي قبل الضريبة:</td><td style="padding:6px 0;text-align:left" dir="ltr">${inv.subtotal.toFixed(2)} ر.س</td></tr>
              <tr><td style="padding:6px 0;color:#666">ضريبة القيمة المضافة (15%):</td><td style="padding:6px 0;text-align:left" dir="ltr">${inv.vat.toFixed(2)} ر.س</td></tr>
              <tr style="border-top:2px solid #0a0a0a"><td style="padding:10px 0;font-weight:700;font-size:15px">المبلغ الإجمالي:</td><td style="padding:10px 0;text-align:left;font-weight:700;font-size:15px" dir="ltr">${inv.total.toFixed(2)} ر.س</td></tr>
            </table>
          </div>

          ${inv.notes ? `<div style="padding:16px;background:#f6f4ef;border-inline-start:3px solid #b89968;font-size:12px;line-height:1.7;margin-bottom:24px"><strong>ملاحظات:</strong><br/>${esc(inv.notes)}</div>` : ""}

          <div style="border-top:1px solid #eee;padding-top:16px;text-align:center;font-size:11px;color:#888;letter-spacing:.1em">
            شكراً لتعاملكم مع لواء كونسبت · www.liwa1.com
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-line" data-close>إغلاق</button>
          <button type="button" class="btn btn-dark" onclick="CRM.app.downloadInvoicePDF('${inv.id}')">
            ⇩ تنزيل PDF
          </button>
        </div>
      `);
    },

    async downloadInvoicePDF(id) {
      const inv = store.get("invoices", []).find(x => x.id === id);
      if (!inv) return;
      // Ensure the invoice template is in DOM
      if (!document.getElementById("invoice-printable")) {
        app.viewInvoice(id);
        await new Promise(r => setTimeout(r, 200));
      }
      const el = document.getElementById("invoice-printable");
      if (!el || !window.html2pdf) { toast("تعذّر إنشاء PDF", "error"); return; }
      toast("جاري إنشاء ملف PDF...");
      try {
        await html2pdf().set({
          margin: 0,
          filename: `Liwa-Invoice-${inv.number}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        }).from(el).save();
      } catch (e) {
        console.error(e);
        toast("فشل تنزيل PDF: " + e.message, "error");
      }
    },

    async deleteInvoice(id) {
      if (!confirm("حذف هذه الفاتورة؟")) return;
      store.set("invoices", store.get("invoices", []).filter(i => i.id !== id));
      if (window.DB && window.DB.sb) {
        try { await window.DB.sb.from("invoices").delete().eq("id", id); } catch (e) {}
      }
      app.render(); toast("تم الحذف");
    },

    // ===== Employees =====
    openEmployeeForm(id) {
      const employees = store.get("employees", []);
      const editing = id ? employees.find(e => e.id === id) : null;
      modal(`
        <h3>${editing ? "تعديل بيانات موظف" : "إضافة موظف جديد"}</h3>
        <form onsubmit="return CRM.app.saveEmployee(event, ${editing ? `'${editing.id}'` : "null"})">
          <div class="form-grid">
            <div class="field"><label>الاسم الكامل *</label><input id="emp-name" required value="${editing ? esc(editing.name) : ""}"/></div>
            <div class="field"><label>المسمى الوظيفي *</label>
              <select id="emp-title" required>${JOB_TITLES.map(t => `<option ${editing && editing.title === t ? "selected" : ""}>${t}</option>`).join("")}</select>
            </div>
            <div class="field"><label>الجوال</label><input id="emp-phone" dir="ltr" value="${editing ? esc(editing.phone || "") : ""}"/></div>
            <div class="field"><label>البريد</label><input type="email" id="emp-email" value="${editing ? esc(editing.email || "") : ""}"/></div>
            <div class="field"><label>الراتب الشهري (ريال) *</label><input type="number" id="emp-salary" min="0" step="100" required value="${editing ? (editing.salary || 0) : 0}"/></div>
            <div class="field"><label>تاريخ المباشرة</label><input type="date" id="emp-start" value="${editing ? (editing.startDate || "") : new Date().toISOString().slice(0,10)}"/></div>
            <div class="field full"><label>ملاحظات</label><textarea id="emp-notes" rows="2">${editing ? esc(editing.notes || "") : ""}</textarea></div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-line" data-close>إلغاء</button>
            <button type="submit" class="btn btn-dark">${editing ? "حفظ التغييرات" : "إضافة موظف"}</button>
          </div>
        </form>
      `);
    },

    async saveEmployee(e, editId) {
      e.preventDefault();
      const employees = store.get("employees", []);
      const payload = {
        name: document.getElementById("emp-name").value.trim(),
        title: document.getElementById("emp-title").value,
        phone: document.getElementById("emp-phone").value.trim(),
        email: document.getElementById("emp-email").value.trim(),
        salary: +document.getElementById("emp-salary").value || 0,
        startDate: document.getElementById("emp-start").value || null,
        notes: document.getElementById("emp-notes").value.trim()
      };
      if (editId) {
        const emp = employees.find(x => x.id === editId);
        Object.assign(emp, payload);
        store.set("employees", employees);
        if (window.DB && window.DB.sb) {
          try { await window.DB.sb.from("employees").upsert({ id: emp.id, ...payload, date: emp.date }); } catch (e) {}
        }
        toast("تم تحديث بيانات الموظف");
      } else {
        const emp = { id: uid(), ...payload, date: new Date().toISOString() };
        employees.push(emp);
        store.set("employees", employees);
        if (window.DB && window.DB.sb) {
          try { await window.DB.sb.from("employees").upsert(emp); } catch (e) {}
        }
        notif.add({ type: "user", title: `موظف جديد: ${payload.name}`, body: `المسمى: ${payload.title}`, link: "employees" });
        toast("تم إضافة الموظف");
      }
      closeModal(); app.render();
      return false;
    },

    async deleteEmployee(id) {
      if (!confirm("حذف هذا الموظف؟")) return;
      store.set("employees", store.get("employees", []).filter(e => e.id !== id));
      if (window.DB && window.DB.sb) {
        try { await window.DB.sb.from("employees").delete().eq("id", id); } catch (e) {}
      }
      app.render(); toast("تم الحذف");
    },

    // ===== Users (with permissions, job title, salary) =====
    openUserForm(id) {
      const users = store.get("users", []);
      const editing = id ? users.find(u => u.id === id) : null;
      const perms = editing ? (editing.permissions || []) : ["dashboard"];
      modal(`
        <h3>${editing ? "تعديل مستخدم" : "إضافة مستخدم جديد"}</h3>
        <p class="cm-sub">${editing ? "حدّث بيانات المستخدم وصلاحياته." : "أضف عضواً جديداً للفريق ليصل للنظام مع تحديد صلاحياته."}</p>
        <form onsubmit="return CRM.app.saveUser(event, ${editing ? `'${editing.id}'` : "null"})">
          <div class="form-grid">
            <div class="field"><label>الاسم الكامل *</label><input id="u-name" required value="${editing ? esc(editing.name) : ""}"/></div>
            <div class="field"><label>اسم المستخدم *</label><input id="u-username" required pattern="[a-zA-Z0-9_\\.]+" value="${editing ? esc(editing.username) : ""}" ${editing ? "readonly" : ""} title="حروف إنجليزية وأرقام فقط"/></div>
            <div class="field"><label>${editing ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور *"}</label><input type="password" id="u-pass" ${editing ? "" : "required"} minlength="6" placeholder="6 أحرف على الأقل"/></div>
            <div class="field"><label>الدور</label>
              <select id="u-role">
                <option value="Admin" ${editing && editing.role === "Admin" ? "selected" : ""}>Admin — صلاحيات كاملة</option>
                <option value="Manager" ${editing && editing.role === "Manager" ? "selected" : ""}>Manager — مدير قسم</option>
                <option value="Sales" ${editing && editing.role === "Sales" ? "selected" : ""}>Sales — مبيعات</option>
                <option value="Accountant" ${editing && editing.role === "Accountant" ? "selected" : ""}>Accountant — محاسب</option>
                <option value="Viewer" ${editing && editing.role === "Viewer" ? "selected" : ""}>Viewer — قراءة فقط</option>
              </select>
            </div>
            <div class="field"><label>المسمى الوظيفي</label>
              <select id="u-title">${JOB_TITLES.map(t => `<option ${editing && editing.title === t ? "selected" : ""}>${t}</option>`).join("")}</select>
            </div>
            <div class="field"><label>الراتب الشهري (ريال)</label><input type="number" id="u-salary" min="0" step="100" value="${editing ? (editing.salary || 0) : 0}"/></div>
            <div class="field full">
              <label>الصلاحيات (اختر الأقسام المسموح بها)</label>
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:6px;padding:12px;background:var(--bg-deep);border-radius:3px">
                ${PERMISSIONS.map(p => `
                  <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
                    <input type="checkbox" name="perm" value="${p.key}" ${perms.includes(p.key) || (editing && editing.role === "Admin") ? "checked" : ""}/>
                    <span>${esc(p.label)}</span>
                  </label>`).join("")}
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-line" data-close>إلغاء</button>
            <button type="submit" class="btn btn-dark">${editing ? "حفظ التغييرات" : "إضافة المستخدم"}</button>
          </div>
        </form>
      `);
    },

    async saveUser(e, editId) {
      e.preventDefault();
      const users = store.get("users", []);
      const username = document.getElementById("u-username").value.trim();
      const name = document.getElementById("u-name").value.trim();
      const pass = document.getElementById("u-pass").value;
      const role = document.getElementById("u-role").value;
      const title = document.getElementById("u-title").value;
      const salary = +document.getElementById("u-salary").value || 0;
      const permissions = [...document.querySelectorAll('input[name="perm"]:checked')].map(c => c.value);

      if (editId) {
        const u = users.find(x => x.id === editId);
        if (!u) return false;
        u.name = name; u.role = role; u.title = title; u.salary = salary; u.permissions = permissions;
        if (pass) u.password = pass;
        store.set("users", users);
        if (window.DB && window.DB.sb) {
          try { await window.DB.sb.from("app_users").upsert({ id: u.id, username: u.username, password: u.password, name, role, title, salary, permissions }); } catch (e) {}
        }
        toast("تم تحديث المستخدم");
      } else {
        if (users.find(x => x.username === username)) {
          toast("اسم المستخدم مستخدم بالفعل", "error");
          return false;
        }
        const newUser = { id: uid(), username, password: pass, name, role, title, salary, permissions, date: new Date().toISOString() };
        users.push(newUser);
        store.set("users", users);
        if (window.DB && window.DB.sb) {
          try { await window.DB.sb.from("app_users").upsert(newUser); } catch (e) {}
        }
        notif.add({ type: "user", title: `تم إضافة مستخدم جديد: ${name}`, body: `الدور: ${role} · ${title}`, link: "users" });
        toast("تم إضافة المستخدم");
      }
      closeModal(); app.render();
      return false;
    },

    async deleteUser(id) {
      const sess = auth.current();
      if (id === sess.id) {
        toast("لا يمكنك حذف حسابك", "error");
        return;
      }
      const users = store.get("users", []);
      const u = users.find(x => x.id === id);
      if (!u) return;
      if (!confirm(`حذف المستخدم "${u.name}"؟`)) return;
      store.set("users", users.filter(x => x.id !== id));
      if (window.DB && window.DB.sb) {
        try { await window.DB.sb.from("app_users").delete().eq("id", id); } catch (e) {}
      }
      app.render();
      toast("تم حذف المستخدم");
    },

    // ===== Settings =====
    async saveSettings(e) {
      e.preventDefault();
      const s = {
        companyName: document.getElementById("setCompany").value.trim(),
        companyEmail: document.getElementById("setEmail").value.trim(),
        companyPhone: document.getElementById("setPhone").value.trim(),
        whatsapp: document.getElementById("setWA").value.trim()
      };
      if (window.DB && window.DB.saveSettings) {
        await window.DB.saveSettings(s);
      } else {
        store.set("settings", s);
      }
      toast("تم حفظ الإعدادات");
      return false;
    },
    async changePassword(e) {
      e.preventDefault();
      const oldP = document.getElementById("oldPw").value;
      const newP = document.getElementById("newPw").value;
      const ok = await auth.changePassword(oldP, newP);
      if (ok) {
        toast("تم تغيير كلمة المرور");
        document.getElementById("oldPw").value = "";
        document.getElementById("newPw").value = "";
      } else {
        toast("كلمة المرور الحالية غير صحيحة", "error");
      }
      return false;
    },
    exportData() {
      const data = {
        users: store.get("users", []),
        requests: store.get("requests", []),
        customers: store.get("customers", []),
        projects: store.get("projects", []),
        quotes: store.get("quotes", []),
        tasks: store.get("tasks", []),
        settings: store.get("settings", {}),
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `liwa-crm-backup-${Date.now()}.json`;
      a.click();
    },
    importData(e) {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          if (confirm("سيتم استبدال البيانات الحالية. متابعة؟")) {
            ["users", "requests", "customers", "projects", "quotes", "tasks", "settings"]
              .forEach(k => data[k] !== undefined && store.set(k, data[k]));
            toast("تم استيراد البيانات");
            app.render();
          }
        } catch {
          toast("ملف غير صالح", "error");
        }
      };
      r.readAsText(f);
    },
    async resetData() {
      if (!confirm("سيتم حذف جميع الطلبات والعملاء والمشاريع. هل أنت متأكد؟")) return;
      if (!confirm("تأكيد نهائي — هذه العملية لا يمكن التراجع عنها.")) return;
      // Wipe Supabase tables row by row (or could use truncate via RPC)
      if (window.DB && window.DB.sb) {
        for (const t of ["requests", "customers", "projects", "quotes", "tasks"]) {
          try { await window.DB.sb.from(t).delete().neq("id", ""); } catch (e) { /* ignore */ }
        }
      }
      ["requests", "customers", "projects", "quotes", "tasks"].forEach(k => store.set(k, []));
      toast("تم حذف البيانات");
      app.render();
    }
  };

  // ========== Notifications ==========
  const notif = {
    add(payload) {
      const list = store.get("notifications", []);
      list.unshift({
        id: uid(),
        type: payload.type || "info",
        title: payload.title || "",
        body: payload.body || "",
        link: payload.link || "",
        read: false,
        date: new Date().toISOString()
      });
      // Cap at 100
      if (list.length > 100) list.length = 100;
      store.set("notifications", list);
      notif.render();
    },
    list() { return store.get("notifications", []); },
    unreadCount() { return notif.list().filter(n => !n.read).length; },
    markRead(id) {
      const list = notif.list();
      const n = list.find(x => x.id === id);
      if (n) { n.read = true; store.set("notifications", list); notif.render(); }
    },
    markAllRead() {
      const list = notif.list();
      list.forEach(n => n.read = true);
      store.set("notifications", list);
      notif.render();
    },
    click(id) {
      const list = notif.list();
      const n = list.find(x => x.id === id);
      if (!n) return;
      n.read = true;
      store.set("notifications", list);
      const panel = document.getElementById("notifPanel");
      if (panel) panel.hidden = true;
      if (n.link) location.hash = n.link;
      notif.render();
    },
    render() {
      const badge = document.getElementById("notifBadge");
      const list = document.getElementById("notifList");
      if (!badge || !list) return;
      const count = notif.unreadCount();
      if (count > 0) {
        badge.hidden = false;
        badge.textContent = count > 99 ? "99+" : count;
      } else {
        badge.hidden = true;
      }
      const items = notif.list();
      if (items.length === 0) {
        list.innerHTML = `<div class="np-empty">لا توجد إشعارات حالياً</div>`;
        return;
      }
      const iconSVG = {
        new_request: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v4H4zM4 12h16v4H4zM4 20h10"/></svg>`,
        task: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3 8-8M3 12a9 9 0 1018 0 9 9 0 00-18 0"/></svg>`,
        user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 22c0-4 4-7 8-7s8 3 8 7"/></svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`
      };
      const iconCls = { new_request: "req", task: "task", user: "user", info: "info" };
      list.innerHTML = items.map(n => `
        <div class="np-item ${n.read ? "" : "unread"}" onclick="CRM.notif.click('${n.id}')">
          <div class="np-icon ${iconCls[n.type] || "info"}">${iconSVG[n.type] || iconSVG.info}</div>
          <div class="np-body">
            <span class="np-title-text">${esc(n.title)}</span>
            ${n.body ? `<span class="np-text">${esc(n.body)}</span>` : ""}
            <span class="np-time">${timeAgo(n.date)}</span>
          </div>
        </div>
      `).join("");
    }
  };

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "الآن";
    if (m < 60) return `قبل ${m} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return `قبل ${h} ساعة`;
    const d = Math.floor(h / 24);
    if (d < 30) return `قبل ${d} يوم`;
    return fmtDate(iso);
  }

  // ========== Public API for site forms ==========
  const intake = {
    async submit(payload) {
      seedIfEmpty();
      const item = {
        id: uid(),
        name: payload.name || "",
        phone: payload.phone || "",
        type: payload.type || "—",
        message: payload.message || "",
        status: "new",
        date: new Date().toISOString(),
        source: payload.source || "نموذج الموقع"
      };
      if (window.DB && window.DB.upsert) {
        await window.DB.upsert("requests", item);
      } else {
        const reqs = store.get("requests", []);
        reqs.unshift(item);
        store.set("requests", reqs);
      }
      // Add notification
      notif.add({
        type: "new_request",
        title: `طلب جديد من ${item.name}`,
        body: `نوع المشروع: ${item.type}`,
        link: "requests"
      });
      return true;
    }
  };

  return { auth, app, store, intake, notif };
})();
