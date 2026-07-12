// ============================================================
// TransitOps Console — Application Logic
// ============================================================

const state = {
  user: null,
  view: "dashboard",
  cache: { vehicles: [], drivers: [], trips: [], maintenance: [], fuelLogs: [], expenses: [] },
};

const ROLE_LABELS = {
  fleet_manager: "Fleet Manager",
  driver: "Driver",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
};

// ---------- boot ----------
document.addEventListener("DOMContentLoaded", () => {
  bindAuthForms();
  const token = Auth.getToken();
  const user = Auth.getUser();
  if (token && user) {
    state.user = user;
    enterApp();
  }
});

function bindAuthForms() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      document.getElementById("signin-form").classList.toggle("hidden", tab !== "signin");
      document.getElementById("signup-form").classList.toggle("hidden", tab !== "signup");
    });
  });

  document.getElementById("signin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("signin-error");
    errEl.textContent = "";
    const email = document.getElementById("signin-email").value.trim();
    const password = document.getElementById("signin-password").value;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Signing in…";
    try {
      const data = await Api.login(email, password);
      Auth.setToken(data.access_token);
      Auth.setUser(data.user);
      state.user = data.user;
      enterApp();
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false; btn.textContent = "Enter Console";
    }
  });

  document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("signup-error");
    errEl.textContent = "";
    const payload = {
      name: document.getElementById("signup-name").value.trim(),
      email: document.getElementById("signup-email").value.trim(),
      password: document.getElementById("signup-password").value,
      role: document.getElementById("signup-role").value,
    };
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Creating…";
    try {
      await Api.register(payload);
      const data = await Api.login(payload.email, payload.password);
      Auth.setToken(data.access_token);
      Auth.setUser(data.user);
      state.user = data.user;
      enterApp();
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false; btn.textContent = "Create Account";
    }
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    Auth.clearToken();
    Auth.clearUser();
    state.user = null;
    document.getElementById("app-shell").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");
  });
}

function enterApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");

  document.getElementById("user-name").textContent = state.user.name;
  document.getElementById("user-role").textContent = ROLE_LABELS[state.user.role] || state.user.role;
  document.getElementById("user-avatar").textContent = state.user.name.slice(0, 1).toUpperCase();

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.view));
  });

  navigate("dashboard");
}

function navigate(view) {
  state.view = view;
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
  const titles = {
    dashboard: "Dashboard",
    vehicles: "Vehicle Registry",
    drivers: "Driver Management",
    trips: "Trips & Dispatch",
    maintenance: "Maintenance",
    fuel: "Fuel & Expenses",
    reports: "Reports & Analytics",
  };
  document.getElementById("view-title").textContent = titles[view] || view;
  document.getElementById("view-actions").innerHTML = "";
  const content = document.getElementById("view-content");
  content.innerHTML = `<div class="section-desc">Loading…</div>`;

  const renderers = {
    dashboard: renderDashboard,
    vehicles: renderVehicles,
    drivers: renderDrivers,
    trips: renderTrips,
    maintenance: renderMaintenance,
    fuel: renderFuel,
    reports: renderReports,
  };
  (renderers[view] || (() => {}))().catch((err) => {
    content.innerHTML = `<div class="panel"><div class="field-error">${escapeHtml(err.message)}</div></div>`;
  });
}

// ---------- helpers ----------
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtMoney(n) {
  if (n === null || n === undefined) return "—";
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtNum(n, suffix = "") {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + suffix;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function toast(message, isError = false) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 3800);
}

function canWrite(...roles) {
  return roles.includes(state.user.role);
}

function statusPillClass(status) {
  const map = {
    Available: "pill-teal", "On Trip": "pill-blue", "In Shop": "pill-amber", Retired: "pill-red",
    "Off Duty": "pill-amber", Suspended: "pill-red",
    Draft: "pill-amber", Dispatched: "pill-blue", Completed: "pill-teal", Cancelled: "pill-red",
    Active: "pill-amber", Closed: "pill-teal",
  };
  return map[status] || "";
}

function pill(status) {
  return `<span class="pill ${statusPillClass(status)}"><span class="dot"></span>${escapeHtml(status)}</span>`;
}

// ---------- modal ----------
function openModal({ title, bodyHtml, footerHtml, onMount }) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-box">
        <div class="modal-header">
          <h3>${escapeHtml(title)}</h3>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer">${footerHtml || ""}</div>
      </div>
    </div>`;
  const overlay = document.getElementById("modal-overlay");
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.getElementById("modal-close").addEventListener("click", closeModal);
  if (onMount) onMount(root);
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}

// ============================================================
// DASHBOARD
// ============================================================
async function renderDashboard() {
  const [vehicles] = await Promise.all([Api.listVehicles()]);
  const types = [...new Set(vehicles.map((v) => v.type))];
  const regions = [...new Set(vehicles.map((v) => v.region).filter(Boolean))];

  const content = document.getElementById("view-content");

  async function load(filters = {}) {
    const kpi = await Api.dashboard(filters);
    content.innerHTML = `
      <div class="filter-bar">
        <select id="f-type"><option value="">All Vehicle Types</option>${types.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}</select>
        <select id="f-status"><option value="">All Statuses</option>${["Available", "On Trip", "In Shop", "Retired"].map((s) => `<option value="${s}">${s}</option>`).join("")}</select>
        <select id="f-region"><option value="">All Regions</option>${regions.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("")}</select>
      </div>

      <div class="kpi-grid">
        ${kpiCard("Active Vehicles", kpi.active_vehicles, "", "var(--accent-teal)")}
        ${kpiCard("Available Vehicles", kpi.available_vehicles, "", "var(--accent-teal)")}
        ${kpiCard("In Maintenance", kpi.vehicles_in_maintenance, "", "var(--accent-amber)")}
        ${kpiCard("Active Trips", kpi.active_trips, "", "var(--accent-blue)")}
        ${kpiCard("Pending Trips", kpi.pending_trips, "", "var(--accent-amber)")}
        ${kpiCard("Drivers On Duty", kpi.drivers_on_duty, "", "var(--accent-blue)")}
        ${kpiCard("Fleet Utilization", kpi.fleet_utilization_pct, "%", "var(--accent-teal)")}
      </div>

      <div class="panel">
        <div class="panel-title">Fleet Snapshot</div>
        <div class="section-desc" style="margin-top:-6px">${kpi.total_vehicles} vehicle(s) match current filters. Use the dashboard filters above to narrow by type, status, or region.</div>
      </div>
    `;
    document.getElementById("f-type").value = filters.type || "";
    document.getElementById("f-status").value = filters.status || "";
    document.getElementById("f-region").value = filters.region || "";
    ["f-type", "f-status", "f-region"].forEach((id) => {
      document.getElementById(id).addEventListener("change", () => {
        load({
          type: document.getElementById("f-type").value,
          status: document.getElementById("f-status").value,
          region: document.getElementById("f-region").value,
        });
      });
    });
  }

  await load();
}

function kpiCard(label, value, unit, rail) {
  return `
    <div class="kpi-card" style="--rail:${rail}">
      <div class="kpi-label">${escapeHtml(label)}</div>
      <div class="kpi-value">${value ?? 0}<span class="kpi-unit">${unit}</span></div>
    </div>`;
}

// ============================================================
// VEHICLES
// ============================================================
async function renderVehicles() {
  const canManage = canWrite("fleet_manager");
  const actionsEl = document.getElementById("view-actions");
  if (canManage) {
    actionsEl.innerHTML = `<button class="btn btn-accent" id="add-vehicle-btn">+ Register Vehicle</button>`;
    document.getElementById("add-vehicle-btn").addEventListener("click", () => openVehicleForm());
  }

  const vehicles = await Api.listVehicles();
  state.cache.vehicles = vehicles;
  const content = document.getElementById("view-content");

  if (!vehicles.length) {
    content.innerHTML = emptyState("No vehicles registered yet.", canManage ? "Register your first vehicle to begin building the fleet." : "Ask a Fleet Manager to register vehicles.");
    return;
  }

  content.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Registration</th><th>Model</th><th>Type</th><th>Max Load</th><th>Odometer</th><th>Acquisition Cost</th><th>Status</th><th>Region</th>${canManage ? "<th></th>" : ""}
        </tr></thead>
        <tbody>
          ${vehicles.map((v) => `
            <tr>
              <td><span class="plate">${escapeHtml(v.registration_number)}</span></td>
              <td>${escapeHtml(v.name)}</td>
              <td>${escapeHtml(v.type)}</td>
              <td class="mono">${fmtNum(v.max_load_capacity, " kg")}</td>
              <td class="mono">${fmtNum(v.odometer, " km")}</td>
              <td class="mono">${fmtMoney(v.acquisition_cost)}</td>
              <td>${pill(v.status)}</td>
              <td>${escapeHtml(v.region || "—")}</td>
              ${canManage ? `<td class="actions-cell">
                <button class="btn btn-sm" data-edit="${v.id}">Edit</button>
                ${v.status !== "On Trip" ? `<button class="btn btn-sm btn-danger" data-del="${v.id}">Delete</button>` : ""}
              </td>` : ""}
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;

  if (canManage) {
    content.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = vehicles.find((x) => x.id == btn.dataset.edit);
        openVehicleForm(v);
      });
    });
    content.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this vehicle? This cannot be undone.")) return;
        try {
          await Api.deleteVehicle(btn.dataset.del);
          toast("Vehicle deleted.");
          navigate("vehicles");
        } catch (err) { toast(err.message, true); }
      });
    });
  }
}

function emptyState(title, sub) {
  return `<div class="panel" style="text-align:center; padding:52px 20px;">
    <div style="font-family:var(--font-display); font-weight:700; font-size:16px; margin-bottom:6px;">${escapeHtml(title)}</div>
    <div class="section-desc" style="margin:0;">${escapeHtml(sub)}</div>
  </div>`;
}

function openVehicleForm(vehicle = null) {
  const isEdit = !!vehicle;
  openModal({
    title: isEdit ? `Edit ${vehicle.registration_number}` : "Register New Vehicle",
    bodyHtml: `
      <div class="field-row">
        <div class="field"><label>Registration Number</label><input id="vf-reg" value="${escapeHtml(vehicle?.registration_number || "")}" ${isEdit ? "disabled" : ""} placeholder="VAN-05" /></div>
        <div class="field"><label>Vehicle Name / Model</label><input id="vf-name" value="${escapeHtml(vehicle?.name || "")}" placeholder="Tata Ace Gold" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Type</label><input id="vf-type" value="${escapeHtml(vehicle?.type || "")}" placeholder="Van / Truck / Trailer" /></div>
        <div class="field"><label>Region</label><input id="vf-region" value="${escapeHtml(vehicle?.region || "")}" placeholder="North" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Max Load Capacity (kg)</label><input id="vf-load" type="number" step="0.01" value="${vehicle?.max_load_capacity ?? ""}" /></div>
        <div class="field"><label>Odometer (km)</label><input id="vf-odo" type="number" step="0.01" value="${vehicle?.odometer ?? 0}" /></div>
      </div>
      <div class="field"><label>Acquisition Cost (₹)</label><input id="vf-cost" type="number" step="0.01" value="${vehicle?.acquisition_cost ?? 0}" /></div>
      ${isEdit ? `<div class="field"><label>Status</label>
        <select id="vf-status">
          ${["Available", "On Trip", "In Shop", "Retired"].map((s) => `<option value="${s}" ${vehicle.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
        <div class="field-hint">Status changes here are manual overrides — dispatch, completion, and maintenance flows update this automatically.</div>
      </div>` : ""}
      <div class="field-error" id="vf-error"></div>
    `,
    footerHtml: `<button class="btn" id="vf-cancel">Cancel</button><button class="btn btn-accent" id="vf-save">${isEdit ? "Save Changes" : "Register Vehicle"}</button>`,
    onMount: () => {
      document.getElementById("vf-cancel").addEventListener("click", closeModal);
      document.getElementById("vf-save").addEventListener("click", async () => {
        const errEl = document.getElementById("vf-error");
        errEl.textContent = "";
        const payload = {
          name: document.getElementById("vf-name").value.trim(),
          type: document.getElementById("vf-type").value.trim(),
          region: document.getElementById("vf-region").value.trim() || null,
          max_load_capacity: parseFloat(document.getElementById("vf-load").value),
          odometer: parseFloat(document.getElementById("vf-odo").value || 0),
          acquisition_cost: parseFloat(document.getElementById("vf-cost").value || 0),
        };
        if (!isEdit) payload.registration_number = document.getElementById("vf-reg").value.trim();
        if (isEdit) payload.status = document.getElementById("vf-status").value;
        try {
          if (isEdit) await Api.updateVehicle(vehicle.id, payload);
          else await Api.createVehicle(payload);
          closeModal();
          toast(isEdit ? "Vehicle updated." : "Vehicle registered.");
          navigate("vehicles");
        } catch (err) {
          errEl.textContent = err.message;
        }
      });
    },
  });
}

// ============================================================
// DRIVERS
// ============================================================
async function renderDrivers() {
  const canManage = canWrite("fleet_manager", "safety_officer");
  const actionsEl = document.getElementById("view-actions");
  if (canManage) {
    actionsEl.innerHTML = `<button class="btn btn-accent" id="add-driver-btn">+ Add Driver</button>`;
    document.getElementById("add-driver-btn").addEventListener("click", () => openDriverForm());
  }

  const drivers = await Api.listDrivers();
  state.cache.drivers = drivers;
  const content = document.getElementById("view-content");

  if (!drivers.length) {
    content.innerHTML = emptyState("No drivers on file.", canManage ? "Add a driver profile to begin assigning trips." : "Ask a Fleet Manager or Safety Officer to add drivers.");
    return;
  }

  const today = new Date();
  content.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Name</th><th>License No.</th><th>Category</th><th>License Expiry</th><th>Contact</th><th>Safety Score</th><th>Status</th>${canManage ? "<th></th>" : ""}
        </tr></thead>
        <tbody>
          ${drivers.map((d) => {
            const expired = new Date(d.license_expiry_date) < today;
            return `
            <tr>
              <td>${escapeHtml(d.name)}</td>
              <td class="mono">${escapeHtml(d.license_number)}</td>
              <td>${escapeHtml(d.license_category)}</td>
              <td class="mono">${fmtDate(d.license_expiry_date)} ${expired ? '<span class="pill pill-red" style="margin-left:6px;"><span class="dot"></span>Expired</span>' : ""}</td>
              <td class="mono">${escapeHtml(d.contact_number || "—")}</td>
              <td class="mono">${fmtNum(d.safety_score)}</td>
              <td>${pill(d.status)}</td>
              ${canManage ? `<td class="actions-cell">
                <button class="btn btn-sm" data-edit="${d.id}">Edit</button>
                ${d.status !== "On Trip" ? `<button class="btn btn-sm btn-danger" data-del="${d.id}">Delete</button>` : ""}
              </td>` : ""}
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  if (canManage) {
    content.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const d = drivers.find((x) => x.id == btn.dataset.edit);
        openDriverForm(d);
      });
    });
    content.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this driver? This cannot be undone.")) return;
        try {
          await Api.deleteDriver(btn.dataset.del);
          toast("Driver deleted.");
          navigate("drivers");
        } catch (err) { toast(err.message, true); }
      });
    });
  }
}

function openDriverForm(driver = null) {
  const isEdit = !!driver;
  openModal({
    title: isEdit ? `Edit ${driver.name}` : "Add New Driver",
    bodyHtml: `
      <div class="field"><label>Full Name</label><input id="df-name" value="${escapeHtml(driver?.name || "")}" placeholder="Alex Kumar" /></div>
      <div class="field-row">
        <div class="field"><label>License Number</label><input id="df-license" value="${escapeHtml(driver?.license_number || "")}" ${isEdit ? "disabled" : ""} placeholder="DL-14XXXXXXXXXXX" /></div>
        <div class="field"><label>License Category</label><input id="df-category" value="${escapeHtml(driver?.license_category || "")}" placeholder="LMV / HMV" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>License Expiry Date</label><input id="df-expiry" type="date" value="${driver?.license_expiry_date || ""}" /></div>
        <div class="field"><label>Contact Number</label><input id="df-contact" value="${escapeHtml(driver?.contact_number || "")}" placeholder="98765XXXXX" /></div>
      </div>
      <div class="field"><label>Safety Score (0–100)</label><input id="df-score" type="number" step="0.1" min="0" max="100" value="${driver?.safety_score ?? 100}" /></div>
      ${isEdit ? `<div class="field"><label>Status</label>
        <select id="df-status">
          ${["Available", "On Trip", "Off Duty", "Suspended"].map((s) => `<option value="${s}" ${driver.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>` : ""}
      <div class="field-error" id="df-error"></div>
    `,
    footerHtml: `<button class="btn" id="df-cancel">Cancel</button><button class="btn btn-accent" id="df-save">${isEdit ? "Save Changes" : "Add Driver"}</button>`,
    onMount: () => {
      document.getElementById("df-cancel").addEventListener("click", closeModal);
      document.getElementById("df-save").addEventListener("click", async () => {
        const errEl = document.getElementById("df-error");
        errEl.textContent = "";
        const payload = {
          name: document.getElementById("df-name").value.trim(),
          license_category: document.getElementById("df-category").value.trim(),
          license_expiry_date: document.getElementById("df-expiry").value,
          contact_number: document.getElementById("df-contact").value.trim() || null,
          safety_score: parseFloat(document.getElementById("df-score").value || 100),
        };
        if (!isEdit) payload.license_number = document.getElementById("df-license").value.trim();
        if (isEdit) payload.status = document.getElementById("df-status").value;
        try {
          if (isEdit) await Api.updateDriver(driver.id, payload);
          else await Api.createDriver(payload);
          closeModal();
          toast(isEdit ? "Driver updated." : "Driver added.");
          navigate("drivers");
        } catch (err) {
          errEl.textContent = err.message;
        }
      });
    },
  });
}

// ============================================================
// TRIPS & DISPATCH
// ============================================================
async function renderTrips() {
  const canManage = canWrite("fleet_manager", "driver");
  const actionsEl = document.getElementById("view-actions");
  if (canManage) {
    actionsEl.innerHTML = `<button class="btn btn-accent" id="add-trip-btn">+ Create Trip</button>`;
    document.getElementById("add-trip-btn").addEventListener("click", () => openTripForm());
  }

  const [trips, vehicles, drivers] = await Promise.all([Api.listTrips(), Api.listVehicles(), Api.listDrivers()]);
  state.cache.trips = trips; state.cache.vehicles = vehicles; state.cache.drivers = drivers;
  const vMap = Object.fromEntries(vehicles.map((v) => [v.id, v]));
  const dMap = Object.fromEntries(drivers.map((d) => [d.id, d]));
  const content = document.getElementById("view-content");

  if (!trips.length) {
    content.innerHTML = emptyState("No trips yet.", canManage ? "Create a trip to dispatch a vehicle and driver." : "Trips will appear here once created.");
    return;
  }

  content.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Route</th><th>Vehicle</th><th>Driver</th><th>Cargo</th><th>Distance</th><th>Status</th>${canManage ? "<th></th>" : ""}
        </tr></thead>
        <tbody>
          ${trips.map((t) => `
            <tr>
              <td>${escapeHtml(t.source)} <span style="color:var(--muted-2)">→</span> ${escapeHtml(t.destination)}</td>
              <td><span class="plate">${escapeHtml(vMap[t.vehicle_id]?.registration_number || "—")}</span></td>
              <td>${escapeHtml(dMap[t.driver_id]?.name || "—")}</td>
              <td class="mono">${fmtNum(t.cargo_weight, " kg")}</td>
              <td class="mono">${fmtNum(t.planned_distance, " km")}</td>
              <td>${pill(t.status)}</td>
              ${canManage ? `<td class="actions-cell">
                ${t.status === "Draft" ? `<button class="btn btn-sm btn-accent" data-dispatch="${t.id}">Dispatch</button><button class="btn btn-sm btn-danger" data-cancel="${t.id}">Cancel</button>` : ""}
                ${t.status === "Dispatched" ? `<button class="btn btn-sm btn-accent" data-complete="${t.id}">Complete</button><button class="btn btn-sm btn-danger" data-cancel="${t.id}">Cancel</button>` : ""}
                ${(t.status === "Completed" || t.status === "Cancelled") ? "—" : ""}
              </td>` : ""}
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;

  if (canManage) {
    content.querySelectorAll("[data-dispatch]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await Api.dispatchTrip(btn.dataset.dispatch);
          toast("Trip dispatched.");
          navigate("trips");
        } catch (err) { toast(err.message, true); }
      });
    });
    content.querySelectorAll("[data-cancel]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Cancel this trip?")) return;
        try {
          await Api.cancelTrip(btn.dataset.cancel);
          toast("Trip cancelled.");
          navigate("trips");
        } catch (err) { toast(err.message, true); }
      });
    });
    content.querySelectorAll("[data-complete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const trip = trips.find((x) => x.id == btn.dataset.complete);
        openCompleteTripForm(trip, vMap[trip.vehicle_id]);
      });
    });
  }
}

function openTripForm() {
  const availableVehicles = state.cache.vehicles.filter((v) => v.status === "Available");
  const today = new Date().toISOString().slice(0, 10);
  const availableDrivers = state.cache.drivers.filter((d) => d.status === "Available" && d.license_expiry_date >= today);

  openModal({
    title: "Create New Trip",
    bodyHtml: `
      <div class="field-row">
        <div class="field"><label>Source</label><input id="tf-source" placeholder="Patna" /></div>
        <div class="field"><label>Destination</label><input id="tf-dest" placeholder="Ranchi" /></div>
      </div>
      <div class="field">
        <label>Vehicle (dispatch-eligible only)</label>
        <select id="tf-vehicle">
          ${availableVehicles.length ? availableVehicles.map((v) => `<option value="${v.id}" data-load="${v.max_load_capacity}">${escapeHtml(v.registration_number)} — ${escapeHtml(v.name)} (max ${v.max_load_capacity}kg)</option>`).join("") : `<option disabled selected>No available vehicles</option>`}
        </select>
      </div>
      <div class="field">
        <label>Driver (valid license &amp; available only)</label>
        <select id="tf-driver">
          ${availableDrivers.length ? availableDrivers.map((d) => `<option value="${d.id}">${escapeHtml(d.name)} — ${escapeHtml(d.license_number)}</option>`).join("") : `<option disabled selected>No eligible drivers</option>`}
        </select>
      </div>
      <div class="field-row">
        <div class="field"><label>Cargo Weight (kg)</label><input id="tf-cargo" type="number" step="0.01" /></div>
        <div class="field"><label>Planned Distance (km)</label><input id="tf-distance" type="number" step="0.01" /></div>
      </div>
      <div class="field-hint" id="tf-load-hint"></div>
      <div class="field-error" id="tf-error"></div>
    `,
    footerHtml: `<button class="btn" id="tf-cancel">Cancel</button><button class="btn btn-accent" id="tf-save" ${(!availableVehicles.length || !availableDrivers.length) ? "disabled" : ""}>Create Trip</button>`,
    onMount: () => {
      const updateHint = () => {
        const opt = document.getElementById("tf-vehicle").selectedOptions[0];
        const load = opt ? opt.dataset.load : null;
        document.getElementById("tf-load-hint").textContent = load ? `Max load capacity for selected vehicle: ${load} kg` : "";
      };
      updateHint();
      document.getElementById("tf-vehicle").addEventListener("change", updateHint);
      document.getElementById("tf-cancel").addEventListener("click", closeModal);
      document.getElementById("tf-save").addEventListener("click", async () => {
        const errEl = document.getElementById("tf-error");
        errEl.textContent = "";
        const payload = {
          source: document.getElementById("tf-source").value.trim(),
          destination: document.getElementById("tf-dest").value.trim(),
          vehicle_id: parseInt(document.getElementById("tf-vehicle").value),
          driver_id: parseInt(document.getElementById("tf-driver").value),
          cargo_weight: parseFloat(document.getElementById("tf-cargo").value),
          planned_distance: parseFloat(document.getElementById("tf-distance").value),
        };
        try {
          await Api.createTrip(payload);
          closeModal();
          toast("Trip created as Draft.");
          navigate("trips");
        } catch (err) {
          errEl.textContent = err.message;
        }
      });
    },
  });
}

function openCompleteTripForm(trip, vehicle) {
  openModal({
    title: `Complete Trip #${trip.id}`,
    bodyHtml: `
      <div class="field-hint">Current odometer: ${fmtNum(vehicle?.odometer, " km")}</div>
      <div class="field"><label>Final Odometer (km)</label><input id="cf-odo" type="number" step="0.01" value="${(vehicle?.odometer || 0) + trip.planned_distance}" /></div>
      <div class="field-row">
        <div class="field"><label>Fuel Consumed (liters)</label><input id="cf-fuel" type="number" step="0.01" /></div>
        <div class="field"><label>Fuel Cost (₹)</label><input id="cf-fuelcost" type="number" step="0.01" value="0" /></div>
      </div>
      <div class="field"><label>Trip Revenue (₹, optional — used for ROI reporting)</label><input id="cf-revenue" type="number" step="0.01" value="0" /></div>
      <div class="field-error" id="cf-error"></div>
    `,
    footerHtml: `<button class="btn" id="cf-cancel">Cancel</button><button class="btn btn-accent" id="cf-save">Mark Completed</button>`,
    onMount: () => {
      document.getElementById("cf-cancel").addEventListener("click", closeModal);
      document.getElementById("cf-save").addEventListener("click", async () => {
        const errEl = document.getElementById("cf-error");
        errEl.textContent = "";
        const payload = {
          final_odometer: parseFloat(document.getElementById("cf-odo").value),
          fuel_consumed: parseFloat(document.getElementById("cf-fuel").value || 0),
          fuel_cost: parseFloat(document.getElementById("cf-fuelcost").value || 0),
          revenue: parseFloat(document.getElementById("cf-revenue").value || 0),
        };
        try {
          await Api.completeTrip(trip.id, payload);
          closeModal();
          toast("Trip completed. Vehicle and driver are now Available.");
          navigate("trips");
        } catch (err) {
          errEl.textContent = err.message;
        }
      });
    },
  });
}

// ============================================================
// MAINTENANCE
// ============================================================
async function renderMaintenance() {
  const canManage = canWrite("fleet_manager");
  const actionsEl = document.getElementById("view-actions");
  if (canManage) {
    actionsEl.innerHTML = `<button class="btn btn-accent" id="add-maint-btn">+ New Maintenance Record</button>`;
  }

  const [logs, vehicles] = await Promise.all([Api.listMaintenance(), Api.listVehicles()]);
  state.cache.maintenance = logs; state.cache.vehicles = vehicles;
  const vMap = Object.fromEntries(vehicles.map((v) => [v.id, v]));
  const content = document.getElementById("view-content");

  if (canManage) {
    document.getElementById("add-maint-btn").addEventListener("click", () => openMaintenanceForm(vehicles));
  }

  if (!logs.length) {
    content.innerHTML = emptyState("No maintenance records.", canManage ? "Log a maintenance record — the vehicle will automatically move to In Shop." : "Maintenance history will appear here.");
    return;
  }

  content.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Vehicle</th><th>Description</th><th>Cost</th><th>Date</th><th>Status</th>${canManage ? "<th></th>" : ""}</tr></thead>
        <tbody>
          ${logs.map((m) => `
            <tr>
              <td><span class="plate">${escapeHtml(vMap[m.vehicle_id]?.registration_number || "—")}</span></td>
              <td>${escapeHtml(m.description)}${m.notes ? `<div class="field-hint">${escapeHtml(m.notes)}</div>` : ""}</td>
              <td class="mono">${fmtMoney(m.cost)}</td>
              <td class="mono">${fmtDate(m.date)}</td>
              <td>${pill(m.status)}${m.retire_vehicle ? ' <span class="pill pill-red"><span class="dot"></span>Retired</span>' : ""}</td>
              ${canManage ? `<td class="actions-cell">${m.status === "Active" ? `<button class="btn btn-sm btn-accent" data-close="${m.id}">Close</button>` : "—"}</td>` : ""}
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;

  if (canManage) {
    content.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => openCloseMaintenanceForm(btn.dataset.close));
    });
  }
}

function openMaintenanceForm(vehicles) {
  const eligible = vehicles.filter((v) => v.status !== "On Trip" && v.status !== "Retired");
  openModal({
    title: "New Maintenance Record",
    bodyHtml: `
      <div class="field">
        <label>Vehicle</label>
        <select id="mf-vehicle">
          ${eligible.length ? eligible.map((v) => `<option value="${v.id}">${escapeHtml(v.registration_number)} — ${escapeHtml(v.name)} (${v.status})</option>`).join("") : `<option disabled selected>No eligible vehicles</option>`}
        </select>
      </div>
      <div class="field"><label>Description</label><input id="mf-desc" placeholder="Oil Change / Brake Service / Tire Rotation" /></div>
      <div class="field-row">
        <div class="field"><label>Cost (₹)</label><input id="mf-cost" type="number" step="0.01" value="0" /></div>
        <div class="field"><label>Date</label><input id="mf-date" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
      </div>
      <div class="field"><label>Notes (optional)</label><textarea id="mf-notes" rows="2"></textarea></div>
      <div class="field-hint">Saving this record automatically switches the vehicle's status to <strong>In Shop</strong>, removing it from trip dispatch.</div>
      <div class="field-error" id="mf-error"></div>
    `,
    footerHtml: `<button class="btn" id="mf-cancel">Cancel</button><button class="btn btn-accent" id="mf-save" ${!eligible.length ? "disabled" : ""}>Log Maintenance</button>`,
    onMount: () => {
      document.getElementById("mf-cancel").addEventListener("click", closeModal);
      document.getElementById("mf-save").addEventListener("click", async () => {
        const errEl = document.getElementById("mf-error");
        errEl.textContent = "";
        const payload = {
          vehicle_id: parseInt(document.getElementById("mf-vehicle").value),
          description: document.getElementById("mf-desc").value.trim(),
          cost: parseFloat(document.getElementById("mf-cost").value || 0),
          date: document.getElementById("mf-date").value,
          notes: document.getElementById("mf-notes").value.trim() || null,
        };
        try {
          await Api.createMaintenance(payload);
          closeModal();
          toast("Maintenance logged. Vehicle moved to In Shop.");
          navigate("maintenance");
        } catch (err) {
          errEl.textContent = err.message;
        }
      });
    },
  });
}

function openCloseMaintenanceForm(id) {
  openModal({
    title: "Close Maintenance Record",
    bodyHtml: `
      <div class="field-hint">Closing restores the vehicle to Available — unless you mark it Retired below.</div>
      <label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-top:6px;">
        <input type="checkbox" id="cm-retire" style="width:auto;" /> Retire this vehicle instead of returning it to service
      </label>
      <div class="field-error" id="cm-error"></div>
    `,
    footerHtml: `<button class="btn" id="cm-cancel">Cancel</button><button class="btn btn-accent" id="cm-save">Close Record</button>`,
    onMount: () => {
      document.getElementById("cm-cancel").addEventListener("click", closeModal);
      document.getElementById("cm-save").addEventListener("click", async () => {
        try {
          await Api.closeMaintenance(id, { retire_vehicle: document.getElementById("cm-retire").checked });
          closeModal();
          toast("Maintenance record closed.");
          navigate("maintenance");
        } catch (err) {
          document.getElementById("cm-error").textContent = err.message;
        }
      });
    },
  });
}

// ============================================================
// FUEL & EXPENSES
// ============================================================
async function renderFuel() {
  const canLogFuel = canWrite("fleet_manager", "driver");
  const canLogExpense = canWrite("fleet_manager", "financial_analyst");
  const actionsEl = document.getElementById("view-actions");
  let btns = "";
  if (canLogFuel) btns += `<button class="btn" id="add-fuel-btn">+ Fuel Log</button>`;
  if (canLogExpense) btns += `<button class="btn btn-accent" id="add-expense-btn">+ Expense</button>`;
  actionsEl.innerHTML = btns;

  const [fuelLogs, expenses, vehicles] = await Promise.all([Api.listFuelLogs(), Api.listExpenses(), Api.listVehicles()]);
  state.cache.fuelLogs = fuelLogs; state.cache.expenses = expenses; state.cache.vehicles = vehicles;
  const vMap = Object.fromEntries(vehicles.map((v) => [v.id, v]));
  const content = document.getElementById("view-content");

  if (canLogFuel) document.getElementById("add-fuel-btn").addEventListener("click", () => openFuelForm(vehicles));
  if (canLogExpense) document.getElementById("add-expense-btn").addEventListener("click", () => openExpenseForm(vehicles));

  content.innerHTML = `
    <div class="panel">
      <div class="panel-title">Fuel Logs</div>
      ${fuelLogs.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Vehicle</th><th>Liters</th><th>Cost</th><th>Date</th></tr></thead>
            <tbody>
              ${fuelLogs.map((f) => `
                <tr>
                  <td><span class="plate">${escapeHtml(vMap[f.vehicle_id]?.registration_number || "—")}</span></td>
                  <td class="mono">${fmtNum(f.liters, " L")}</td>
                  <td class="mono">${fmtMoney(f.cost)}</td>
                  <td class="mono">${fmtDate(f.date)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>` : `<div class="section-desc" style="margin:0;">No fuel logs yet. Fuel is also logged automatically when a trip is completed.</div>`}
    </div>

    <div class="panel">
      <div class="panel-title">Expenses</div>
      ${expenses.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Vehicle</th><th>Type</th><th>Amount</th><th>Date</th><th>Notes</th></tr></thead>
            <tbody>
              ${expenses.map((e) => `
                <tr>
                  <td><span class="plate">${escapeHtml(vMap[e.vehicle_id]?.registration_number || "—")}</span></td>
                  <td style="text-transform:capitalize;">${escapeHtml(e.type)}</td>
                  <td class="mono">${fmtMoney(e.amount)}</td>
                  <td class="mono">${fmtDate(e.date)}</td>
                  <td class="field-hint">${escapeHtml(e.notes || "—")}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>` : `<div class="section-desc" style="margin:0;">No expenses logged (tolls, misc. costs, etc.)</div>`}
    </div>
  `;
}

function openFuelForm(vehicles) {
  openModal({
    title: "Log Fuel Entry",
    bodyHtml: `
      <div class="field"><label>Vehicle</label>
        <select id="ff-vehicle">${vehicles.map((v) => `<option value="${v.id}">${escapeHtml(v.registration_number)} — ${escapeHtml(v.name)}</option>`).join("")}</select>
      </div>
      <div class="field-row">
        <div class="field"><label>Liters</label><input id="ff-liters" type="number" step="0.01" /></div>
        <div class="field"><label>Cost (₹)</label><input id="ff-cost" type="number" step="0.01" /></div>
      </div>
      <div class="field"><label>Date</label><input id="ff-date" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
      <div class="field-error" id="ff-error"></div>
    `,
    footerHtml: `<button class="btn" id="ff-cancel">Cancel</button><button class="btn btn-accent" id="ff-save">Save Fuel Log</button>`,
    onMount: () => {
      document.getElementById("ff-cancel").addEventListener("click", closeModal);
      document.getElementById("ff-save").addEventListener("click", async () => {
        try {
          await Api.createFuelLog({
            vehicle_id: parseInt(document.getElementById("ff-vehicle").value),
            liters: parseFloat(document.getElementById("ff-liters").value),
            cost: parseFloat(document.getElementById("ff-cost").value),
            date: document.getElementById("ff-date").value,
          });
          closeModal();
          toast("Fuel log recorded.");
          navigate("fuel");
        } catch (err) { document.getElementById("ff-error").textContent = err.message; }
      });
    },
  });
}

function openExpenseForm(vehicles) {
  openModal({
    title: "Log Expense",
    bodyHtml: `
      <div class="field"><label>Vehicle</label>
        <select id="ef-vehicle">${vehicles.map((v) => `<option value="${v.id}">${escapeHtml(v.registration_number)} — ${escapeHtml(v.name)}</option>`).join("")}</select>
      </div>
      <div class="field-row">
        <div class="field"><label>Type</label><select id="ef-type"><option value="toll">Toll</option><option value="maintenance">Maintenance</option><option value="other">Other</option></select></div>
        <div class="field"><label>Amount (₹)</label><input id="ef-amount" type="number" step="0.01" /></div>
      </div>
      <div class="field"><label>Date</label><input id="ef-date" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
      <div class="field"><label>Notes (optional)</label><input id="ef-notes" /></div>
      <div class="field-error" id="ef-error"></div>
    `,
    footerHtml: `<button class="btn" id="ef-cancel">Cancel</button><button class="btn btn-accent" id="ef-save">Save Expense</button>`,
    onMount: () => {
      document.getElementById("ef-cancel").addEventListener("click", closeModal);
      document.getElementById("ef-save").addEventListener("click", async () => {
        try {
          await Api.createExpense({
            vehicle_id: parseInt(document.getElementById("ef-vehicle").value),
            type: document.getElementById("ef-type").value,
            amount: parseFloat(document.getElementById("ef-amount").value),
            date: document.getElementById("ef-date").value,
            notes: document.getElementById("ef-notes").value.trim() || null,
          });
          closeModal();
          toast("Expense recorded.");
          navigate("fuel");
        } catch (err) { document.getElementById("ef-error").textContent = err.message; }
      });
    },
  });
}

// ============================================================
// REPORTS & ANALYTICS
// ============================================================
async function renderReports() {
  const actionsEl = document.getElementById("view-actions");
  actionsEl.innerHTML = `<a class="btn btn-accent" href="/api/reports/vehicles/export.csv?token=" id="export-csv-link">Export CSV</a>`;
  // Attach auth header via fetch+blob since <a> can't send headers
  document.getElementById("export-csv-link").addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest("/reports/vehicles/export.csv", { raw: true });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "transitops_vehicle_report.csv";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) { toast(err.message, true); }
  });

  const rows = await Api.vehicleReports();
  const content = document.getElementById("view-content");

  if (!rows.length) {
    content.innerHTML = emptyState("No report data yet.", "Register vehicles and complete trips to generate analytics.");
    return;
  }

  content.innerHTML = `
    <div class="section-desc">Fuel Efficiency (km/L), Operational Cost (Fuel + Maintenance + Expenses), and ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost, per vehicle.</div>
    <div class="report-grid">
      ${rows.map((r) => `
        <div class="vehicle-report-card">
          <div class="vr-head">
            <span class="plate">${escapeHtml(r.registration_number)}</span>
            ${pill(r.status)}
          </div>
          <div class="vr-metric"><span>Vehicle</span><span style="font-family:var(--font-body); font-weight:600;">${escapeHtml(r.name)}</span></div>
          <div class="vr-metric"><span>Total Distance</span><span>${fmtNum(r.total_distance_km, " km")}</span></div>
          <div class="vr-metric"><span>Fuel Consumed</span><span>${fmtNum(r.total_fuel_liters, " L")}</span></div>
          <div class="vr-metric"><span>Fuel Efficiency</span><span>${r.fuel_efficiency_km_per_liter !== null ? fmtNum(r.fuel_efficiency_km_per_liter, " km/L") : "—"}</span></div>
          <div class="vr-metric"><span>Fuel Cost</span><span>${fmtMoney(r.total_fuel_cost)}</span></div>
          <div class="vr-metric"><span>Maintenance Cost</span><span>${fmtMoney(r.total_maintenance_cost)}</span></div>
          <div class="vr-metric"><span>Other Expenses</span><span>${fmtMoney(r.total_expenses)}</span></div>
          <div class="vr-metric"><span>Operational Cost</span><span>${fmtMoney(r.operational_cost)}</span></div>
          <div class="vr-metric"><span>Revenue</span><span>${fmtMoney(r.total_revenue)}</span></div>
          <div class="vr-metric"><span>Acquisition Cost</span><span>${fmtMoney(r.acquisition_cost)}</span></div>
          <div class="vr-metric"><span>ROI</span><span style="color:${r.roi !== null && r.roi < 0 ? 'var(--accent-red)' : 'var(--accent-teal)'}">${r.roi !== null ? (r.roi * 100).toFixed(1) + "%" : "—"}</span></div>
        </div>`).join("")}
    </div>
  `;
}
