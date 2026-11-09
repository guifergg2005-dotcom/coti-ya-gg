import React from 'react';
import { Shield } from 'lucide-react';
export default function UserManagement({ currentUser }) {
  if (currentUser?.role !== 'admin') return <p>Acceso denegado.</p>;
  return <div className="bg-white rounded-xl shadow-sm border p-6">
    <h2 className="text-2xl font-bold flex items-center gap-2"><Shield /> Control de acceso</h2>
    <p className="mt-4 font-bold">SERYVER-admin</p>
    <p className="text-gray-600">Administrador único. Acceso a todos los módulos.</p>
  </div>;
}
