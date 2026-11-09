import React, { useState } from 'react';
import { Users, Key, Lock } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    if (busy) return;
    setError(''); setBusy(true);
    try { await onLogin(username, password); }
    catch (err) { setError(err.message || 'No se pudo iniciar sesión.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h2 className="text-2xl font-bold text-slate-800 text-center">Iniciar Sesión</h2>
        <p className="text-sm text-slate-500 text-center mb-8">Sistema Coti YA G&amp;G</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">Usuario
            <div className="relative mt-1"><Users className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input autoComplete="username" required disabled={busy} className="w-full pl-9 p-2 border rounded-lg" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
          </label>
          <label className="block text-sm">Contraseña
            <div className="relative mt-1"><Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input type="password" autoComplete="current-password" required disabled={busy} className="w-full pl-9 p-2 border rounded-lg" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </label>
          {error && <div role="alert" className="text-red-700 text-sm bg-red-50 p-2 rounded">{error}</div>}
          <button disabled={busy} type="submit" className="w-full bg-blue-600 text-white p-2 rounded-lg font-bold flex justify-center items-center gap-2 disabled:opacity-50">
            <Lock size={16} />{busy ? 'Verificando…' : 'Entrar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
