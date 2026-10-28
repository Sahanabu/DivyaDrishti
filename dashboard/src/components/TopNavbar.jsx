import { useState, useEffect, useRef } from 'react';
import { Menu, User, LogOut, Navigation, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { voiceAlertService } from '../services/voiceAlertService';

export default function TopNavbar({ onMenuClick, connected, esp32Online, onSyncGps, gpsSyncStatus }) {
  const [now, setNow] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(voiceAlertService.isEnabled());
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleVoice = () => {
    const nextState = !voiceEnabled;
    voiceAlertService.setEnabled(nextState);
    setVoiceEnabled(nextState);
    if (nextState) {
      voiceAlertService.speak('Voice ADAS alerts enabled', 'SYSTEM');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const isHardwareOnline = Boolean(connected && esp32Online);

  return (
    <header className="glass border-b border-slate-700/50 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden text-slate-400 hover:text-white p-1">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <img 
            src="/logo.jpg" 
            alt="DivyaDrishti" 
            className="w-8 h-8 rounded-lg object-cover border border-cyan-500/30 shadow-sm"
          />
          <div className="hidden sm:block">
            <h1 className="text-white font-semibold text-sm leading-tight">DIVYADRISHTI</h1>
            <p className="text-slate-400 text-[11px]">AIoT Smart Helmet System</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Voice ADAS Spoken Alerts Toggle */}
        <button
          onClick={toggleVoice}
          title={voiceEnabled ? 'Mute Voice ADAS Alerts' : 'Enable Voice ADAS Alerts'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            voiceEnabled
              ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 hover:bg-blue-500/25'
              : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
          }`}
        >
          {voiceEnabled ? <Volume2 size={13} className="text-blue-400" /> : <VolumeX size={13} />}
          <span className="hidden sm:inline">{voiceEnabled ? 'Voice ADAS' : 'Muted'}</span>
        </button>

        {/* Sync Phone GPS Button */}
        {onSyncGps && (
          <button
            onClick={onSyncGps}
            title="Continuous Zero-Cost GPS Bridge to Helmet"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 transition-all shadow-sm shadow-emerald-950/30"
          >
            <Navigation
              size={13}
              className={
                gpsSyncStatus?.includes('Syncing') || gpsSyncStatus?.includes('Searching')
                  ? 'animate-spin text-emerald-400'
                  : 'text-emerald-400 animate-pulse'
              }
            />
            <span className="font-mono tracking-tight">{gpsSyncStatus || '● Live Phone GPS'}</span>
          </button>
        )}

        {/* Connection status */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
          isHardwareOnline
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isHardwareOnline ? 'status-dot-green' : 'status-dot-red'}`} />
          {isHardwareOnline ? 'ESP32 ONLINE' : 'ESP32 OFFLINE'}
        </div>

        {/* Date/Time */}
        <div className="hidden md:flex flex-col items-end">
          <span className="text-slate-300 text-xs font-mono">{timeStr}</span>
          <span className="text-slate-500 text-[10px]">{dateStr}</span>
        </div>

        {/* Profile */}
        <div className="relative" ref={menuRef}>
          <div 
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors"
          >
            <User size={15} className="text-slate-300" />
          </div>
          
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#12182b] border border-slate-700 rounded-lg shadow-xl py-1 z-50">
              {user && (
                <div className="px-4 py-2 border-b border-slate-800">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-400">{user.role}</p>
                </div>
              )}
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800 flex items-center gap-2 transition"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
