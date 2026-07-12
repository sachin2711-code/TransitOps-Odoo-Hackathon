import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';

export default function Login() {
  const [role, setRole] = useState('Fleet Manager');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    login(role);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-900 text-slate-200">
      <div className="glass-card w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-accent-500 p-4 rounded-full mb-4 shadow-lg shadow-accent-500/30">
            <Truck size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">TransitOps</h1>
          <p className="text-slate-400 text-sm">Smart Transport Operations Platform</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Select Role to Demo</label>
            <select 
              className="input-field cursor-pointer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="Fleet Manager">Fleet Manager</option>
              <option value="Dispatcher">Dispatcher</option>
              <option value="Safety Officer">Safety Officer</option>
              <option value="Financial Analyst">Financial Analyst</option>
            </select>
          </div>
          <button type="submit" className="btn-primary w-full py-3 text-lg font-semibold shadow-lg shadow-accent-500/25">
            Sign In to Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
