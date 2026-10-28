import { useState, useEffect } from 'react';
import { socketService } from '../services/socket';
import { loginWithRfid } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Cpu, ShieldCheck, ShieldAlert, Loader2, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATES = {
  WAITING: 'WAITING',
  SCANNING: 'SCANNING',
  AUTHENTICATING: 'AUTHENTICATING',
  SUCCESS: 'SUCCESS',
  INVALID_CARD: 'INVALID_CARD',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
};

export default function Login() {
  const [status, setStatus] = useState(STATES.WAITING);
  const [message, setMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const socket = socketService.getSocket();

    const handleConnect = () => {
      setStatus(STATES.WAITING);
    };

    const handleDisconnect = () => {
      setStatus(STATES.CONNECTION_ERROR);
    };

    const handleLoginStatus = (data) => {
      if (data.status === 'granted') {
        setStatus(STATES.SUCCESS);
        login('token_' + Date.now(), { name: data.user || 'Sahana', role: 'Authorized Rider' });
        setTimeout(() => navigate('/'), 1200);
      } else {
        setStatus(STATES.INVALID_CARD);
        setMessage('Unauthorized RFID Tag');
        setTimeout(() => {
          setStatus(STATES.WAITING);
          setMessage('');
        }, 3000);
      }
    };

    const handleRfidScanned = async (data) => {
      setStatus(STATES.SCANNING);
      setTimeout(async () => {
        setStatus(STATES.AUTHENTICATING);
        try {
          const res = await loginWithRfid(data.uid);
          if (res.success && res.authenticated) {
            setStatus(STATES.SUCCESS);
            login(res.token, res.user);
            setTimeout(() => navigate('/'), 1200);
          }
        } catch (error) {
          setStatus(STATES.INVALID_CARD);
          setMessage(error.message || 'Please use a registered card.');
          setTimeout(() => {
            setStatus(STATES.WAITING);
            setMessage('');
          }, 3000);
        }
      }, 800);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('login_status', handleLoginStatus);
    socket.on('rfid_scanned', handleRfidScanned);

    if (socket.connected) {
      setStatus(STATES.WAITING);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('login_status', handleLoginStatus);
      socket.off('rfid_scanned', handleRfidScanned);
    };
  }, [login, navigate]);

  const renderIcon = () => {
    switch (status) {
      case STATES.WAITING:
        return (
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
            <Cpu className="w-24 h-24 text-blue-400 relative z-10" strokeWidth={1.5} />
          </motion.div>
        );
      case STATES.SCANNING:
      case STATES.AUTHENTICATING:
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          >
            <Loader2 className="w-24 h-24 text-blue-400" strokeWidth={1.5} />
          </motion.div>
        );
      case STATES.SUCCESS:
        return (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
            <ShieldCheck className="w-24 h-24 text-emerald-400 relative z-10" strokeWidth={1.5} />
          </motion.div>
        );
      case STATES.INVALID_CARD:
        return (
          <motion.div
            initial={{ x: [-10, 10, -10, 10, 0] }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
            <ShieldAlert className="w-24 h-24 text-red-400 relative z-10" strokeWidth={1.5} />
          </motion.div>
        );
      case STATES.CONNECTION_ERROR:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
            <WifiOff className="w-24 h-24 text-orange-400 relative z-10" strokeWidth={1.5} />
          </div>
        );
      default:
        return null;
    }
  };

  const renderText = () => {
    switch (status) {
      case STATES.WAITING:
        return (
          <>
            <h2 className="text-2xl font-semibold text-white tracking-wide">Tap your RFID Card to Continue</h2>
            <p className="text-gray-400 mt-2">Waiting for RFID card...</p>
          </>
        );
      case STATES.SCANNING:
        return <h2 className="text-2xl font-semibold text-blue-400 tracking-wide">Reading RFID Card...</h2>;
      case STATES.AUTHENTICATING:
        return <h2 className="text-2xl font-semibold text-blue-400 tracking-wide">Verifying Card...</h2>;
      case STATES.SUCCESS:
        return <h2 className="text-2xl font-semibold text-emerald-400 tracking-wide">Access Granted</h2>;
      case STATES.INVALID_CARD:
        return (
          <>
            <h2 className="text-2xl font-semibold text-red-400 tracking-wide">Unauthorized RFID Card</h2>
            <p className="text-gray-400 mt-2">{message}</p>
          </>
        );
      case STATES.CONNECTION_ERROR:
        return (
          <>
            <h2 className="text-2xl font-semibold text-orange-400 tracking-wide">RFID Reader Unavailable</h2>
            <p className="text-gray-400 mt-2">Check the ESP32 connection.</p>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full transform -translate-y-1/2"></div>
      
      <div className="text-center mb-10 z-10 flex flex-col items-center">
        <img 
          src="/logo.jpg" 
          alt="DivyaDrishti" 
          className="w-24 h-24 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-2xl shadow-cyan-950/70 mb-4" 
        />
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight">
          DIVYADRISHTI
        </h1>
        <p className="text-blue-200/60 font-medium tracking-[0.2em] mt-2 text-sm uppercase">
          AIoT Smart Helmet
        </p>
      </div>

      <div className="bg-[#12182b]/80 backdrop-blur-md border border-slate-800/50 rounded-3xl p-12 w-full max-w-md flex flex-col items-center justify-center shadow-2xl relative z-10 min-h-[320px]">
        
        <div className="absolute -top-4 bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          Secure Access
        </div>

        <div className="mb-8 mt-4 h-24 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {renderIcon()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="text-center h-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderText()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Browser Quick Access */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 w-full text-center">
          <button
            onClick={() => {
              login('token_' + Date.now(), { name: 'Sahana', role: 'Authorized Rider' });
              navigate('/');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wide transition-all shadow-lg"
          >
            Enter Dashboard as Sahana →
          </button>
        </div>

      </div>

      <div className="mt-12 text-center text-xs text-slate-500/50 z-10">
        <p>This system uses end-to-end encrypted hardware authentication.</p>
        <p className="mt-1">© 2026 DivyaDrishti. All rights reserved.</p>
      </div>
    </div>
  );
}
