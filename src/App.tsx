import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useFinance } from './hooks/useFinance';
import { signInWithGoogle, auth, db } from './lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { CommandBar } from './components/CommandBar';

// Componentes pesados con exportación nombrada
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const TransactionList = lazy(() => import('./components/TransactionList').then(module => ({ default: module.TransactionList })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(module => ({ default: module.AdminPanel })));
const HelpModal = lazy(() => import('./components/HelpModal').then(module => ({ default: module.HelpModal })));
const SubscriptionModal = lazy(() => import('./components/SubscriptionModal').then(module => ({ default: module.SubscriptionModal })));
const Guide = lazy(() => import('./components/Guide').then(module => ({ default: module.Guide })));
const OnboardingModal = lazy(() => import('./components/OnboardingModal').then(module => ({ default: module.OnboardingModal })));

// Componentes ligeros
import { ProBanner } from './components/ProBanner';
import { SubscriptionNotifier } from './components/SubscriptionNotifier';
import { Logo } from './components/Logo';
import { LandingPage } from './components/LandingPage';
import { CurrencyProvider } from './context/CurrencyContext';
import { CurrencySelector } from './components/CurrencySelector';
import { InstallPWA } from './components/InstallPWA';
import { 
  Plus, Settings, LogOut, Home, List, 
  MessageSquare, DollarSign, Shield, HelpCircle,
  Mail, MessageCircle as WhatsAppIcon,
  Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { useSearchParams } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';

const LoaderFallback = () => (
  <div className="p-10 text-center flex justify-center">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function AuthenticatedApp() {
  const { user, loading: userLoading } = useUser();
  const { transactions, goals, loading: financeLoading, allUsers, addTransaction, updateTransaction, removeTransaction, activatePro, deactivatePro, addGoal, removeGoal, toggleRecurring, recalculateGoal } = useFinance();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'dash' | 'list' | 'chat' | 'settings'>('dash');
  const [dashboardSubTab, setDashboardSubTab] = useState<'overview' | 'liberty'>('overview');
  const [showHelp, setShowHelp] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [recordingRequested, setRecordingRequested] = useState(false);
  const [helpPulsed, setHelpPulsed] = useState(() => localStorage.getItem('help_pulsed') === 'true');
  const longPressTimer = useRef<any>(null);

  useEffect(() => {
    const refPayco = searchParams.get('ref_payco');
    if (refPayco) {
      searchParams.delete('ref_payco');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === 'dash') setDashboardSubTab('overview');
    setActiveTab(tab);
    setRecordingRequested(false);
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed handler:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleShowHelp = () => {
    setShowHelp(true);
    if (!helpPulsed) {
      setHelpPulsed(true);
      localStorage.setItem('help_pulsed', 'true');
    }
  };

  const handleUpdateProfile = async (updatedData: { name: string; birthDate: string }) => {
    if (!user || !user.uid) {
      console.error('❌ Usuario sin uid:', user);
      throw new Error('Usuario no autenticado');
    }

    try {
      console.log('📝 Guardando perfil para uid:', user.uid);
      const userRef = doc(db, 'users', user.uid);
      const dataToSave: any = {
        name: updatedData.name.trim(),
        updatedAt: new Date().toISOString()
      };
      if (updatedData.birthDate && updatedData.birthDate.trim() !== '') {
        dataToSave.birthdate = updatedData.birthDate;
      }

      await setDoc(userRef, dataToSave, { merge: true });
      console.log('✅ Firestore actualizado correctamente');

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: updatedData.name.trim() });
        console.log('✅ Auth profile actualizado');
      }
    } catch (error: any) {
      console.error('🔥 Error al guardar perfil:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permiso denegado. Verifica las reglas de Firestore.');
      } else if (error.code === 'unavailable') {
        throw new Error('Firestore no está disponible. Revisa tu conexión a internet.');
      } else {
        throw new Error(`Error al guardar: ${error.message}`);
      }
    }
  };

  if (userLoading || financeLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0f1e]">
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          <img src="/SmartMoney_logo.webp" alt="SmartMone¥ AI" className="w-80 md:w-96 lg:w-[28rem] max-w-[85vw]" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLogin={handleLogin} isLoggingIn={isLoggingIn} />;
  }

  if (!user.onboardingDone) {
    return (
      <Suspense fallback={<LoaderFallback />}>
        <OnboardingModal
          userId={user.uid}
          email={user.email}
          onComplete={(name, birthdate) => {}}
        />
      </Suspense>
    );
  }

  const userAdapter = {
    ...user,
    birthDate: user.birthdate || ''
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pb-24 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass border-r border-slate-200 p-6 z-20">
        <div className="flex items-center justify-between mb-10">
          <Logo size="md" />
        </div>
        <nav className="flex-1 space-y-2">
          <NavItem active={activeTab === 'dash'} icon={Home} label="Dashboard" onClick={() => handleTabChange('dash')} />
          <NavItem active={activeTab === 'list'} icon={List} label="Movimientos" onClick={() => handleTabChange('list')} />
          <NavItem active={activeTab === 'chat'} icon={MessageSquare} label="AI Control" onClick={() => handleTabChange('chat')} />
          <NavItem active={activeTab === 'settings'} icon={Settings} label="Ajustes" onClick={() => handleTabChange('settings')} />
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={handleShowHelp}
              className={cn(
                "w-full flex items-center gap-3 p-3 text-blue-600 hover:bg-blue-50 transition-colors rounded-xl font-bold",
                !helpPulsed && "animate-pulse ring-2 ring-blue-400 ring-offset-2"
              )}
            >
              <HelpCircle className="w-5 h-5" />
              Guía y Ayuda
            </button>
          </div>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100">
          <button
            onClick={() => auth.signOut()}
            className="mt-6 w-full flex items-center gap-3 p-3 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors rounded-xl font-medium"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative outline-none selection:bg-blue-100">
        <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 flex items-center justify-between z-50 md:hidden transition-all duration-300">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShowHelp}
              className={cn(
                "p-3 text-blue-600 hover:bg-blue-50 active:scale-90 transition-all rounded-xl border border-blue-100 bg-blue-50/50",
                !helpPulsed && "animate-pulse ring-2 ring-blue-400 ring-offset-2"
              )}
              aria-label="Help"
            >
              <HelpCircle className="w-6 h-6" />
            </button>
            <button
              onClick={() => auth.signOut()}
              className="p-3 text-slate-500 hover:text-red-500 active:scale-90 transition-all rounded-xl border border-slate-200 bg-slate-100"
              aria-label="Sign out"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto p-4 md:p-10">
          <AnimatePresence mode="wait">
            {activeTab === 'dash' && (
              <Suspense fallback={<LoaderFallback />}>
                <Dashboard
                  key="dash"
                  user={userAdapter}
                  transactions={transactions}
                  goals={goals}
                  addTransaction={addTransaction}
                  addGoal={addGoal}
                  removeGoal={removeGoal}
                  toggleRecurring={toggleRecurring}
                  recalculateGoal={recalculateGoal}
                  onUpgrade={() => setShowSubscription(true)}
                  onUpdateProfile={handleUpdateProfile}
                  initialSubTab={dashboardSubTab}
                />
              </Suspense>
            )}
            {activeTab === 'list' && (
              <Suspense fallback={<LoaderFallback />}>
                <TransactionList key="list" transactions={transactions} onDelete={removeTransaction} onToggleRecurring={toggleRecurring} onUpdate={updateTransaction} />
              </Suspense>
            )}
            {activeTab === 'chat' && (
              <CommandBar
                key="chat"
                user={user}
                addTransaction={addTransaction}
                transactions={transactions}
                addGoal={addGoal}
                autoStartRecording={recordingRequested}
                onUpgrade={() => setShowSubscription(true)}
                onOpenLiberty={() => { setDashboardSubTab('liberty'); setActiveTab('dash'); }}
              />
            )}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-10 rounded-[2.5rem] space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Ajustes del Perfil</h2>
                  {user.isPro || user.isActive ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3 py-1.5 rounded-full shadow-md"
                    >
                      <Crown className="w-4 h-4 fill-amber-200" />
                      <span className="text-[10px] font-bold tracking-wide uppercase">Plan Pro</span>
                    </motion.div>
                  ) : user.isTrialActive ? (
                    <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">
                      Prueba Pro (30d)
                    </div>
                  ) : (
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                      "bg-slate-100 text-slate-500 border border-slate-200"
                    )}>
                      Plan Free
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Nombre</p>
                      <p className="font-semibold">{user.name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Email</p>
                      <p className="font-semibold">{user.email}</p>
                    </div>
                  </div>
                  {user.birthdate && (
                    <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Fecha de nacimiento</p>
                        <p className="font-semibold">{new Date(user.birthdate + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-1">Moneda</p>
                    <CurrencySelector userId={user.uid} />
                  </div>

                  {/* Contacto y soporte */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3 px-1">Contacto y Soporte</p>
                    <div className="flex flex-wrap gap-3">
                      <a href="mailto:contacto@smartmoneyai.click" className="group flex items-center gap-3 px-4 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-0.5">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">contacto@smartmoneyai.click</span>
                      </a>
                      <a href="https://wa.me/573209131046?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20SmartMoney%20AI" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-4 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-green-500/10 hover:border-green-500/30 transition-all duration-300 hover:-translate-y-0.5">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 group-hover:bg-green-500/20 flex items-center justify-center shrink-0">
                          <WhatsAppIcon className="w-4 h-4 text-green-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-green-600">Soporte WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  {user.isAdmin && (
                    <button onClick={() => setShowAdminPanel(true)} className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 hover:bg-red-100 transition-colors group">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5" />
                        <span className="font-bold">Panel de Administración</span>
                      </div>
                      <Plus className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                    </button>
                  )}

                  {user && !user.isActive && !user.isPro && (
                    <ProBanner user={user} onUpgrade={() => setShowSubscription(true)} />
                  )}
                </div>

                <div className="pt-6">
                  <button onClick={() => auth.signOut()} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 p-4 rounded-2xl w-full justify-center transition-colors border border-red-100">
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión Activa
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 flex justify-around md:hidden z-30 transition-colors">
        <MobileNavItem active={activeTab === 'dash'} icon={Home} onClick={() => handleTabChange('dash')} />
        <MobileNavItem active={activeTab === 'list'} icon={List} onClick={() => handleTabChange('list')} />
        <div className="relative -top-8">
          <button
            onClick={() => handleTabChange('chat')}
            onPointerDown={() => {
              longPressTimer.current = setTimeout(() => {
                setRecordingRequested(true);
                setActiveTab('chat');
              }, 600);
            }}
            onPointerUp={() => {
              if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
            }}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              "p-5 rounded-full shadow-2xl transition-all active:scale-95 select-none touch-none",
              activeTab === 'chat' ? "bg-blue-600 text-white scale-110 shadow-blue-500/40" : "bg-white text-slate-900 border border-slate-200"
            )}
          >
            <DollarSign className="w-8 h-8" />
          </button>
        </div>
        <MobileNavItem active={activeTab === 'chat'} icon={MessageSquare} onClick={() => handleTabChange('chat')} />
        <MobileNavItem active={activeTab === 'settings'} icon={Settings} onClick={() => handleTabChange('settings')} />
      </nav>

      <AnimatePresence>
        {showSubscription && (
          <Suspense fallback={null}>
            <SubscriptionModal onClose={() => setShowSubscription(false)} onUpgrade={(months) => activatePro(undefined, months)} />
          </Suspense>
        )}
        {showHelp && (
          <Suspense fallback={null}>
            <HelpModal onClose={() => setShowHelp(false)} />
          </Suspense>
        )}
        {showGuide && (
          <Suspense fallback={null}>
            <Guide onClose={() => setShowGuide(false)} />
          </Suspense>
        )}
        {showAdminPanel && user.isAdmin && (
          <Suspense fallback={null}>
            <AdminPanel users={allUsers} onActivatePro={activatePro} onDeactivatePro={deactivatePro} onClose={() => setShowAdminPanel(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      {user && <SubscriptionNotifier user={user} />}
      <InstallPWA />
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <CurrencyProvider>
        <AuthenticatedApp />
      </CurrencyProvider>
    </UserProvider>
  );
}

function NavItem({ active, icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all", active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "text-slate-600 hover:bg-slate-100")}>
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

function MobileNavItem({ active, icon: Icon, onClick }: any) {
  return (
    <button onClick={onClick} className={cn("p-2 transition-all", active ? "text-blue-600 scale-110" : "text-slate-400")}>
      <Icon className="w-6 h-6" />
    </button>
  );
}
