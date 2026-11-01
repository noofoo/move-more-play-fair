(() => {
  "use strict";
  const STORAGE_KEY = "activityGamingTracker.v1";
  // PBKDF2-SHA256 of the admin password; the plain password is not stored in the source.
  const ADMIN_PASSWORD_HASH = "15adaf09817b9c0f4c2a07d081a488f3136bd90081f17f0ff9b1d15da89b288c";
  const ADMIN_PASSWORD_SALT = "move-more-play-fair.admin", ADMIN_PASSWORD_ITERATIONS = 200000;
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const defaultState = () => ({
    balance: 0, cap: 7200, dailyCap: 1800,
    activities: [
      { id: uid(), name: "Walking daylight", ratio: 75 },
      { id: uid(), name: "Walking dark", ratio: 45 },
      { id: uid(), name: "Gym / workout", ratio: 300 }
    ],
    history: []
  });
  let state = loadState();
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  let toastTimer;
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.activities) || !Array.isArray(parsed.history)) return defaultState();
      return { ...defaultState(), ...parsed };
    } catch { return defaultState(); }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); render(); }
  function notify(message) {
    $("toast").textContent = message; $("toast").classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2400);
  }
  function formatTime(minutes) { const n = Math.max(0, Math.round(minutes)); return `${Math.floor(n / 60)} hours ${n % 60} minutes`; }
  function addHistory(description, delta) {
    state.history.unshift({ id: uid(), description, delta, at: new Date().toISOString() });
    state.history = state.history.slice(0, 100);
  }
  function applyDelta(delta, description) {
    let next = Math.max(0, state.balance + delta);
    if (Number(state.cap) > 0) next = Math.min(next, Number(state.cap));
    const actual = next - state.balance; state.balance = next;
    if (actual !== 0) addHistory(description, actual);
    save();
    if (delta > actual) notify(`Balance cap reached. Added ${actual} minutes.`);
    else if (delta < 0 && actual > delta) notify("Balance cannot go below zero.");
    else notify(`${actual >= 0 ? "+" : ""}${actual} min · ${description}`);
  }
  function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
  function earnedToday() { return state.earnedDay === todayKey() ? Number(state.earnedToday) || 0 : 0; }
  function dailyRemaining() { return Number(state.dailyCap) > 0 ? Math.max(0, Number(state.dailyCap) - earnedToday()) : Infinity; }
  function reportActivity(id, chunks) {
    const activity = state.activities.find(a => a.id === id); if (!activity) return;
    if (chunks <= 0) return notify("Choose at least one 15-minute chunk.");
    const activityMinutes = chunks * 15, earned = chunks * Number(activity.ratio);
    const remaining = dailyRemaining();
    const before = state.balance;
    let after = before + Math.min(earned, remaining);
    if (Number(state.cap) > 0) after = Math.min(after, Number(state.cap));
    const actual = after - before; state.balance = after;
    state.earnedToday = earnedToday() + actual; state.earnedDay = todayKey();
    const limitNote = actual < earned ? ` (${remaining < earned ? "daily limit" : "balance cap"} reached)` : "";
    addHistory(`${activity.name} · ${activityMinutes} min${limitNote}`, actual);
    save();
    if (limitNote) notify(`Recorded ${activityMinutes} min ${activity.name}; +${actual} gaming min${limitNote}`);
    else notify(`Recorded ${activityMinutes} min ${activity.name}; +${actual} gaming min`);
  }
  function renderEarnedToday() {
    $("earned-today").textContent = Number(state.dailyCap) > 0 ? `Earned today: ${earnedToday()} / ${Number(state.dailyCap)} min` : `Earned today: ${earnedToday()} min`;
  }
  function scheduleMidnightReset() {
    const next = new Date(); next.setHours(24, 0, 1, 0);
    setTimeout(() => { renderEarnedToday(); scheduleMidnightReset(); }, next - Date.now());
  }
  function render() {
    $("balance").textContent = state.balance; $("balance-human").textContent = formatTime(state.balance);
    $("balance-cap").value = state.cap; $("daily-cap").value = state.dailyCap;
    renderEarnedToday();
    const list = $("activity-list"); list.innerHTML = "";
    $("empty-activities").classList.toggle("hidden", state.activities.length > 0);
    state.activities.forEach(activity => {
      const card = document.createElement("article"); card.className = "activity-card";
      card.innerHTML = `<div class="activity-title"><h3>${esc(activity.name)}</h3><span class="ratio">+${Number(activity.ratio)} min / 15 min</span></div>
        <div class="activity-controls"><button class="minus" type="button" aria-label="Remove 15 minutes of ${esc(activity.name)}">−15m</button><div class="chunk-count"><span class="chunks">0</span><small><span class="activity-minutes">0</span> min activity</small></div><button class="plus" type="button" aria-label="Add 15 minutes of ${esc(activity.name)}">+15m</button></div>
        <div class="activity-controls"><button class="minus-hour" type="button" aria-label="Remove one hour of ${esc(activity.name)}">−1h</button><span class="muted">Choose duration</span><button class="plus-hour" type="button" aria-label="Add one hour of ${esc(activity.name)}">+1h</button></div>`;
      let chunks = 0;
      const updateCount = () => {
        card.querySelector(".chunks").textContent = chunks; card.querySelector(".activity-minutes").textContent = chunks * 15;
        card.querySelector(".minus").disabled = chunks < 1; card.querySelector(".minus-hour").disabled = chunks < 4;
      };
      card.querySelector(".plus").addEventListener("click", () => { chunks++; updateCount(); });
      card.querySelector(".plus-hour").addEventListener("click", () => { chunks += 4; updateCount(); });
      card.querySelector(".minus").addEventListener("click", () => { chunks = Math.max(0, chunks - 1); updateCount(); });
      card.querySelector(".minus-hour").addEventListener("click", () => { chunks = Math.max(0, chunks - 4); updateCount(); });
      const submit = document.createElement("button"); submit.type = "button"; submit.textContent = "Report activity";
      submit.addEventListener("click", () => { if (!chunks) return notify("Add at least 15 minutes first."); reportActivity(activity.id, chunks); chunks = 0; updateCount(); });
      card.appendChild(submit); list.appendChild(card); updateCount();
    });
    const adminList = $("admin-activities"); adminList.innerHTML = "";
    state.activities.forEach(a => {
      const row = document.createElement("div"); row.className = "admin-activity";
      row.innerHTML = `<div><strong>${esc(a.name)}</strong><div class="hint">${Number(a.ratio)} gaming minutes per 15 minutes</div></div><div class="actions"><button type="button" class="secondary edit">Edit</button><button type="button" class="danger delete">Delete</button></div>`;
      row.querySelector(".edit").addEventListener("click", () => openEdit(a));
      row.querySelector(".delete").addEventListener("click", () => {
        if (!confirm(`Delete "${a.name}"? Existing history entries will remain.`)) return;
        state.activities = state.activities.filter(x => x.id !== a.id); save(); notify("Activity deleted.");
      });
      adminList.appendChild(row);
    });
    const history = $("history"); history.innerHTML = "";
    $("empty-history").classList.toggle("hidden", state.history.length > 0);
    state.history.slice(0, 30).forEach(entry => {
      const item = document.createElement("div"); item.className = "history-item"; const date = new Date(entry.at);
      item.innerHTML = `<div><strong>${esc(entry.description)}</strong><div class="meta">${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}</div></div><div class="delta ${entry.delta >= 0 ? "positive" : "negative"}">${entry.delta >= 0 ? "+" : ""}${entry.delta} min</div>`;
      history.appendChild(item);
    });
  }
  function openEdit(activity) {
    $("edit-id").value = activity.id; $("edit-name").value = activity.name; $("edit-ratio").value = activity.ratio; $("edit-dialog").showModal();
  }
  const THEME_KEY = "activityGamingTracker.theme";
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $("theme-toggle").textContent = theme === "dark" ? "Light mode" : "Dark mode";
    document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#0a0e18" : "#172033";
  }
  applyTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  $("theme-toggle").addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  });
  function setAdminOpen(open) {
    $("admin-panel").classList.toggle("hidden", !open);
    $("admin-toggle").textContent = open ? "Hide admin" : "Admin settings";
    if (open) $("admin-panel").scrollIntoView({ behavior:"smooth", block:"start" });
    else { pendingAdjust = 0; updateAdjust(); }
  }
  $("admin-toggle").addEventListener("click", () => {
    if (!$("admin-panel").classList.contains("hidden")) return setAdminOpen(false);
    $("admin-password").value = ""; $("password-error").classList.add("hidden"); $("password-dialog").showModal();
  });
  async function hashPassword(password) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name:"PBKDF2", hash:"SHA-256", salt:enc.encode(ADMIN_PASSWORD_SALT), iterations:ADMIN_PASSWORD_ITERATIONS }, key, 256);
    return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  $("password-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (!crypto.subtle) return notify("Admin login needs the site to be opened over HTTPS.");
    if (await hashPassword($("admin-password").value) !== ADMIN_PASSWORD_HASH) {
      $("password-error").classList.remove("hidden"); $("admin-password").select(); return;
    }
    $("password-dialog").close(); setAdminOpen(true);
  });
  $("password-cancel").addEventListener("click", () => $("password-dialog").close());
  let pendingAdjust = 0;
  function updateAdjust() {
    $("adjust-pending").textContent = `${pendingAdjust > 0 ? "+" : ""}${pendingAdjust}`;
    $("apply-adjust").disabled = pendingAdjust === 0;
  }
  [["adjust-minus-hour", -60], ["adjust-minus", -15], ["adjust-plus", 15], ["adjust-plus-hour", 60]].forEach(([id, step]) =>
    $(id).addEventListener("click", () => { pendingAdjust += step; updateAdjust(); }));
  $("apply-adjust").addEventListener("click", () => {
    if (!pendingAdjust) return;
    applyDelta(pendingAdjust, pendingAdjust < 0 ? "Gaming time used / adjustment" : "Manual balance adjustment");
    pendingAdjust = 0; updateAdjust();
  });
  updateAdjust();
  $("activity-form").addEventListener("submit", event => {
    event.preventDefault(); const name = $("activity-name").value.trim(), ratio = Number($("activity-ratio").value);
    if (!name || !Number.isFinite(ratio) || ratio < 0 || ratio > 240) return notify("Enter a name and a ratio between 0 and 240.");
    state.activities.push({ id:uid(), name, ratio }); $("activity-name").value = ""; save(); notify("Activity added.");
  });
  $("edit-form").addEventListener("submit", event => {
    if (event.submitter?.value !== "save") return;
    event.preventDefault(); const activity = state.activities.find(a => a.id === $("edit-id").value);
    const name = $("edit-name").value.trim(), ratio = Number($("edit-ratio").value);
    if (!activity || !name || !Number.isFinite(ratio) || ratio < 0 || ratio > 240) return notify("Check the activity details.");
    activity.name = name; activity.ratio = ratio; $("edit-dialog").close(); save(); notify("Activity updated.");
  });
  $("balance-cap").addEventListener("change", event => {
    state.cap = Math.max(0, Number(event.target.value) || 0);
    if (state.cap > 0 && state.balance > state.cap) state.balance = state.cap;
    save(); notify("Balance cap updated.");
  });
  $("daily-cap").addEventListener("change", event => { state.dailyCap = Math.max(0, Number(event.target.value) || 0); save(); notify("Daily limit updated."); });
  $("clear-log").addEventListener("click", () => {
    if (!confirm("Clear the activity log? Your balance will not change.")) return;
    state.history = []; save(); notify("Log cleared.");
  });
  $("reset-all").addEventListener("click", () => {
    if (!confirm("Reset all activities, balance, settings and history? This cannot be undone unless you exported a backup.")) return;
    state = defaultState(); save(); notify("All data reset.");
  });
  $("export-data").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" }), url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "activity-gaming-backup.json"; a.click(); URL.revokeObjectURL(url); notify("Backup exported.");
  });
  $("import-data").addEventListener("change", async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.activities) || !Array.isArray(parsed.history) || !Number.isFinite(parsed.balance)) throw new Error("Invalid backup");
      if (!confirm("Replace all current data with this backup?")) return;
      state = { ...defaultState(), ...parsed }; save(); notify("Backup imported.");
    } catch { notify("Could not import that file. Check it is a valid backup."); }
    finally { event.target.value = ""; }
  });
  render();
  scheduleMidnightReset();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderEarnedToday(); });
})();