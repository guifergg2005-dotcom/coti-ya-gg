import React from 'react';

export default function NavButton({ active, onClick, children, icon, highlight }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${active ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-400 hover:bg-slate-700 hover:text-white'} ${highlight && !active ? 'bg-cyan-900/50 border border-cyan-700 text-cyan-100' : ''}`}>
      {icon} {children}
    </button>
  );
}
