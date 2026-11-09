// Única cuenta habilitada. La contraseña se verifica con PBKDF2; nunca se guarda en claro.
export const ADMIN_USERNAME = 'SERYVER-admin';
export const ADMIN_EMAIL = 'seryver-admin@' + import.meta.env.VITE_FIREBASE_PROJECT_ID + '.firebaseapp.com';
export const ADMIN_PASSWORD_HASH = 'pbkdf2-sha256$600000$2bfa909da75c8059d3f5e701d5ce3ad7$f73485d29a10321e3c7b1a110d52976d055d7743afd82a6b0881eeaf4193da2b';
export const adminProfile = () => ({
  username: ADMIN_USERNAME, role: 'admin',
  permissions: { reports: true, accounting: true }
});
