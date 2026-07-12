import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Truck, Users, Map, Wrench, DollarSign, LogOut } from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
    { name: 'Vehicles', path: '/vehicles', icon: Truck, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer'] },
    { name: 'Drivers', path: '/drivers', icon: Users, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer'] },
    { name: 'Trips', path: '/trips', icon: Map, roles: ['Dispatcher', 'Fleet Manager'] },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench, roles: ['Fleet Manager'] },
    { name: 'Finance', path: '/expenses', icon: DollarSign, roles: ['Financial Analyst', 'Fleet Manager'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col h-full shadow-xl">
      <div className="p-6 border-b border-dark-700">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Truck className="text-accent-500" />
          TransitOps
        </h2>
        <div className="mt-3 bg-dark-900/50 rounded-lg p-3 border border-dark-700/50">
          <p className="text-xs text-slate-400">Role</p>
          <p className="text-sm font-semibold text-accent-500">{user.role}</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNav.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-accent-500/10 text-accent-500 font-medium' : 'text-slate-400 hover:bg-dark-700/50 hover:text-slate-200'}`
            }
          >
            <item.icon size={20} className="shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-dark-700">
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:bg-dark-700/50 hover:text-red-400 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
