/* ============================================
   LIWA — Database sync layer (Supabase ↔ localStorage)
   ============================================
   - On boot: pulls all tables from Supabase → caches in localStorage
   - On mutation: writes to Supabase, then mirrors locally
   - If Supabase not configured or unreachable: falls back to localStorage only
   ============================================ */

window.DB = (function () {
  "use strict";

  const cfg = window.SUPABASE_CONFIG || {};
  const ready = !!(cfg.url && cfg.anonKey && cfg.anonKey.indexOf("PASTE_") === -1 && window.supabase);

  let sb = null;
  if (ready) {
    try {
      sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    } catch (e) {
      console.error("[DB] Failed to init Supabase:", e);
    }
  } else {
    console.warn("[DB] Supabase not configured — running in localStorage-only mode.");
  }

  const NS = "liwa.crm.";
  const localGet = (k, fb) => {
    try { const v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : fb; } catch { return fb; }
  };
  const localSet = (k, v) => {
    try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch {}
  };

  const TABLES = ["requests", "customers", "projects", "quotes", "tasks"];

  // -------- Pull (read from Supabase → write to localStorage) --------
  async function pullTable(table) {
    if (!sb) return localGet(table, []);
    try {
      const { data, error } = await sb.from(table).select("*").order("date", { ascending: false });
      if (error) throw error;
      localSet(table, data || []);
      return data || [];
    } catch (e) {
      console.warn(`[DB] pull ${table} failed:`, e.message);
      return localGet(table, []);
    }
  }

  async function pullAll() {
    if (!sb) return;
    await Promise.all(TABLES.map(pullTable));
    // Settings (singleton)
    try {
      const { data } = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        localSet("settings", {
          companyName: data.companyName,
          companyEmail: data.companyEmail,
          companyPhone: data.companyPhone,
          whatsapp: data.whatsapp
        });
      }
    } catch (e) { /* ignore */ }
    // Pull users for user management view (without passwords if RLS blocks)
    try {
      const { data } = await sb.from("app_users").select("id, username, name, role, created_at");
      if (data && data.length) {
        // Merge with local (preserve local password copies for offline login)
        const local = localGet("users", []);
        const merged = data.map(u => {
          const lu = local.find(x => x.id === u.id);
          return { ...u, password: lu ? lu.password : "" };
        });
        localSet("users", merged);
      }
    } catch (e) { /* ignore — RLS may block */ }
  }

  // -------- Push (write to Supabase) --------
  async function upsert(table, item) {
    // Always mirror locally first (optimistic)
    const arr = localGet(table, []);
    const idx = arr.findIndex(x => x.id === item.id);
    if (idx >= 0) arr[idx] = { ...arr[idx], ...item }; else arr.unshift(item);
    localSet(table, arr);

    if (!sb) return { ok: true, offline: true };

    try {
      const { data, error } = await sb.from(table).upsert(item).select().single();
      if (error) throw error;
      // Re-cache with server's authoritative copy
      const a2 = localGet(table, []);
      const j = a2.findIndex(x => x.id === item.id);
      if (j >= 0) a2[j] = data; else a2.unshift(data);
      localSet(table, a2);
      return { ok: true, data };
    } catch (e) {
      console.warn(`[DB] upsert ${table} failed:`, e.message);
      return { ok: false, error: e.message, offline: true };
    }
  }

  async function remove(table, id) {
    const arr = localGet(table, []).filter(x => x.id !== id);
    localSet(table, arr);

    if (!sb) return { ok: true, offline: true };
    try {
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      console.warn(`[DB] delete ${table}/${id} failed:`, e.message);
      return { ok: false, error: e.message };
    }
  }

  async function saveSettings(settings) {
    localSet("settings", settings);
    if (!sb) return { ok: true, offline: true };
    try {
      const { error } = await sb.from("settings").upsert({
        id: 1,
        companyName: settings.companyName,
        companyEmail: settings.companyEmail,
        companyPhone: settings.companyPhone,
        whatsapp: settings.whatsapp,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // -------- Auth (via RPC verify_login, with local fallback) --------
  async function login(username, password) {
    // Try Supabase first if configured
    if (sb) {
      try {
        const { data, error } = await sb.rpc("verify_login", { p_username: username, p_password: password });
        if (!error && data) {
          const sess = { ...data, ts: Date.now() };
          localSet("session", sess);
          return sess;
        }
        if (error) console.warn("[DB] verify_login RPC failed, falling back to local:", error.message);
      } catch (e) {
        console.warn("[DB] login attempt failed, falling back to local:", e.message);
      }
    }

    // Local fallback (works always, even before SQL/anon key is set up)
    const defaultUsers = [{ id: "u_admin", username: "admin", password: "Liwa@2026", name: "المسؤول", role: "Admin" }];
    const users = localGet("users", defaultUsers);
    // Ensure default admin exists if list is empty
    if (!users.length) users.push(...defaultUsers);
    localSet("users", users);
    const u = users.find(x => x.username === username && x.password === password);
    if (!u) return null;
    const sess = { id: u.id, username: u.username, name: u.name, role: u.role, ts: Date.now() };
    localSet("session", sess);
    return sess;
  }

  function logout() {
    try { localStorage.removeItem(NS + "session"); } catch {}
  }

  function currentSession() {
    return localGet("session", null);
  }

  async function changePassword(oldP, newP) {
    const sess = currentSession();
    if (!sess) return false;
    // Try Supabase first
    if (sb) {
      try {
        const { data, error } = await sb.rpc("change_password", {
          p_user_id: sess.id, p_old_password: oldP, p_new_password: newP
        });
        if (!error && data) return true;
      } catch (e) {
        console.warn("[DB] change_password RPC failed, falling back to local:", e.message);
      }
    }
    // Local fallback
    const users = localGet("users", []);
    const idx = users.findIndex(u => u.id === sess.id);
    if (idx === -1 || users[idx].password !== oldP) return false;
    users[idx].password = newP;
    localSet("users", users);
    return true;
  }

  return {
    ready,
    sb,
    pullAll,
    pullTable,
    upsert,
    remove,
    saveSettings,
    login,
    logout,
    currentSession,
    changePassword,
    get(table) { return localGet(table, []); }
  };
})();
