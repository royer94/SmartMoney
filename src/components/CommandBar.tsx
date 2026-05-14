import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Command as CommandIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseTransaction, generateVoiceReport } from '../lib/gemini';
import { Transaction, UserProfile, COMMANDS, FREE_LIMIT } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { FINANCE_TIPS } from '../lib/tips';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  transaction?: any;
}

export function CommandBar({ user, addTransaction, transactions, addGoal, autoStartRecording }: { user: UserProfile, addTransaction: any, transactions: Transaction[], addGoal: any, autoStartRecording?: boolean }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const silenceTimer = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (autoStartRecording) {
      // Delay slightly to ensure browser allows audio context if it was a user interaction that triggered this
      const timer = setTimeout(() => {
        startRecording();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoStartRecording]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (silenceTimer.current) cancelAnimationFrame(silenceTimer.current);
      if (audioContext.current) audioContext.current.close().catch(() => {});
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const addMessage = (role: 'user' | 'ai', text: string, transaction?: any) => {
    setMessages(prev => [...prev, { id: Math.random().toString(), role, text, transaction }]);
  };

  const handleCommand = async (cmd: string) => {
    const cleanCmd = cmd.toLowerCase().trim();
    
    if (cleanCmd.startsWith('/')) {
      const parts = cleanCmd.split(' ');
      const action = parts[0];
      const now = new Date();

      switch (action) {
        case '/hoy': {
          const hoy = transactions.filter(t => {
            const d = t.timestamp.toDate();
            return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
          });
          const totalHoy = hoy.reduce((acc, t) => acc + (t.type === 'expense' ? t.amount : 0), 0);
          addMessage('ai', `Hoy has gastado ${formatCurrency(totalHoy)} en ${hoy.length} movimientos.`);
          break;
        }

        case '/semana': {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          const semana = transactions.filter(t => t.timestamp.toDate() >= weekAgo);
          const exp = semana.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
          addMessage('ai', `En los últimos 7 días has gastado ${formatCurrency(exp)}.`);
          break;
        }

        case '/mes': {
          const mes = transactions.filter(t => t.timestamp.toDate().getMonth() === now.getMonth());
          const exp = mes.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
          addMessage('ai', `Este mes llevas gastados ${formatCurrency(exp)}.`);
          break;
        }

        case '/balance': {
          if (!user.isPro) {
            addMessage('ai', "El comando /balance es una función Pro. Pásate a Pro para ver tu balance detallado.");
            break;
          }
          const exp = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
          const inc = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
          addMessage('ai', `Balance General:\nTotal Ingresos: ${formatCurrency(inc)}\nTotal Gastos: ${formatCurrency(exp)}\nNeto: ${formatCurrency(inc - exp)}`);
          break;
        }

        case '/top': {
          const top = [...transactions]
            .filter(t => t.type === 'expense')
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
          addMessage('ai', `Tus mayores gastos:\n${top.map(t => `- ${t.description}: ${formatCurrency(t.amount)}`).join('\n')}`);
          break;
        }

        case '/meta': {
          if (!user.isPro) {
            addMessage('ai', "El comando /meta es una función Pro. Pásate a Pro para establecer presupuestos y metas financieras.");
            break;
          }
          if (parts.length < 3) {
            addMessage('ai', "Uso correcto: /meta [nombre] [monto]. Ej: /meta Carro 50000000");
          } else {
            const amount = parseFloat(parts[parts.length - 1]);
            const name = parts.slice(1, -1).join(' ');
            if (isNaN(amount)) {
                addMessage('ai', "Monto inválido. Ej: /meta Carro 50000000");
                break;
            }
            addMessage('ai', `¿Confirmas crear la meta "${name}" por ${formatCurrency(amount)}?`, {
              isGoal: true,
              name,
              targetAmount: amount,
              currentAmount: 0
            });
          }
          break;
        }
          
        case '/pro':
          addMessage('ai', `SmartMone¥ Pro desbloquea el simulador de libertad financiera, presupuestos ilimitados, reportes PDF y CSV detallados, y elimina el límite de 20 registros mensuales.`);
          break;

        case '/ayuda':
          addMessage('ai', `Comandos disponibles:\n${COMMANDS.filter(c => c.name !== 'pro').map(c => `${c.usage}: ${c.description}`).join('\n')}\nNota: El plan gratuito está limitado a 20 registros por mes.`);
          break;

        case '/start':
          addMessage('ai', `¡Hola ${user.email.split('@')[0]}! Soy tu asistente financiero. Puedes registrar gastos e ingresos diciendo "Recibí 100 mil de salario" o "Gasté 50 mil en almuerzo". El plan gratuito permite hasta 20 registros mensuales.`);
          break;

        case '/libertad':
          addMessage('ai', "He habilitado el Simulador de Libertad Financiera en tu Dashboard. Puedes acceder desde la pestaña superior.");
          break;

        case '/suscripciones': {
          const recurring = transactions.filter(t => t.isRecurring);
          const total = recurring.reduce((acc, t) => acc + t.amount, 0);
          if (recurring.length === 0) {
            addMessage('ai', "No tienes suscripciones activas marcadas. Ve a tu lista de movimientos y marca tus gastos fijos (como Spotify o Gym) como recurrentes.");
          } else {
            addMessage('ai', `Tienes ${recurring.length} suscripciones que suman ${formatCurrency(total)}/mes.\n${recurring.map(r => `• ${r.description}: ${formatCurrency(r.amount)}`).join('\n')}`);
          }
          break;
        }

        case '/ocultar':
          addMessage('ai', "Modo de privacidad activado. Ahora los montos sensibles están ofuscados en la interfaz principal.");
          break;

        default:
          addMessage('ai', `Comando no reconocido. Escribe /ayuda para ver la lista.`);
      }
      return true;
    }
    return false;
  };

  const processInput = async (text: string) => {
    if (!text.trim()) return;
    
    addMessage('user', text);
    setInput('');
    
    const wasCommand = await handleCommand(text);
    if (wasCommand) return;

    setIsLoading(true);
    try {
      const result = await parseTransaction(text);
      if (result.amount > 0) {
        addMessage('ai', `Detecté un ${result.type === 'expense' ? 'gasto' : 'ingreso'} de ${formatCurrency(result.amount)} en ${result.category}. ¿Deseas registrarlo?`, result);
      } else {
        addMessage('ai', "No pude entender el monto o la descripción. Prueba con algo como: 'Gasté 20000 en transporte'.");
      }
    } catch (error) {
      addMessage('ai', "Hubo un error procesando tu solicitud.");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmTransaction = async (msgId: string, tx: any) => {
    try {
      setIsLoading(true);
      const result = await addTransaction(tx);
      setMessages(prev => prev.map(m => 
        m.id === msgId ? { ...m, transaction: null, text: m.text + " (Registrado ✅)" } : m
      ));
      
      if (result?.alerts && result.alerts.length > 0) {
        result.alerts.forEach(alert => {
            addMessage('ai', alert);
        });
      }

      // Tip logic: Show tip every 3 registrations
      const newCount = (parseInt(sessionStorage.getItem('reg_count') || '0')) + 1;
      sessionStorage.setItem('reg_count', newCount.toString());
      
      if (newCount % 3 === 0) {
        const randomTip = FINANCE_TIPS[Math.floor(Math.random() * FINANCE_TIPS.length)];
        setTimeout(() => {
          addMessage('ai', `💡 Tip $martMone¥: ${randomTip}`);
        }, 1000);
      }
    } catch (error: any) {
      addMessage('ai', `❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    setIsRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          channelCount: 1,
          sampleRate: 48000,
        } 
      });
      streamRef.current = stream;
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        if (audioBlob.size === 0) {
          setIsLoading(false);
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          addMessage('user', '🎤 Registro de voz enviado');
          setIsLoading(true);
          try {
            const result = await parseTransaction({ mimeType: 'audio/webm', data: base64Audio });
            addMessage('ai', `Detecté por voz: ${result.type === 'expense' ? 'gasto' : 'ingreso'} de ${formatCurrency(result.amount)} en ${result.category}.`, result);
          } catch (error) {
            addMessage('ai', "No pude procesar el audio correctamente.");
          } finally {
            setIsLoading(false);
          }
        };
        
        // Cleanup resources
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (audioContext.current) {
          audioContext.current.close().catch(() => {});
          audioContext.current = null;
        }
      };

      // Silence detection
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContext.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let lastSoundTime = Date.now();
      let hasHeardSpeech = false;
      let noiseFloor = 25; 
      const SILENCE_DURATION = 1000; 
      const SPEECH_ONSET_RATIO = 1.6; 
      const ABSOLUTE_MIN_SPEECH = 30; 
      const MIN_MAINTAIN_LEVEL = 25; 

      const checkSilence = () => {
        if (!mediaRecorder.current || mediaRecorder.current.state !== 'recording') return;
        
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Update noise floor slowly
        if (average < noiseFloor) {
          noiseFloor = noiseFloor * 0.99 + average * 0.01;
        }

        const isSpeech = average > ABSOLUTE_MIN_SPEECH && average > noiseFloor * SPEECH_ONSET_RATIO;
        const isMaintaining = average > MIN_MAINTAIN_LEVEL && average > noiseFloor * 1.2;

        if (isSpeech) {
          hasHeardSpeech = true;
          lastSoundTime = Date.now();
        } else if (isMaintaining) {
          lastSoundTime = Date.now();
        }

        if (hasHeardSpeech && Date.now() - lastSoundTime > SILENCE_DURATION) {
          stopRecording();
          return;
        }
        
        silenceTimer.current = requestAnimationFrame(checkSilence);
      };

      mediaRecorder.current.start();
      silenceTimer.current = requestAnimationFrame(checkSilence);
    } catch (err) {
      console.error("Mic error", err);
      setIsRecording(false);
      addMessage('ai', "No se pudo acceder al micrófono. Por favor, verifica los permisos.");
    }
  };

  const stopRecording = () => {
    if (silenceTimer.current) {
      cancelAnimationFrame(silenceTimer.current);
      silenceTimer.current = null;
    }
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] md:h-[calc(100vh-100px)]">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 p-4 scroll-smooth"
      >
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex flex-col max-w-[80%]",
                msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/20" 
                  : "bg-white text-slate-900 border border-slate-200 rounded-tl-none shadow-sm"
              )}>
                {msg.text}
              </div>
              
              {msg.transaction && (
                <div className="mt-2 flex gap-2">
                  <button 
                    onClick={async () => {
                        if (msg.transaction.isGoal) {
                            try {
                                await addGoal({
                                    name: msg.transaction.name,
                                    targetAmount: msg.transaction.targetAmount,
                                    currentAmount: 0,
                                    month: new Date().getMonth() + 1,
                                    year: new Date().getFullYear()
                                });
                                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, transaction: null, text: m.text + " (Meta creada ✅)" } : m));
                            } catch (e) {
                                addMessage('ai', "Error creando la meta.");
                            }
                        } else {
                            confirmTransaction(msg.id, msg.transaction);
                        }
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    Confirmar
                  </button>
                  <button 
                    onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                    className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Ignorar
                  </button>
                </div>
              )}
            </motion.div>
          ))}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mr-auto">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-100" />
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-200" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 glass rounded-3xl mt-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "p-3 rounded-2xl transition-all",
              isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <div className="flex-1 relative">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && processInput(input)}
              placeholder={isRecording ? "Grabando..." : "Escribe algo o usa /comandos..."}
              className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 transition-colors placeholder:text-slate-400"
            />
            <CommandIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          </div>
          <button 
            onClick={() => processInput(input)}
            disabled={!input.trim()}
            className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/30"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
