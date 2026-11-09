import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const icons = {
    success: <CheckCircle className="text-green-500 w-5 h-5" />,
    error: <AlertTriangle className="text-red-500 w-5 h-5" />,
    info: <Info className="text-blue-500 w-5 h-5" />
  };

  const bg = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-fade-in-up">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bg[type]}`}>
        {icons[type]}
        <p className="font-medium text-sm">{message}</p>
        <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
