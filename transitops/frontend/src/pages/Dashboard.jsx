import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import { Truck, Map, Wrench, Users, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  // Mock KPI Data
  const kpis = {
    totalVehicles: 45,
    availableVehicles: 28,
    inMaintenance: 4,
    onTrip: 13,
    activeTrips: 12,
    pendingTrips: 5,
    driversOnDuty: 35,
    fleetUtilization: 62 // %
  };

  const chartData = [
    { name: 'Mon', trips: 14 },
    { name: 'Tue', trips: 22 },
    { name: 'Wed', trips: 18 },
    { name: 'Thu', trips: 25 },
    { name: 'Fri', trips: 30 },
    { name: 'Sat', trips: 12 },
    { name: 'Sun', trips: 8 },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Overview</h1>
          <p className="text-slate-400 mt-1">Welcome back, <span className="text-white font-medium">{user.name}</span>. Here's what's happening today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Active Vehicles" value={kpis.onTrip} icon={Truck} colorClass="bg-accent-500/80 shadow-accent-500/30" />
        <StatCard title="Available Vehicles" value={kpis.availableVehicles} icon={CheckCircle} colorClass="bg-success/80 shadow-success/30" />
        <StatCard title="In Maintenance" value={kpis.inMaintenance} icon={Wrench} colorClass="bg-danger/80 shadow-danger/30" />
        <StatCard title="Fleet Utilization" value={`${kpis.fleetUtilization}%`} icon={Map} colorClass="bg-warning/80 shadow-warning/30" trend={4.5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
            <Map className="text-accent-500" size={20} />
            Trips This Week
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#334155', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="trips" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card flex flex-col justify-between">
           <h2 className="text-xl font-semibold mb-4 text-white">Quick Stats</h2>
           <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-dark-900 rounded-xl border border-dark-700 hover:border-dark-600 transition-colors">
                <div className="flex items-center gap-3"><Users className="text-accent-500" /> <span className="text-slate-300 font-medium">Drivers On Duty</span></div>
                <span className="font-bold text-white text-xl">{kpis.driversOnDuty}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-dark-900 rounded-xl border border-dark-700 hover:border-dark-600 transition-colors">
                <div className="flex items-center gap-3"><Clock className="text-warning" /> <span className="text-slate-300 font-medium">Pending Trips</span></div>
                <span className="font-bold text-white text-xl">{kpis.pendingTrips}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-dark-900 rounded-xl border border-dark-700 hover:border-dark-600 transition-colors">
                <div className="flex items-center gap-3"><Map className="text-success" /> <span className="text-slate-300 font-medium">Active Trips</span></div>
                <span className="font-bold text-white text-xl">{kpis.activeTrips}</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
