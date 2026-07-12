import { clsx } from 'clsx';

export default function StatCard({ title, value, icon: Icon, colorClass, trend }) {
  return (
    <div className="glass-card flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
      <div>
        <p className="text-sm text-slate-400 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
        {trend && (
          <p className={clsx('text-xs mt-2 font-medium flex items-center gap-1', trend > 0 ? 'text-success' : 'text-danger')}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
          </p>
        )}
      </div>
      <div className={clsx('p-4 rounded-xl shadow-lg', colorClass)}>
        <Icon size={28} className="text-white" />
      </div>
    </div>
  );
}
