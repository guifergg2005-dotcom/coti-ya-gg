import React, { useState, useEffect } from 'react';
import { Zap, CloudLightning } from 'lucide-react';

export default function IntroScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setProgress(Math.min(100, Math.floor((Date.now() - started) / 8))), 30);
    const finish = setTimeout(onFinish, 1600);
    return () => { clearInterval(timer); clearTimeout(finish); };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[9999] text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
        <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent opacity-50"></div>
      </div>
      <div className="relative z-10 flex flex-col items-center animate-fade-in-up">
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
          <Zap size={64} className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-slate-400 drop-shadow-sm mb-2 text-center">SERYVER G&G</h1>
        <h2 className="text-xl md:text-2xl font-bold tracking-[0.5em] text-cyan-600 uppercase mb-12">S.A.C.</h2>
        <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-75 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="mt-4 text-xs font-mono text-cyan-500/70 flex items-center gap-2"><CloudLightning size={12} className="animate-pulse" /><span>INICIANDO... {progress}%</span></div>
      </div>
    </div>
  );
}
