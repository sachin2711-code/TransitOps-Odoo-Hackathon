import { useEffect, useMemo, useState } from 'react';

const ROLE_LABELS = {
  fleet_manager: 'Fleet Manager',
  dispatcher: 'Dispatcher',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

const STATUS_STYLES = {
  Available: 'bg-teal-500/15 text-teal-200',
  'On Trip': 'bg-blue-500/15 text-blue-200',
  'In Shop': 'bg-amber-500/15 text-amber-200',
  Retired: 'bg-red-500/15 text-red-200',
  'Off Duty': 'bg-amber-500/15 text-amber-200',
  Suspended: 'bg-red-500/15 text-red-200',
  Draft: 'bg-amber-500/15 text-amber-200',
  Dispatched: 'bg-blue-500/15 text-blue-200',
  Completed: 'bg-teal-500/15 text-teal-200',
  Cancelled: 'bg-red-500/15 text-red-200',
  Active: 'bg-amber-500/15 text-amber-200',
  Closed: 'bg-teal-500/15 text-teal-200',
};

const backend = import.meta.env.DEV ? '/api' : '/api';

const storage = {
  getToken: () => localStorage.getItem('transitops_token'),
  setToken: (token) => localStorage.setItem('transitops_token', token),
  getUser: () => JSON.parse(localStorage.getItem('transitops_user') || 'null'),
  setUser: (user) => localStorage.setItem('transitops_user', JSON.stringify(user)),
  clear: () => { localStorage.removeItem('transitops_token'); localStorage.removeItem('transitops_user'); },
};

const api = async (path, options = {}) => {
  const opts = { headers: {}, ...options };
  const token = storage.getToken();
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${backend}${path}`, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.detail || `Request failed ${res.status}`);
  }
  return res.json();
};

function App() {
  const [user, setUser] = useState(storage.getUser());
  const [view, setView] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [state, setState] = useState({ vehicles: [], drivers: [], trips: [], maintenance: [], fuels: [], expenses: [] });

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const can = (roles) => roles.includes(user?.role);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3600);
  };

  const fetcher = async (path, opts) => {
    try { return await api(path, opts); }
    catch (err) { showToast(err.message); throw err; }
  };

  const loadAll = async () => {
    const [vehicles, drivers, trips, maintenance, fuels, expenses] = await Promise.all([
      fetcher('/vehicles'),
      fetcher('/drivers'),
      fetcher('/trips'),
      fetcher('/maintenance'),
      fetcher('/fuels'),
      fetcher('/expenses'),
    ]);
    setState({ vehicles, drivers, trips, maintenance, fuels, expenses });
  };

  const handleLogin = async (form) => {
    const data = await api('/auth/login', { method: 'POST', body: form });
    storage.setToken(data.token); storage.setUser(data.user);
    setUser(data.user);
    showToast(`Welcome back, ${data.user.name}`);
  };

  const handleRegister = async (form) => {
    await api('/auth/register', { method: 'POST', body: form });
    const data = await api('/auth/login', { method: 'POST', body: form });
    storage.setToken(data.token); storage.setUser(data.user);
    setUser(data.user);
    showToast(`Account created for ${data.user.name}`);
  };

  const activeView = useMemo(() => {
    if (!user) return <AuthScreen onAuth={handleLogin} onRegister={handleRegister} />;
    const views = {
      dashboard: <Dashboard state={state} />,
      vehicles: <Vehicles state={state} reload={loadAll} canWrite={can(['fleet_manager'])} />,
      drivers: <Drivers state={state} reload={loadAll} canWrite={can(['fleet_manager'])} />,
      trips: <Trips state={state} reload={loadAll} canWrite={can(['dispatcher'])} />,
      maintenance: <Maintenance state={state} reload={loadAll} canWrite={can(['fleet_manager'])} />,
      fuel: <FuelExpenses state={state} reload={loadAll} canWrite={can(['fleet_manager', 'dispatcher', 'financial_analyst'])} />,
      reports: <Reports state={state} />,
    };
    return views[view] || views.dashboard;
  }, [user, view, state]);

  const logout = () => { storage.clear(); setUser(null); setView('dashboard'); };

  if (!user) return activeView;

  return (
    <div className="min-h-screen bg-[#0E1319] text-[#E7EBF1]">
      <div className="flex min-h-screen">
        <aside className="w-72 bg-[#161D27] border-r border-[#2A3341] px-5 py-6 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#34C9BE] to-[#5B8DEF] grid place-items-center text-[#06181A] font-bold">TO</div>
            <div>
              <div className="font-semibold text-lg">TransitOps</div>
              <div className="text-xs text-[#8B96A8]">Fleet Operations Platform</div>
            </div>
          </div>
          <nav className="flex-1 space-y-2">
            {['dashboard','vehicles','drivers','trips','maintenance','fuel','reports'].map((item) => (
              <button
                key={item}
                onClick={() => setView(item)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-left transition ${view === item ? 'bg-[#1C2430] text-white' : 'text-[#8B96A8] hover:bg-[#1C2430]'}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${view === item ? 'bg-[#34C9BE]' : 'bg-[#5D6779]'}`} />
                {item === 'dashboard' ? 'Dashboard' : item === 'fuel' ? 'Fuel & Expenses' : item === 'reports' ? 'Reports & Analytics' : item === 'trips' ? 'Trips & Dispatch' : item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </nav>
          <div className="mt-8 rounded-3xl border border-[#2A3341] bg-[#0F1720] p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-2xl bg-[#0E1319] grid place-items-center text-[#34C9BE] font-bold">{user.name?.slice(0,1)}</div>
              <div>
                <div className="font-semibold text-sm">{user.name}</div>
                <div className="text-xs text-[#8B96A8]">{ROLE_LABELS[user.role]}</div>
              </div>
            </div>
            <button onClick={logout} className="w-full rounded-2xl border border-[#2A3341] py-2 text-sm text-[#8B96A8] hover:bg-[#1C2430]">Sign Out</button>
          </div>
        </aside>
        <main className="flex-1 p-8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <div className="text-3xl font-semibold">{view === 'dashboard' ? 'Dashboard' : view === 'fuel' ? 'Fuel & Expenses' : view === 'reports' ? 'Reports & Analytics' : view === 'trips' ? 'Trips & Dispatch' : view === 'vehicles' ? 'Vehicle Registry' : view === 'drivers' ? 'Driver Management' : 'Maintenance'}</div>
              <div className="text-sm text-[#8B96A8] mt-1">Role: {ROLE_LABELS[user.role]}</div>
            </div>
          </div>
          {activeView}
        </main>
      </div>
      {toast && <div className="fixed right-6 top-6 rounded-3xl border border-[#2A3341] bg-[#161D27] px-5 py-3 text-sm shadow-panel">{toast}</div>}
    </div>
  );
}

function AuthScreen({ onAuth, onRegister }) {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'fleet_manager' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'signin') await onAuth({ email: form.email, password: form.password });
      else await onRegister(form);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,rgba(52,201,190,0.09),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(232,163,61,0.08),transparent_40%),#0E1319] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[1rem] border border-[#2A3341] bg-[#161D27] p-8 shadow-panel">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-3xl bg-gradient-to-br from-[#34C9BE] to-[#5B8DEF] grid place-items-center text-[#06181A] font-bold">TO</div>
          <div>
            <div className="text-xl font-semibold">TransitOps</div>
            <div className="text-sm text-[#8B96A8]">Fleet Operations Console</div>
          </div>
        </div>
        <div className="mb-6 flex gap-2 rounded-3xl bg-[#1C2430] p-1">
          <button onClick={() => setMode('signin')} className={`flex-1 rounded-3xl py-3 text-sm font-semibold ${mode === 'signin' ? 'bg-[#161D27] text-white' : 'text-[#8B96A8]'}`}>Sign In</button>
          <button onClick={() => setMode('signup')} className={`flex-1 rounded-3xl py-3 text-sm font-semibold ${mode === 'signup' ? 'bg-[#161D27] text-white' : 'text-[#8B96A8]'}`}>Create Account</button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label className="block text-sm text-[#8B96A8]">Full Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-2xl border border-[#2A3341] bg-[#0F1720] px-4 py-3 text-white outline-none focus:border-[#34C9BE]" required />
            </label>
          )}
          <label className="block text-sm text-[#8B96A8]">Email
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="mt-2 w-full rounded-2xl border border-[#2A3341] bg-[#0F1720] px-4 py-3 text-white outline-none focus:border-[#34C9BE]" required />
          </label>
          <label className="block text-sm text-[#8B96A8]">Password
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" className="mt-2 w-full rounded-2xl border border-[#2A3341] bg-[#0F1720] px-4 py-3 text-white outline-none focus:border-[#34C9BE]" required minLength={6} />
          </label>
          {mode === 'signup' && (
            <label className="block text-sm text-[#8B96A8]">Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-2 w-full rounded-2xl border border-[#2A3341] bg-[#0F1720] px-4 py-3 text-white outline-none focus:border-[#34C9BE]">
                <option value="fleet_manager">Fleet Manager</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="safety_officer">Safety Officer</option>
                <option value="financial_analyst">Financial Analyst</option>
              </select>
            </label>
          )}
          {error && <div className="rounded-2xl bg-[#331412] border border-[#7A342B] px-4 py-3 text-sm text-[#E85D4E]">{error}</div>}
          <button type="submit" className="w-full rounded-2xl bg-gradient-to-br from-[#34C9BE] to-[#5B8DEF] px-5 py-3 text-sm font-semibold text-[#06181A]">{mode === 'signin' ? 'Enter Console' : 'Create Account'}</button>
        </form>
        <div className="mt-6 rounded-3xl border border-[#2A3341] bg-[#0F1720] p-4 text-sm text-[#8B96A8]">
          <div className="font-semibold text-xs uppercase tracking-[0.2em] text-[#7A98A6] mb-3">Demo Accounts</div>
          <div className="space-y-2 text-xs">
            <div>Fleet Manager — fleet.manager@transitops.demo</div>
            <div>Dispatcher — driver@transitops.demo</div>
            <div>Safety Officer — safety.officer@transitops.demo</div>
            <div>Financial Analyst — finance@transitops.demo</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ state }) {
  const activeVehicles = state.vehicles.filter((v) => v.status === 'Available' || v.status === 'On Trip').length;
  const availableVehicles = state.vehicles.filter((v) => v.status === 'Available').length;
  const inShopVehicles = state.vehicles.filter((v) => v.status === 'In Shop').length;
  const activeTrips = state.trips.filter((t) => t.status === 'Dispatched').length;
  const pendingTrips = state.trips.filter((t) => t.status === 'Draft').length;
  const driversOnDuty = state.drivers.filter((d) => d.status === 'On Trip').length;
  const utilization = state.vehicles.length ? Math.round((activeVehicles / state.vehicles.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-5 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2">
        {[
          { label: 'Active Vehicles', value: activeVehicles, accent: 'from-teal-500 to-cyan-500' },
          { label: 'Available Vehicles', value: availableVehicles, accent: 'from-blue-500 to-indigo-500' },
          { label: 'Vehicles in Maintenance', value: inShopVehicles, accent: 'from-amber-500 to-orange-500' },
          { label: 'Active Trips', value: activeTrips, accent: 'from-violet-500 to-fuchsia-500' },
        ].map((item) => (
          <div key={item.label} className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-6 shadow-panel">
            <div className="text-xs uppercase tracking-[0.24em] text-[#8B96A8]">{item.label}</div>
            <div className="mt-4 text-4xl font-semibold">{item.value}</div>
            <div className={`mt-4 h-1 rounded-full bg-gradient-to-r ${item.accent}`} />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3 lg:grid-cols-2">
        <div className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-6 shadow-panel">
          <div className="text-xs uppercase tracking-[0.24em] text-[#8B96A8]">Pending Trips</div>
          <div className="mt-4 text-3xl font-semibold">{pendingTrips}</div>
        </div>
        <div className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-6 shadow-panel">
          <div className="text-xs uppercase tracking-[0.24em] text-[#8B96A8]">Drivers On Duty</div>
          <div className="mt-4 text-3xl font-semibold">{driversOnDuty}</div>
        </div>
        <div className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-6 shadow-panel">
          <div className="text-xs uppercase tracking-[0.24em] text-[#8B96A8]">Fleet Utilization</div>
          <div className="mt-4 text-3xl font-semibold">{utilization}%</div>
        </div>
      </div>
      <div className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-6 shadow-panel">
        <div className="text-xs uppercase tracking-[0.24em] text-[#8B96A8] mb-4">Vehicle Status Breakdown</div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {['Available','On Trip','In Shop','Retired'].map((status) => (
            <div key={status} className="rounded-3xl bg-[#0F1720] p-4">
              <div className="text-sm text-[#8B96A8]">{status}</div>
              <div className="mt-3 text-2xl font-semibold">{state.vehicles.filter((v) => v.status === status).length}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Vehicles({ state, canWrite }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[#8B96A8]">Manage the master vehicle registry, including dispatch availability.</div>
        {canWrite && <button className="rounded-2xl bg-gradient-to-br from-[#34C9BE] to-[#5B8DEF] px-4 py-3 text-sm font-semibold text-[#06181A]">Add Vehicle</button>}
      </div>
      <div className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-5 shadow-panel overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.24em] text-[#8B96A8]">
              {['Reg. Number','Name / Model','Type','Capacity','Odometer','Cost','Region','Status'].map((head) => <th key={head} className="pb-3 pr-6">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {state.vehicles.map((vehicle) => (
              <tr key={vehicle._id} className="rounded-3xl bg-[#0F1720] border border-[#1F2934]">
                <td className="py-4 pr-6 font-medium">{vehicle.registrationNumber}</td>
                <td className="py-4 pr-6">{vehicle.name}</td>
                <td className="py-4 pr-6">{vehicle.type}</td>
                <td className="py-4 pr-6">{vehicle.maxLoadCapacity} kg</td>
                <td className="py-4 pr-6">{vehicle.odometer.toLocaleString()} km</td>
                <td className="py-4 pr-6">₹{vehicle.acquisitionCost.toLocaleString()}</td>
                <td className="py-4 pr-6">{vehicle.region}</td>
                <td className="py-4 pr-6"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[vehicle.status] || 'bg-[#2A3341] text-[#8B96A8]'}`}>{vehicle.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Drivers({ state, canWrite }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[#8B96A8]">Driver profiles, license status, and safety score tracking.</div>
        {canWrite && <button className="rounded-2xl bg-gradient-to-br from-[#34C9BE] to-[#5B8DEF] px-4 py-3 text-sm font-semibold text-[#06181A]">Add Driver</button>}
      </div>
      <div className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-5 shadow-panel overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.24em] text-[#8B96A8]">
              {['Name','License','Category','Expiry','Contact','Safety','Status'].map((head) => <th key={head} className="pb-3 pr-6">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {state.drivers.map((driver) => (
              <tr key={driver._id} className="rounded-3xl bg-[#0F1720] border border-[#1F2934]">
                <td className="py-4 pr-6 font-medium">{driver.name}</td>
                <td className="py-4 pr-6">{driver.licenseNumber}</td>
                <td className="py-4 pr-6">{driver.licenseCategory}</td>
                <td className="py-4 pr-6">{new Date(driver.licenseExpiryDate).toLocaleDateString()}</td>
                <td className="py-4 pr-6">{driver.contactNumber}</td>
                <td className="py-4 pr-6">{driver.safetyScore}</td>
                <td className="py-4 pr-6"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[driver.status] || 'bg-[#2A3341] text-[#8B96A8]'}`}>{driver.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Trips({ state, canWrite }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[#8B96A8]">Dispatch control with strict business-rule enforcement.</div>
        {canWrite && <button className="rounded-2xl bg-gradient-to-br from-[#34C9BE] to-[#5B8DEF] px-4 py-3 text-sm font-semibold text-[#06181A]">New Trip</button>}
      </div>
      <div className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-5 shadow-panel overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.24em] text-[#8B96A8]">
              {['Route','Vehicle','Driver','Cargo','Distance','Status','Revenue'].map((head) => <th key={head} className="pb-3 pr-6">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {state.trips.map((trip) => (
              <tr key={trip._id} className="rounded-3xl bg-[#0F1720] border border-[#1F2934]">
                <td className="py-4 pr-6 font-medium">{trip.source} → {trip.destination}</td>
                <td className="py-4 pr-6">{trip.vehicle?.registrationNumber || '—'}</td>
                <td className="py-4 pr-6">{trip.driver?.name || '—'}</td>
                <td className="py-4 pr-6">{trip.cargoWeight} kg</td>
                <td className="py-4 pr-6">{trip.plannedDistance} km</td>
                <td className="py-4 pr-6"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[trip.status] || 'bg-[#2A3341] text-[#8B96A8]'}`}>{trip.status}</span></td>
                <td className="py-4 pr-6">₹{trip.revenue?.toLocaleString() || '0'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Maintenance({ state, canWrite }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[#8B96A8]">Track active maintenance and vehicle shop status.</div>
        {canWrite && <button className="rounded-2xl bg-gradient-to-br from-[#34C9BE] to-[#5B8DEF] px-4 py-3 text-sm font-semibold text-[#06181A]">New Maintenance</button>}
      </div>
      <div className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-5 shadow-panel overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.24em] text-[#8B96A8]">
              {['Vehicle','Description','Cost','Status','Opened','Closed'].map((head) => <th key={head} className="pb-3 pr-6">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {state.maintenance.map((item) => (
              <tr key={item._id} className="rounded-3xl bg-[#0F1720] border border-[#1F2934]">
                <td className="py-4 pr-6 font-medium">{item.vehicle?.registrationNumber || '—'}</td>
                <td className="py-4 pr-6">{item.description}</td>
                <td className="py-4 pr-6">₹{item.cost.toLocaleString()}</td>
                <td className="py-4 pr-6"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[item.status] || 'bg-[#2A3341] text-[#8B96A8]'}`}>{item.status}</span></td>
                <td className="py-4 pr-6">{new Date(item.createdAt).toLocaleDateString()}</td>
                <td className="py-4 pr-6">{item.closedAt ? new Date(item.closedAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FuelExpenses({ state, canWrite }) {
  return (
    <div className="space-y-8">
      <div className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-6 shadow-panel grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-sm uppercase tracking-[0.24em] text-[#8B96A8] mb-2">Fuel logs</div>
          <div className="text-3xl font-semibold">{state.fuels.length}</div>
        </div>
        <div>
          <div className="text-sm uppercase tracking-[0.24em] text-[#8B96A8] mb-2">Expenses</div>
          <div className="text-3xl font-semibold">{state.expenses.length}</div>
        </div>
      </div>
      <div className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-5 shadow-panel overflow-x-auto">
        <div className="text-sm uppercase tracking-[0.24em] text-[#8B96A8] mb-4">Recent Fuel Logs</div>
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.24em] text-[#8B96A8]">
              {['Vehicle','Liters','Cost','Date'].map((head) => <th key={head} className="pb-3 pr-6">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {state.fuels.map((item) => (
              <tr key={item._id} className="rounded-3xl bg-[#0F1720] border border-[#1F2934]">
                <td className="py-4 pr-6">{item.vehicle?.registrationNumber || '—'}</td>
                <td className="py-4 pr-6">{item.liters} L</td>
                <td className="py-4 pr-6">₹{item.cost.toLocaleString()}</td>
                <td className="py-4 pr-6">{new Date(item.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-5 shadow-panel overflow-x-auto">
        <div className="text-sm uppercase tracking-[0.24em] text-[#8B96A8] mb-4">Recent Expenses</div>
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.24em] text-[#8B96A8]">
              {['Vehicle','Description','Amount','Date'].map((head) => <th key={head} className="pb-3 pr-6">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {state.expenses.map((item) => (
              <tr key={item._id} className="rounded-3xl bg-[#0F1720] border border-[#1F2934]">
                <td className="py-4 pr-6">{item.vehicle?.registrationNumber || '—'}</td>
                <td className="py-4 pr-6">{item.description}</td>
                <td className="py-4 pr-6">₹{item.amount.toLocaleString()}</td>
                <td className="py-4 pr-6">{new Date(item.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Reports({ state }) {
  const fuelCost = state.fuels.reduce((sum, item) => sum + item.cost, 0);
  const expenseCost = state.expenses.reduce((sum, item) => sum + item.amount, 0);
  const operationalCost = fuelCost + expenseCost;
  const completedDistance = state.trips.filter((t) => t.status === 'Completed').reduce((sum, t) => sum + t.plannedDistance, 0);
  const totalFuel = state.fuels.reduce((sum, item) => sum + item.liters, 0);
  const fuelEfficiency = totalFuel ? (completedDistance / totalFuel).toFixed(2) : 0;
  const totalRevenue = state.trips.reduce((sum, t) => sum + (t.revenue || 0), 0);
  const acquisitionCost = state.vehicles.reduce((sum, v) => sum + v.acquisitionCost, 0);
  const roi = acquisitionCost ? ((totalRevenue - operationalCost) / acquisitionCost).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-3 lg:grid-cols-2">
        {[
          { label: 'Fuel Efficiency', value: `${fuelEfficiency} km/L` },
          { label: 'Operational Cost', value: `₹${operationalCost.toLocaleString()}` },
          { label: 'Fleet ROI', value: roi },
        ].map((item) => (
          <div key={item.label} className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-6 shadow-panel">
            <div className="text-xs uppercase tracking-[0.24em] text-[#8B96A8]">{item.label}</div>
            <div className="mt-4 text-3xl font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-[1.2rem] border border-[#2A3341] bg-[#161D27] p-6 shadow-panel">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-sm uppercase tracking-[0.24em] text-[#8B96A8]">Vehicle ROI Dashboard</div>
            <div className="text-xs text-[#5D6779] mt-1">Revenue minus costs, divided by acquisition cost.</div>
          </div>
          <button className="rounded-2xl bg-[#0F1720] px-4 py-2 text-sm text-[#E7EBF1] border border-[#2A3341] hover:border-[#34C9BE]">Export CSV</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {state.vehicles.map((vehicle) => {
            const revenue = state.trips.filter((t) => t.vehicle?._id === vehicle._id).reduce((sum, t) => sum + (t.revenue || 0), 0);
            const fuelCost = state.fuels.filter((f) => f.vehicle?._id === vehicle._id).reduce((sum, f) => sum + f.cost, 0);
            const maintenanceCost = state.expenses.filter((e) => e.vehicle?._id === vehicle._id).reduce((sum, e) => sum + e.amount, 0);
            const cost = fuelCost + maintenanceCost;
            const roiValue = vehicle.acquisitionCost ? ((revenue - cost) / vehicle.acquisitionCost).toFixed(2) : '0.00';
            return (
              <div key={vehicle._id} className="rounded-3xl border border-[#1F2934] bg-[#0F1720] p-5">
                <div className="text-sm text-[#8B96A8]">{vehicle.registrationNumber}</div>
                <div className="mt-3 text-xl font-semibold">ROI {roiValue}</div>
                <div className="mt-4 text-xs text-[#5D6779]">Cost: ₹{cost.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
