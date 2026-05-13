import React from 'react';
import { UserProfile } from '../types';
import { User, Shield, CheckCircle2, XCircle, Mail, Search, Flame } from 'lucide-react';
import { cn } from '../lib/utils';

interface AdminPanelProps {
  users: UserProfile[];
  onActivatePro: (userId: string, months: number) => void;
  onDeactivatePro: (userId: string) => void;
  onClose: () => void;
}

export function AdminPanel({ users, onActivatePro, onDeactivatePro, onClose }: AdminPanelProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDuration, setSelectedDuration] = React.useState<number>(1);

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const DURATIONS = [
    { label: '1 Mes', value: 1 },
    { label: '3 Meses', value: 3 },
    { label: '6 Meses', value: 6 },
    { label: '12 Meses', value: 12 },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-950/40 backdrop-blur-md">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Panel de Administración</h2>
              <p className="text-sm text-slate-500 font-medium">Gestionar usuarios y accesos Pro</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-200/50 rounded-2xl transition-colors text-slate-400"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 bg-white border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por email o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-[1.5rem] focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-medium text-slate-900"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-20">
              <User className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredUsers.map((user) => (
                <div 
                  key={user.uid}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-red-200 transition-all"
                >
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                      user.isPro ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"
                    )}>
                      {user.isPro ? <Flame className="w-6 h-6" /> : <User className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{user.email || 'Sin Email'}</p>
                        {user.isPro && (
                          <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
                            Pro
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 select-all">{user.uid}</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-3 self-end md:self-auto">
                    {!user.isPro && (
                      <div className="flex bg-white border border-slate-200 rounded-xl p-1">
                        {DURATIONS.map((d) => (
                          <button
                            key={d.value}
                            onClick={() => setSelectedDuration(d.value)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                              selectedDuration === d.value 
                                ? "bg-slate-900 text-white shadow-sm" 
                                : "text-slate-500 hover:text-slate-700"
                            )}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {user.isPro ? (
                      <button 
                        onClick={() => onDeactivatePro(user.uid)}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-black hover:bg-red-50 transition-all uppercase tracking-widest shadow-sm active:scale-95 whitespace-nowrap"
                      >
                        Quitar Pro
                      </button>
                    ) : (
                      <button 
                        onClick={() => onActivatePro(user.uid, selectedDuration)}
                        className="px-4 py-2 bg-white border border-emerald-200 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-50 transition-all uppercase tracking-widest shadow-sm active:scale-95 whitespace-nowrap"
                      >
                        Activar Pro
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Total de usuarios: {users.length} | Mostrando: {filteredUsers.length}
          </p>
        </div>
      </div>
    </div>
  );
}
