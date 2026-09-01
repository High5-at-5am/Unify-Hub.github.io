const API = (window.__HATCHABLE__ && window.__HATCHABLE__.api) || "/api";

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    method: opts.method || "GET",
    headers: opts.raw ? undefined : { "Content-Type": "application/json" },
    credentials: "include",
    body: opts.raw ? opts.body : (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/account/")) {
      window.location.href = "/login.html";
      return null;
    }
    const err = new Error((data && data.error) || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function toast(msg, isError) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtDateTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " \u00b7 " +
    dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function isOverdue(dueAt, status) {
  if (!dueAt || status === "completed") return false;
  return new Date(dueAt).getTime() < Date.now();
}

const TEAM_COLOR_VARS = { coral: "--coral", moss: "--moss", sky: "--sky", ochre: "--ochre", brick: "--brick" };
function teamColor(color) {
  if (color && color.startsWith("#")) return color;
  return `var(${TEAM_COLOR_VARS[color] || "--coral"})`;
}

// Applies the org's saved brand color (and name) to this page. Safe to call
// on every authenticated page; falls back silently to the default theme.
async function applyTheme() {
  try {
    const theme = await apiFetch("/settings/theme");
    if (theme) {
      const effective = theme.personalPrimaryColor || theme.primaryColor;
      if (effective) document.documentElement.style.setProperty("--coral", effective);
    }
    if (theme && theme.orgName) {
      document.querySelectorAll("[data-org-name]").forEach(el => { el.textContent = theme.orgName; });
    }
    return theme;
  } catch (e) {
    return null;
  }
}

// Shows the admin-managed daily affirmation in the bottom-right corner.
// Permanent -- no dismiss button, shown on every page.
async function showAffirmationWidget() {
  document.getElementById("affirmation-widget")?.remove();
  try {
    const data = await apiFetch("/affirmations/today");
    if (!data || !data.enabled || !data.message) return;
    const el = document.createElement("div");
    el.id = "affirmation-widget";
    el.className = "affirmation-widget";
    el.innerHTML = `<span class="quote-mark">\u201c</span><span>${escapeHtml(data.message)}</span>`;
    document.body.appendChild(el);
  } catch (e) {}
}

const NAV_ITEMS = [
  { href: "/dashboard.html", label: "Overview", icon: "\u2302" },
  { href: "/tasks.html", label: "Tasks", icon: "\u2611" },
  { href: "/calendar.html", label: "Calendar", icon: "\u25a6" },
  { href: "/announcements.html", label: "Announcements", icon: "\u2691" },
  { href: "/chat.html", label: "Chat", icon: "\u25a3" },
  { href: "/files.html", label: "File drops", icon: "\u2637" },
  { href: "/notifications.html", label: "Notifications", icon: "\u25cf" },
  { href: "/apps.html", label: "Apps", icon: "\u2318" },
  { href: "/admin.html", label: "Admin Center", icon: "\u2691", adminOnly: true },
  { href: "/members.html", label: "Members", icon: "\u2637", adminOnly: true },
  { href: "/activity.html", label: "Activity log", icon: "\u2637", adminOnly: true },
  { href: "/settings.html", label: "Settings", icon: "\u2699", adminOnly: true },
  { href: "/profile.html", label: "Profile", icon: "\u2699" },
];

function renderShell(user, activeHref) {
  const shell = document.getElementById("app-shell");
  if (!shell) return;
  const isAdmin = user.role === "admin";
  const nav = NAV_ITEMS.filter(i => !i.adminOnly || isAdmin)
    .map(i => `<a href="${i.href}" class="${activeHref === i.href ? "active" : ""}"><span>${i.icon}</span><span>${i.label}</span></a>`)
    .join("");
  shell.innerHTML = `
    <aside class="sidebar">
      <div class="brand"><span data-org-name>Unify Hub</span></div>
      <nav>${nav}</nav>
      <div class="user-box">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <div class="avatar">${user.profilePictureUrl || user.profileImageUrl ? `<img src="${user.profileImageUrl}">` : initials(user.name)}</div>
          <div style="min-width:0;">
            <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(user.name)}</div>
            <div style="font-size:11px;opacity:0.7;text-transform:capitalize;">${user.role === "admin" ? "Administrator" : "Member"}</div>
          </div>
        </div>
        <button class="btn btn-outline btn-block btn-sm" id="logout-btn" style="color:var(--cream);border-color:rgba(246,241,230,0.3);">Log out</button>
      </div>
    </aside>
    <main class="main" id="main-content"></main>
  `;
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await apiFetch("/account/logout", { method: "POST" });
    window.location.href = "/login.html";
  });
}

async function requireAuth(activeHref) {
  try {
    const me = await apiFetch("/account/me");
    if (!me || !me.user) { window.location.href = "/login.html"; return null; }
    renderShell(me.user, activeHref);
    applyTheme();
    showAffirmationWidget();
    if (me.user.mustResetPassword && activeHref !== "/profile.html") {
      toast("Please set a new PIN/password in your profile.");
    }
    return me.user;
  } catch (e) {
    window.location.href = "/login.html";
    return null;
  }
}

function requireAdminOrRedirect(user) {
  if (user.role !== "admin") {
    document.getElementById("main-content").innerHTML = `<div class="empty-state">You don't have access to this page.</div>`;
    return false;
  }
  return true;
}