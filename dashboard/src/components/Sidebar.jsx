import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Eye, AlertTriangle, MapPin, Shield, History, Settings, X } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/drowsiness', icon: Eye, label: 'Drowsiness Detection' },
  { to: '/emergency', icon: AlertTriangle, label: 'Emergency Alerts' },
  { to: '/gps', icon: MapPin, label: 'GPS Tracking' },
  { to: '/helmet', icon: Shield, label: 'Helmet Status' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 z-30 flex flex-col
        glass border-r border-slate-700/50
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="DivyaDrishti Official Logo" 
              className="w-10 h-10 rounded-xl object-cover border border-cyan-500/40 shadow-lg shadow-cyan-950/40"
            />
            <div>
              <span className="text-white font-bold text-lg tracking-wide block leading-tight">DivyaDrishti</span>
              <p className="text-cyan-400/80 text-[11px] font-medium tracking-wider">AIoT Smart Helmet</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer note */}
        <div className="px-4 py-4 border-t border-slate-700/50">
          <p className="text-slate-600 text-[10px] leading-relaxed">
            DivyaDrishti is an academic IoT prototype and is not a medical device.
          </p>
        </div>
      </aside>
    </>
  );
}
