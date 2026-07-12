const API_BASE = "/api";

const Auth = {
  // "Remember me" checked -> persist in localStorage (survives browser close).
  // Unchecked -> sessionStorage only (cleared when the tab/browser closes).
  getToken() { return localStorage.getItem("transitops_token") || sessionStorage.getItem("transitops_token"); },
  setToken(t, remember = true) {
    if (remember) { localStorage.setItem("transitops_token", t); sessionStorage.removeItem("transitops_token"); }
    else { sessionStorage.setItem("transitops_token", t); localStorage.removeItem("transitops_token"); }
  },
  clearToken() { localStorage.removeItem("transitops_token"); sessionStorage.removeItem("transitops_token"); },
  getUser() {
    const raw = localStorage.getItem("transitops_user") || sessionStorage.getItem("transitops_user");
    return raw ? JSON.parse(raw) : null;
  },
  setUser(u, remember = true) {
    const raw = JSON.stringify(u);
    if (remember) { localStorage.setItem("transitops_user", raw); sessionStorage.removeItem("transitops_user"); }
    else { sessionStorage.setItem("transitops_user", raw); localStorage.removeItem("transitops_user"); }
  },
  clearUser() { localStorage.removeItem("transitops_user"); sessionStorage.removeItem("transitops_user"); },
};

async function apiRequest(path, { method = "GET", body = null, headers = {}, raw = false } = {}) {
  const opts = {
    method,
    headers: { ...headers },
  };
  const token = Auth.getToken();
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  if (body !== null) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (raw) return res;

  if (res.status === 401) {
    Auth.clearToken();
    Auth.clearUser();
    window.location.reload();
    throw new Error("Session expired. Please sign in again.");
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    const message = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

const Api = {
  login: (email, password, role, remember_me) => apiRequest("/auth/login", { method: "POST", body: { email, password, role: role || null, remember_me: !!remember_me } }),
  forgotPassword: (email) => apiRequest("/auth/forgot-password", { method: "POST", body: { email } }),
  register: (payload) => apiRequest("/auth/register", { method: "POST", body: payload }),
  me: () => apiRequest("/auth/me"),

  dashboard: (params = {}) => apiRequest(`/dashboard${qs(params)}`),

  listVehicles: (params = {}) => apiRequest(`/vehicles${qs(params)}`),
  getVehicle: (id) => apiRequest(`/vehicles/${id}`),
  createVehicle: (payload) => apiRequest("/vehicles", { method: "POST", body: payload }),
  updateVehicle: (id, payload) => apiRequest(`/vehicles/${id}`, { method: "PUT", body: payload }),
  deleteVehicle: (id) => apiRequest(`/vehicles/${id}`, { method: "DELETE" }),

  listDrivers: (params = {}) => apiRequest(`/drivers${qs(params)}`),
  getDriver: (id) => apiRequest(`/drivers/${id}`),
  createDriver: (payload) => apiRequest("/drivers", { method: "POST", body: payload }),
  updateDriver: (id, payload) => apiRequest(`/drivers/${id}`, { method: "PUT", body: payload }),
  deleteDriver: (id) => apiRequest(`/drivers/${id}`, { method: "DELETE" }),

  listTrips: (params = {}) => apiRequest(`/trips${qs(params)}`),
  createTrip: (payload) => apiRequest("/trips", { method: "POST", body: payload }),
  dispatchTrip: (id) => apiRequest(`/trips/${id}/dispatch`, { method: "POST", body: {} }),
  completeTrip: (id, payload) => apiRequest(`/trips/${id}/complete`, { method: "POST", body: payload }),
  cancelTrip: (id) => apiRequest(`/trips/${id}/cancel`, { method: "POST", body: {} }),

  listMaintenance: (params = {}) => apiRequest(`/maintenance${qs(params)}`),
  createMaintenance: (payload) => apiRequest("/maintenance", { method: "POST", body: payload }),
  closeMaintenance: (id, payload) => apiRequest(`/maintenance/${id}/close`, { method: "POST", body: payload }),

  listFuelLogs: (params = {}) => apiRequest(`/fuel-logs${qs(params)}`),
  createFuelLog: (payload) => apiRequest("/fuel-logs", { method: "POST", body: payload }),

  listExpenses: (params = {}) => apiRequest(`/expenses${qs(params)}`),
  createExpense: (payload) => apiRequest("/expenses", { method: "POST", body: payload }),

  vehicleReports: () => apiRequest("/reports/vehicles"),
};

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}
