import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from './hooks/useFinance';
import { signInWithGoogle, auth } from './lib/firebase';
import { CommandBar } from './components/CommandBar';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { ProBanner } from './components/ProBanner';
import { Guide } from './components/Guide';
import { PWAPrompt } from './components/PWAPrompt';
import { AdminPanel } from './components/AdminPanel';
import { SubscriptionNotifier } from './components/SubscriptionNotifier';
import { HelpModal } from './components/HelpModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { Logo } from './components/Logo';
import { 
  Plus, 
  Settings, 
  LogOut, 
  Home, 
  BarChart3, 
  List, 
  Search,
  MessageSquare,
  Mic,
  DollarSign,
  MessageCircle,
  Lightbulb,
  X,
  Target,
  Sun,
  Moon,
  Shield,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { FINANCE_TIPS } from './lib/tips';
import { FREE_LIMIT } from './types';

import { verifyEpaycoTransaction } from './services/paymentService';
import { useSearchParams } from 'react-router-dom';

export default function App() {
  const { user, transactions, goals, loading, allUsers, addTransaction, removeTransaction, activatePro, deactivatePro, addGoal, removeGoal, toggleRecurring, recalculateGoal } = useFinance();
  // Vincular usuario activo con OneSignal
useEffect(() => {
  if (user?.uid) {
    try {
      if ((window as any).OneSignalDeferred) {
        (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
          await OneSignal.login(user.uid);
          // Agregar email y plan como tags
          await OneSignal.User.addTags({
            email: user.email,
            plan: user.isPro ? 'pro' : 'free',
            uid: user.uid
          });
          console.log('[OneSignal] Usuario vinculado con tags:', user.uid);
        });
      }
    } catch (error) {
      console.error('[OneSignal] Error:', error);
    }
  }
}, [user?.uid]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'dash' | 'list' | 'chat' | 'settings'>('dash');
  const [showHelp, setShowHelp] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  
  // Handle ePayco Response
  useEffect(() => {
    const refPayco = searchParams.get('ref_payco');
    if (refPayco && user) {
      const verify = async () => {
        const data = await verifyEpaycoTransaction(refPayco);
        if (data && (data.x_response === 'Aceptada' || data.x_cod_response === 1)) {
          const months = parseInt(data.x_extra2) || 1;
          await activatePro(data.x_extra1, months);
          alert(`¡Pago exitoso! Tu plan Pro por ${months} ${months === 1 ? 'mes' : 'meses'} ha sido activado.`);
        }
        // Clean URL
        searchParams.delete('ref_payco');
        setSearchParams(searchParams);
      };
      verify();
    }
  }, [user, searchParams]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [recordingRequested, setRecordingRequested] = useState(false);
  const longPressTimer = useRef<any>(null);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setRecordingRequested(false);
  };

  const handleCentralButtonClick = () => {
    handleTabChange('chat');
  };

  useEffect(() => {
    if (user && user.freeRecordsCount === 0 && !localStorage.getItem('guide_shown')) {
      setShowGuide(true);
      localStorage.setItem('guide_shown', 'true');
    }
  }, [user]);

  const handleLogin = async () => {
    console.log("handleLogin triggered");
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed handler:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 transition-colors">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-4 text-slate-800"
        >
          <Logo size="lg" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)] animate-pulse" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass p-10 rounded-[2rem] text-center z-10 border-slate-700/50"
        >
          <div className="inline-flex mb-6">
            <Logo size="lg" />
          </div>
          <p className="text-slate-400 mb-10 leading-relaxed text-lg">
            Control integral de tus finanzas con el poder de la Inteligencia Artificial.
          </p>
          <button 
            type="button"
            onClick={(e) => {
              console.log("Button clicked!");
              handleLogin();
            }}
            disabled={isLoggingIn}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"
            style={{ cursor: 'pointer', zIndex: 9999, position: 'relative' }}
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="G" />
            )}
            {isLoggingIn ? "Cargando..." : "Ingresar con Google"}
          </button>
        </motion.div>
      </div>
    );
  }

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
              onClick={() => setShowHelp(true)}
              className="w-full flex items-center gap-3 p-3 text-blue-600 hover:bg-blue-50 transition-colors rounded-xl font-bold"
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
              onClick={() => setShowHelp(true)}
              className="p-3 text-blue-600 hover:bg-blue-50 active:scale-90 transition-all rounded-xl border border-blue-100 bg-blue-50/50"
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
              <Dashboard 
                key="dash" 
                user={user} 
                transactions={transactions} 
                goals={goals} 
                addGoal={addGoal} 
                removeGoal={removeGoal} 
                toggleRecurring={toggleRecurring}
                recalculateGoal={recalculateGoal}
                onUpgrade={() => setShowSubscription(true)}
              />
            )}
            {activeTab === 'list' && <TransactionList key="list" transactions={transactions} onDelete={removeTransaction} onToggleRecurring={toggleRecurring} />}
            {activeTab === 'chat' && (
              <CommandBar 
                key="chat" 
                user={user} 
                addTransaction={addTransaction} 
                transactions={transactions} 
                addGoal={addGoal} 
                autoStartRecording={recordingRequested} 
                onUpgrade={() => setShowSubscription(true)}
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
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                    user.isPro ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                  )}>
                    {user.isPro ? "Plan Pro" : "Plan Free"}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Email</p>
                      <p className="font-semibold">{user.email}</p>
                    </div>
                  </div>
                  
                  {user.isAdmin && (
                    <button 
                      onClick={() => setShowAdminPanel(true)}
                      className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 hover:bg-red-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5" />
                        <span className="font-bold">Panel de Administración</span>
                      </div>
                      <Plus className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                    </button>
                  )}
                  
                  <ProBanner user={user} />
                </div>

                <div className="pt-6">
                  <button 
                    onClick={() => auth.signOut()}
                    className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 p-4 rounded-2xl w-full justify-center transition-colors border border-red-100"
                  >
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
            onClick={handleCentralButtonClick}
            onPointerDown={() => {
              // Optional: still keep the long press for voice if desired, 
              // but don't let it interfere with the click
              longPressTimer.current = setTimeout(() => {
                setRecordingRequested(true);
                setActiveTab('chat');
              }, 600);
            }}
            onPointerUp={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
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
          <SubscriptionModal 
            onClose={() => setShowSubscription(false)} 
            onUpgrade={(months) => activatePro(undefined, months)} 
          />
        )}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        {showGuide && <Guide onClose={() => setShowGuide(false)} />}
        {showAdminPanel && user.isAdmin && (
          <AdminPanel 
            users={allUsers} 
            onActivatePro={activatePro} 
            onDeactivatePro={deactivatePro} 
            onClose={() => setShowAdminPanel(false)} 
          />
        )}
      </AnimatePresence>

      <PWAPrompt />
      {user && <SubscriptionNotifier user={user} />}
    </div>
  );
}

function NavItem({ active, icon: Icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all",
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

function MobileNavItem({ active, icon: Icon, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-2 transition-all",
        active ? "text-blue-600 scale-110" : "text-slate-400"
      )}
    >
      <Icon className="w-6 h-6" />
    </button>
  );
}

