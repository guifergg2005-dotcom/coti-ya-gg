import { useEffect, useRef, useState } from 'react';
import { signInWithEmailAndPassword, signOut, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { auth } from '../firebase';
import { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, adminProfile } from '../config/adminAccount';
import { verifyPassword } from '../utils/crypto';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const offlinePassword = useRef(null);
  useEffect(() => {
    const reconnect = () => {
      if (!offlinePassword.current) return;
      signInWithEmailAndPassword(auth, ADMIN_EMAIL, offlinePassword.current)
        .then(() => { offlinePassword.current = null; window.dispatchEvent(new Event('coti-auth-restored')); }).catch(console.error);
    };
    window.addEventListener('online', reconnect);
    return () => { window.removeEventListener('online', reconnect); offlinePassword.current = null; };
  }, []);
  const handleLogin = async (username, password) => {
    if (username.trim() !== ADMIN_USERNAME || !await verifyPassword(password, ADMIN_PASSWORD_HASH)) {
      throw new Error('Usuario o contraseña incorrectos.');
    }
    try {
      await setPersistence(auth, inMemoryPersistence);
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
    } catch (error) {
      if (error.code !== 'auth/network-request-failed') {
        throw new Error('No se pudo autenticar la cuenta en Firebase. Comprueba la conexión y la configuración del administrador.', { cause: error });
      }
      offlinePassword.current = password;
      // La cuenta fija también permite trabajar sin conexión; las reglas protegen la nube.
    }
    const profile = adminProfile();
    setCurrentUser(profile);
    return profile;
  };
  const handleLogout = async (setView) => {
    offlinePassword.current = null;
    setCurrentUser(null);
    await signOut(auth);
    if (setView) setView('login');
  };
  return { currentUser, users: [adminProfile()], handleLogin, handleLogout };
}
