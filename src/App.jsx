import { normalizeProduct } from './utils/catalog';
import React, { useState, lazy, Suspense } from 'react';
import IntroScreen from './components/IntroScreen';
import LoginScreen from './components/LoginScreen';
const UserManagement = lazy(() => import('./components/UserManagement'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const AccountingManager = lazy(() => import('./components/AccountingManager'));
import NavButton from './components/ui/NavButton';
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const QuoteBuilder = lazy(() => import('./components/QuoteBuilder'));
const PDFPreview = lazy(() => import('./components/PDFPreview'));
const WorkOrderManager = lazy(() => import('./components/WorkOrderManager'));
const RemindersPanel = lazy(() => import('./components/RemindersPanel'));
import Toast from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isPosted } from './utils/business';
import { 
  Menu, Plus, Package, Cloud, CheckCircle, RefreshCw, X, HardDrive, Download, LogOut, Users, BarChart2, DollarSign, Briefcase, Shield, HardHat, Bell 
} from 'lucide-react';

// Motores Extraídos (Hooks)
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { useQuoteCart } from './hooks/useQuoteCart';

const InjectStyles = () => (
  <style>{`
    @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
    .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
    @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
    .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
    @keyframes slide-down { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }
    .animate-slide-down { animation: slide-down 0.3s ease-out forwards; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  `}</style>
);

const getLocalDateString = () => {
  const d = new Date();
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [view, setView] = useState('dashboard');
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const showToast = (message, type = 'info') => setToast({ show: true, message, type }); 
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showFolderPrompt, setShowFolderPrompt] = useState(false);

  // --- 1. Motor de Seguridad y Autenticación ---
  const auth = useAuth(showToast);
  
  // --- 2. Motor de Base de Datos y Caché Local ---
  const appData = useAppData(auth.currentUser);
  const logout = async () => { try { await appData.drain(); await auth.handleLogout(setView); } catch (e) { showToast(e.message, "error"); } };
  
  // --- 3. Motor del Carrito de Cotización y Ventas ---
  const cart = useQuoteCart(appData, setView, showToast);

  // --- Gestión de Inventario ---
  const handleUpdateProduct = (p) => { try { p = normalizeProduct(p, appData.inventory); appData.setInventory(prev => prev.map(pr => pr.id === p.id ? p : pr)); return true; } catch (e) { showToast(e.message, 'error'); return false; } };
  const handleAddProduct = p => { try { p = normalizeProduct(p, appData.inventory); appData.setInventory(prev => [...prev, { ...p, id: crypto.randomUUID() }]); return true; } catch (e) { showToast(e.message, 'error'); return false; } };
  const handleDeleteProduct = (id) => appData.setInventory(prev => prev.filter(p => p.id !== id));

  // --- Lógica de Exportación Segura ---
  const exportDataFallback = () => {
    const data = { clients: appData.clients, history: appData.history, inventory: appData.inventory, transactions: appData.transactions, pdfConfig: appData.pdfConfig, defaultConditions: appData.defaultConditions, workOrders: appData.workOrders, reminders: appData.reminders, currentQuote: appData.currentQuote, legacyLocalBackup: appData.legacyLocalBackup };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_CotiYA_GG_${getLocalDateString()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  
  const handleGrantFolderAccess = async () => {
    setShowFolderPrompt(false);
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const fileHandle = await handle.getFileHandle(`Backup_CotiYA_GG_${getLocalDateString()}.json`, { create: true });
      const writable = await fileHandle.createWritable();
      const data = { clients: appData.clients, history: appData.history, inventory: appData.inventory, transactions: appData.transactions, pdfConfig: appData.pdfConfig, defaultConditions: appData.defaultConditions, workOrders: appData.workOrders, reminders: appData.reminders, currentQuote: appData.currentQuote, legacyLocalBackup: appData.legacyLocalBackup };
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      showToast('Copia de seguridad guardada en tu PC', 'success');
    } catch (error) {
      if (error.name !== 'AbortError') {
         exportDataFallback();
         showToast('Guardado en la carpeta de Descargas por defecto.', 'info');
      }
    }
  };

  const exportData = () => {
    if (window.showDirectoryPicker) setShowFolderPrompt(true);
    else exportDataFallback();
  };

  // --- RENDERIZADO VISUAL CONDICIONAL ---
  if (showIntro) return <><InjectStyles /><IntroScreen onFinish={() => setShowIntro(false)} /></>;
  if (!auth.currentUser) return <div className="mobile-shell"><InjectStyles /><LoginScreen onLogin={async (username, password) => { await auth.handleLogin(username, password); setView("dashboard"); }} /></div>;

  if (!appData.isReady) return <div className="mobile-shell min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center justify-center gap-4 text-center"><p>{appData.cloudError || "Cargando los datos de tu cuenta…"}</p><button className="border border-slate-600 px-4 py-2 rounded-lg" onClick={() => window.location.reload()}>Volver a intentar</button><button className="text-slate-300 underline" onClick={() => auth.handleLogout(setView)}>Cerrar sesión</button></div>;

  return (
    <><InjectStyles />
    {showFolderPrompt && (
      <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full animate-slide-down">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <HardDrive className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Permiso de Almacenamiento Local</h3>
          <p className="text-gray-600 text-center mb-6 text-sm">Para mantener tus datos seguros y accesibles offline, necesitamos tu permiso para guardar la copia directamente en tu PC.</p>
          <div className="flex gap-3">
            <button onClick={() => { setShowFolderPrompt(false); exportDataFallback(); }} className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Descarga Normal</button>
            <button onClick={handleGrantFolderAccess} className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95">Elegir Carpeta</button>
          </div>
        </div>
      </div>
    )}

    <div className="mobile-shell min-h-screen bg-gray-50 print:bg-white font-sans text-gray-800 flex flex-col h-dvh print:h-auto overflow-hidden print:overflow-visible animate-fade-in print:block">
      <nav className="bg-slate-900 text-white px-3 py-2.5 md:p-3 shadow-lg flex-shrink-0 print:hidden z-50 relative">
        {appData.cloudError && <div className="bg-red-500 text-white text-[11px] text-center py-1 px-2 font-bold z-50 rounded mb-1.5">{appData.cloudError} <button className="underline mx-2" onClick={appData.retry}>Reintentar guardado</button><button className="underline" onClick={() => { exportDataFallback(); if (window.confirm("Se descargó una copia de tus datos. ¿Descartar los cambios pendientes y cargar la versión de la nube?")) { try { appData.discardPending(); } catch (e) { showToast(e.message, "error"); } } }}>Resolver con versión de la nube</button></div>}
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
          <div className="flex items-center gap-2.5 cursor-pointer min-w-0" onClick={() => setView('dashboard')}>
            <div className="bg-cyan-600 p-2 rounded-lg shrink-0"><Package className="h-5 w-5 md:h-6 md:w-6 text-white" /></div>
            <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold tracking-tight leading-none text-cyan-50 truncate">Coty Ya&reg;</h1>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] bg-green-900/50 px-1.5 py-0.5 rounded text-green-300 border border-green-700 flex items-center gap-1"><Cloud size={8} /> Firebase</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 truncate">
                        {appData.saveStatus === 'error' ? <span className="text-red-300">Error al guardar</span> : appData.saveStatus === 'offline' ? <span>Sin conexión; cambios locales</span> : appData.saveStatus === 'loading' ? <span>Cargando datos…</span> : appData.saveStatus === 'saved' ? (<span key="saved" className="flex items-center gap-1"><CheckCircle size={10} className="text-green-500" /> Sincronizado</span>) : (<span key="saving" className="flex items-center gap-1"><RefreshCw size={10} className="animate-spin text-yellow-500" /> Guardando...</span>)}
                    </span>
                </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button onClick={() => setIsDrawerOpen(true)} aria-label="Abrir menú" className="md:hidden text-slate-200 hover:text-white p-2 rounded-lg bg-slate-800"><Menu size={22} /></button>
            <div className="hidden md:flex gap-1 bg-slate-800 p-1 rounded-lg">
              <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Users size={16}/>}>Ventas</NavButton>
              {(auth.currentUser.role === 'admin' || auth.currentUser.permissions?.reports) && (<NavButton active={view === 'analytics'} onClick={() => setView('analytics')} icon={<BarChart2 size={16}/>}>Reportes</NavButton>)}
              {(auth.currentUser.role === 'admin' || auth.currentUser.permissions?.accounting) && (<NavButton active={view === 'accounting'} onClick={() => setView('accounting')} icon={<DollarSign size={16}/>}>Caja</NavButton>)}
              <NavButton active={view === 'work_orders'} onClick={() => setView('work_orders')} icon={<HardHat size={16}/>}>Obras</NavButton>
              <NavButton active={view === 'reminders'} onClick={() => setView('reminders')} icon={<Bell size={16}/>}>Alertas</NavButton>
              <NavButton active={view === 'creator'} onClick={cart.startNewQuote} icon={<Plus size={16}/>} highlight>Cotizar</NavButton>
              <NavButton active={view === 'inventory'} onClick={() => setView('inventory')} icon={<Briefcase size={16}/>}>Inventario</NavButton>
              {auth.currentUser.role === 'admin' && (<NavButton active={view === 'users'} onClick={() => setView('users')} icon={<Shield size={16}/>}>Usuarios</NavButton>)}
            </div>
            <button onClick={() => logout()} className="text-slate-400 hover:text-red-400 p-1.5 md:ml-1" title="Cerrar Sesión"><LogOut size={18} /></button>
          </div>
        </div>
      </nav>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-72 max-w-[85vw] bg-slate-900 h-full flex flex-col shadow-2xl animate-fade-in-up">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <span className="font-bold text-white text-lg flex items-center gap-2"><Package size={20} className="text-cyan-400"/> Menú Principal</span>
              <button onClick={() => setIsDrawerOpen(false)} aria-label="Cerrar menú" className="text-slate-400 hover:text-white p-1"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-3">
              <NavButton active={view === 'dashboard'} onClick={() => { setView('dashboard'); setIsDrawerOpen(false); }} icon={<Users size={18}/>}>Ventas</NavButton>
              {(auth.currentUser.role === 'admin' || auth.currentUser.permissions?.reports) && (<NavButton active={view === 'analytics'} onClick={() => { setView('analytics'); setIsDrawerOpen(false); }} icon={<BarChart2 size={18}/>}>Reportes</NavButton>)}
              {(auth.currentUser.role === 'admin' || auth.currentUser.permissions?.accounting) && (<NavButton active={view === 'accounting'} onClick={() => { setView('accounting'); setIsDrawerOpen(false); }} icon={<DollarSign size={18}/>}>Caja</NavButton>)}
              <NavButton active={view === 'work_orders'} onClick={() => { setView('work_orders'); setIsDrawerOpen(false); }} icon={<HardHat size={18}/>}>Obras</NavButton>
              <NavButton active={view === 'reminders'} onClick={() => { setView('reminders'); setIsDrawerOpen(false); }} icon={<Bell size={18}/>}>Alertas</NavButton>
              <NavButton active={view === 'creator'} onClick={() => { cart.startNewQuote(); setIsDrawerOpen(false); }} icon={<Plus size={18}/>} highlight>Cotizar</NavButton>
              <NavButton active={view === 'inventory'} onClick={() => { setView('inventory'); setIsDrawerOpen(false); }} icon={<Briefcase size={18}/>}>Inventario</NavButton>
              {auth.currentUser.role === 'admin' && (<NavButton active={view === 'users'} onClick={() => { setView('users'); setIsDrawerOpen(false); }} icon={<Shield size={18}/>}>Usuarios</NavButton>)}
            </div>
            <div className="p-4 border-t border-slate-700 bg-slate-800/50 space-y-2.5">
              <div>
                <span className="block text-xs text-slate-400">Usuario Activo:</span>
                <div className="font-bold text-white text-sm">{auth.currentUser.username} <span className="text-xs text-cyan-400 font-normal">[{auth.currentUser.role}]</span></div>
              </div>
              <button onClick={() => { exportData(); setIsDrawerOpen(false); }} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors border border-slate-700"><Download size={15}/> Copia de Seguridad Manual</button>
              <button onClick={() => { logout(); setIsDrawerOpen(false); }} className="w-full bg-slate-800 hover:bg-red-900 text-slate-300 hover:text-red-200 p-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors border border-slate-700"><LogOut size={15}/> Cerrar Sesión</button>
            </div>
          </div>
        </div>
      )}

      <main className={'view-' + view + ' flex-1 min-h-0 overflow-y-auto print:overflow-visible bg-gray-100 p-3 md:p-4 print:p-0 print:bg-white print:block'}>
        <div className="max-w-7xl mx-auto h-full print:h-auto print:block"><ErrorBoundary key={view} onReset={() => setView('dashboard')}><Suspense fallback={<p className="p-6">Cargando pantalla…</p>}>
            {view === 'dashboard' && <Dashboard history={appData.history} clients={appData.clients} onNew={cart.startNewQuote} onLoad={(q) => { appData.setCurrentQuote(q); setView(isPosted(q) ? 'preview' : 'creator'); }} onDuplicate={cart.duplicateQuote} onStatusChange={cart.changeQuoteStatus} onDelete={cart.deleteQuote} onUpdateQuote={cart.updateQuoteDetails} />}
            {view === 'analytics' && <AnalyticsDashboard history={appData.history} transactions={appData.transactions} />}
            {view === 'accounting' && <AccountingManager transactions={appData.transactions} setTransactions={appData.setTransactions} />}
            {view === 'reminders' && <RemindersPanel reminders={appData.reminders} setReminders={appData.setReminders} />}
            {view === 'work_orders' && <WorkOrderManager workOrders={appData.workOrders} setWorkOrders={appData.setWorkOrders} reminders={appData.reminders} setReminders={appData.setReminders} pdfConfig={appData.pdfConfig} showToast={showToast} />}
            {view === 'inventory' && <InventoryManager products={appData.inventory} onUpdate={handleUpdateProduct} onAdd={handleAddProduct} onDelete={handleDeleteProduct} />}
            {view === 'users' && <UserManagement users={auth.users} currentUser={auth.currentUser} />}
            {view === 'creator' && (
            <QuoteBuilder 
                quote={appData.currentQuote} setQuote={appData.setCurrentQuote} products={appData.inventory} clients={appData.clients} 
                onAddItem={cart.addItemToSection} onUpdateItem={cart.updateItemInSection} onRemoveItem={cart.removeItemFromSection} 
                onAddSection={cart.addSection} onToggleSection={cart.toggleSectionVisibility} onUpdateSectionName={cart.updateSectionName} 
                onRemoveSection={cart.removeSection} onClear={cart.clearAllItems} onClientSelect={cart.handleClientSelect} onPreview={() => setView('preview')} 
            />
            )}
            {view === 'preview' && <PDFPreview onDuplicate={cart.duplicateQuote} quote={appData.currentQuote} setQuote={appData.setCurrentQuote} onBack={() => setView(isPosted(appData.currentQuote) ? 'dashboard' : 'creator')} onSave={cart.saveAndRegister} pdfConfig={appData.pdfConfig} setPdfConfig={appData.setPdfConfig} setDefaultConditions={appData.setDefaultConditions} />}
        </Suspense></ErrorBoundary></div>
      </main>
      <Toast message={toast.show ? toast.message : null} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

      <div className="md:hidden bg-white border-t border-slate-200 grid grid-cols-5 shrink-0 mobile-bottom print:hidden z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" role="navigation" aria-label="Navegación móvil">
        <button onClick={() => setView('dashboard')} className={`py-2 px-1 flex flex-col items-center justify-center gap-0.5 text-[11px] ${view === 'dashboard' ? 'text-cyan-700 font-bold' : 'text-slate-600'}`}>
          <Users size={19} />
          <span>Ventas</span>
        </button>
        <button onClick={cart.startNewQuote} className={`py-2 px-1 flex flex-col items-center justify-center gap-0.5 text-[11px] ${view === 'creator' ? 'text-blue-700 font-bold' : 'text-blue-600 font-semibold'}`}>
          <Plus size={20} strokeWidth={2.5} />
          <span>Cotizar</span>
        </button>
        <button onClick={() => setView('work_orders')} className={`py-2 px-1 flex flex-col items-center justify-center gap-0.5 text-[11px] ${view === 'work_orders' ? 'text-cyan-700 font-bold' : 'text-slate-600'}`}>
          <HardHat size={19} />
          <span>Obras</span>
        </button>
        <button onClick={() => setView('inventory')} className={`py-2 px-1 flex flex-col items-center justify-center gap-0.5 text-[11px] ${view === 'inventory' ? 'text-cyan-700 font-bold' : 'text-slate-600'}`}>
          <Briefcase size={19} />
          <span>Inventario</span>
        </button>
        <button onClick={() => setIsDrawerOpen(true)} className="py-2 px-1 flex flex-col items-center justify-center gap-0.5 text-[11px] text-slate-600">
          <Menu size={19} />
          <span>Más</span>
        </button>
      </div>

      <div className="hidden md:flex bg-white border-t p-2 text-xs text-gray-500 justify-between items-center print:hidden">
          <span>Usuario: <b>{auth.currentUser.username}</b> [{auth.currentUser.role}]</span>
          <button onClick={exportData} className="flex items-center gap-1 hover:text-blue-600 transition-colors"><Download size={12} /> Copia de Seguridad Manual</button>
      </div>
    </div>
    </>
  );
}
