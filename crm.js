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
    if (!store.get("tasks")) store.set("tasks", []);
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

  // ========== Auth ==========
  const auth = {
    login(u, p) {
      const users = store.get("users", []);
      const found = users.find(x => x.username === u && x.password === p);
      if (found) {
        const session = { id: found.id, username: found.username, name: found.name, role: found.role, ts: Date.now() };
        store.set("session", session);
        return true;
      }
      return false;
    },
    logout() { try { localStorage.removeItem(NS + "session"); } catch {} },
    current() { return store.get("session"); },
    changePassword(oldP, newP) {
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
  const TASK_STATUSES = {
    pending: { ar: "قيد التنفيذ", cls: "pending" },
    done:    { ar: "منجز",      cls: "done" },
    overdue: { ar: "متأخر",     cls: "overdue" }
  };

  const PROJECT_TYPES = [
    "إسبا / منتجع صحي", "حمام مغربي / غرفة بخار", "صالون تجميل نسائي", "صالون حلاقة رجالي",
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
    init() {
      window.addEventListener("hashchange", () => app.render());
      document.querySelectorAll("[data-view]").forEach(a => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          app.go(a.dataset.view);
        });
      });
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
        quotes: ["عروض الأسعار", "إدارة عروض الأسعار والفواتير"],
        tasks: ["المهام", "متابعة مهام الفريق"],
        reports: ["التقارير", "إحصائيات وتحليلات"],
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

    saveRequestStatus(id) {
      const reqs = store.get("requests", []);
      const r = reqs.find(x => x.id === id);
      if (!r) return;
      r.status = document.getElementById("reqStatus").value;
      store.set("requests", reqs);
      closeModal();
      app.render();
      toast("تم تحديث الحالة");
    },

    deleteRequest(id) {
      if (!confirm("هل تريد حذف هذا الطلب؟")) return;
      const reqs = store.get("requests", []).filter(r => r.id !== id);
      store.set("requests", reqs);
      app.render();
      toast("تم الحذف");
    },

    convertRequest(id) {
      const reqs = store.get("requests", []);
      const r = reqs.find(x => x.id === id);
      if (!r) return;
      const customers = store.get("customers", []);
      const exists = customers.find(c => c.phone === r.phone);
      if (!exists) {
        customers.push({
          id: uid(), name: r.name, phone: r.phone, email: "",
          source: "نموذج الموقع", date: new Date().toISOString(), requestId: r.id
        });
        store.set("customers", customers);
      }
      r.status = "converted";
      store.set("requests", reqs);
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

    saveManualRequest(e) {
      e.preventDefault();
      const reqs = store.get("requests", []);
      reqs.push({
        id: uid(),
        name: document.getElementById("mr-name").value.trim(),
        phone: document.getElementById("mr-phone").value.trim(),
        type: document.getElementById("mr-type").value,
        message: document.getElementById("mr-msg").value.trim(),
        status: "new",
        date: new Date().toISOString(),
        source: "يدوي"
      });
      store.set("requests", reqs);
      closeModal();
      app.render();
      toast("تم إضافة الطلب");
      return false;
    },

    demoRequest() {
      const samples = [
        { name: "خالد العتيبي", phone: "0501234567", type: "إسبا / منتجع صحي", message: "أرغب بتنفيذ إسبا بمساحة 200 متر شمال الرياض، يحتوي على حمام مغربي وغرفة بخار." },
        { name: "هند المطيري", phone: "0567654321", type: "صالون تجميل نسائي", message: "صالون نسائي بمساحة 180 متر — كوافير، أظافر، عناية." },
        { name: "ماجد الدوسري", phone: "0512223344", type: "مطعم", message: "مطعم إيطالي راقي 350 متر — حي حطين." }
      ];
      const s = samples[Math.floor(Math.random() * samples.length)];
      const reqs = store.get("requests", []);
      reqs.push({ id: uid(), ...s, status: "new", date: new Date().toISOString(), source: "تجريبي" });
      store.set("requests", reqs);
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
    saveCustomer(e) {
      e.preventDefault();
      const customers = store.get("customers", []);
      customers.push({
        id: uid(),
        name: document.getElementById("c-name").value.trim(),
        phone: document.getElementById("c-phone").value.trim(),
        email: document.getElementById("c-email").value.trim(),
        source: document.getElementById("c-source").value.trim() || "يدوي",
        date: new Date().toISOString()
      });
      store.set("customers", customers);
      closeModal(); app.render(); toast("تم إضافة العميل");
      return false;
    },
    deleteCustomer(id) {
      if (!confirm("حذف هذا العميل؟")) return;
      store.set("customers", store.get("customers", []).filter(c => c.id !== id));
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
    saveProject(e) {
      e.preventDefault();
      const projects = store.get("projects", []);
      projects.push({
        id: uid(),
        name: document.getElementById("p-name").value.trim(),
        customerId: document.getElementById("p-customer").value,
        type: document.getElementById("p-type").value,
        value: +document.getElementById("p-value").value || 0,
        progress: +document.getElementById("p-progress").value || 0,
        status: document.getElementById("p-status").value,
        date: new Date().toISOString()
      });
      store.set("projects", projects);
      closeModal(); app.render(); toast("تم إنشاء المشروع");
      return false;
    },
    deleteProject(id) {
      if (!confirm("حذف هذا المشروع؟")) return;
      store.set("projects", store.get("projects", []).filter(p => p.id !== id));
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
    saveQuote(e) {
      e.preventDefault();
      const quotes = store.get("quotes", []);
      quotes.push({
        id: uid(),
        number: document.getElementById("q-num").value.trim(),
        customerId: document.getElementById("q-customer").value,
        total: +document.getElementById("q-total").value || 0,
        status: document.getElementById("q-status").value,
        notes: document.getElementById("q-notes").value.trim(),
        date: new Date().toISOString()
      });
      store.set("quotes", quotes);
      closeModal(); app.render(); toast("تم حفظ العرض");
      return false;
    },
    deleteQuote(id) {
      if (!confirm("حذف هذا العرض؟")) return;
      store.set("quotes", store.get("quotes", []).filter(q => q.id !== id));
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
    saveTask(e) {
      e.preventDefault();
      const tasks = store.get("tasks", []);
      tasks.push({
        id: uid(),
        title: document.getElementById("t-title").value.trim(),
        dueDate: document.getElementById("t-due").value,
        status: document.getElementById("t-status").value
      });
      store.set("tasks", tasks);
      closeModal(); app.render(); toast("تم إضافة المهمة");
      return false;
    },
    completeTask(id) {
      const tasks = store.get("tasks", []);
      const t = tasks.find(x => x.id === id);
      if (!t) return;
      t.status = "done";
      store.set("tasks", tasks);
      app.render(); toast("تم إنجاز المهمة");
    },
    deleteTask(id) {
      if (!confirm("حذف هذه المهمة؟")) return;
      store.set("tasks", store.get("tasks", []).filter(t => t.id !== id));
      app.render(); toast("تم الحذف");
    },

    // ===== Settings =====
    saveSettings(e) {
      e.preventDefault();
      const s = {
        companyName: document.getElementById("setCompany").value.trim(),
        companyEmail: document.getElementById("setEmail").value.trim(),
        companyPhone: document.getElementById("setPhone").value.trim(),
        whatsapp: document.getElementById("setWA").value.trim()
      };
      store.set("settings", s);
      toast("تم حفظ الإعدادات");
      return false;
    },
    changePassword(e) {
      e.preventDefault();
      const oldP = document.getElementById("oldPw").value;
      const newP = document.getElementById("newPw").value;
      if (auth.changePassword(oldP, newP)) {
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
    resetData() {
      if (!confirm("سيتم حذف جميع الطلبات والعملاء والمشاريع. هل أنت متأكد؟")) return;
      if (!confirm("تأكيد نهائي — هذه العملية لا يمكن التراجع عنها.")) return;
      ["requests", "customers", "projects", "quotes", "tasks"].forEach(k => store.set(k, []));
      toast("تم حذف البيانات");
      app.render();
    }
  };

  // ========== Public API for site forms ==========
  const intake = {
    submit(payload) {
      seedIfEmpty();
      const reqs = store.get("requests", []);
      reqs.push({
        id: uid(),
        name: payload.name || "",
        phone: payload.phone || "",
        type: payload.type || "—",
        message: payload.message || "",
        status: "new",
        date: new Date().toISOString(),
        source: payload.source || "نموذج الموقع"
      });
      store.set("requests", reqs);
      return true;
    }
  };

  return { auth, app, store, intake };
})();
