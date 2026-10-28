import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Eye, Cpu, Activity, ArrowRight, Video, AlertTriangle } from 'lucide-react';

const Landing = ({ onLaunch }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans selection:bg-cyan-500/30">
      
      {/* Navbar */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="DivyaDrishti" 
              className="w-10 h-10 rounded-xl object-cover border border-cyan-500/40 shadow-md shadow-cyan-950/40" 
            />
            <span className="text-xl font-bold tracking-tight text-white">DIVYADRISHTI<span className="text-cyan-400">.AI</span></span>
          </div>
          <button 
            onClick={onLaunch}
            className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition-all flex items-center gap-2 hover:gap-3"
          >
            Launch System <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/20 rounded-full blur-[120px] opacity-50 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium tracking-wide mb-8 inline-block">
              UNIFIED DRIVER SAFETY PIPELINE
            </span>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              The Future of <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Intelligent Road Safety
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              DivyaDrishti merges high-precision computer vision, hardware telemetry, and predictive machine learning to stop accidents before they happen.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onLaunch}
                className="w-full sm:w-auto px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_40px_8px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2"
              >
                <Activity className="w-5 h-5" /> Initialize Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">A Tri-Layered Defense Mechanism</h2>
          <p className="text-slate-400">Our system processes reality in three concurrent streams.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <motion.div 
            whileHover={{ y: -5 }}
            className="p-8 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-cyan-500/30 transition-colors"
          >
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6">
              <Eye className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Vision AI</h3>
            <p className="text-slate-400 leading-relaxed">
              High-precision lane departure tracking, object depth estimation, and driver drowsiness (EAR) monitoring via continuous camera feeds.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="p-8 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-cyan-500/30 transition-colors"
          >
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-6">
              <Cpu className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Telemetry Fusion</h3>
            <p className="text-slate-400 leading-relaxed">
              Real-time ESP32 sensor integration processing accelerometer magnitude, gyroscopic pitch/roll, speed, and MQ3 environmental data.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="p-8 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-cyan-500/30 transition-colors"
          >
            <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-6">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Predictive Engine</h3>
            <p className="text-slate-400 leading-relaxed">
              Machine learning models fuse vision and telemetry to predict driving risks instantly, alerting drivers to MEDIUM, HIGH, or CRITICAL dangers.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Tech Stack Footer */}
      <footer className="border-t border-white/5 mt-12 py-12 text-center text-slate-500">
        <p>Powered by OpenCV, PyTorch, FastAPI, React, and ESP32 Microcontrollers.</p>
      </footer>
    </div>
  );
};

export default Landing;
