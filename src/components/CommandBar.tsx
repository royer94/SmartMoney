import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Command as CommandIcon, ArrowRight } from 'lucide-react';
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
  isSubscriptionCheck?: boolean;
}

export function CommandBar({ user, addTransaction, transactions, addGoal, autoStartRecording, onUpgrade }: { user: UserProfile, addTransaction: any, transactions: Transaction[], addGoal: any, autoStartRecording?: boolean, onUpgrade?: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRecordingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const silenceTimer = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Mensaje de ayuda amable reutilizable cuando el parser falla
  const sendFriendlyHelpMessage = () => {
    const userName = user.name || user.email.split('@')[0];
    addMessage(
      'ai',
      `Ups, ${userName}, no alcancé a capturar los detalles de tu movimiento. 📝 No te preocupes, para que pueda registrarlo correctamente, intenta incluir un **monto** y una **descripción clara**.

💡 Puedes guiarte con estos ejemplos:
• *"Gasté 45000 en transporte"*
• *"Ayer pagué 120000 de servicios públicos"*
• *"Recibí un ingreso de 350000 por una venta"*

¡Inténtalo de nuevo escribiendo o manteniendo presionado el micrófono azul! 🎙️`
    );
  };

  useEffect(() => {
    const userName = user.name || user.email.split('@')[0];
    const welcomeText = `¡Hola, ${userName}! 👋 Aquí puedes registrar tus gastos e ingresos de forma súper fácil y rápida.

💡 Puedes hacerlo de dos maneras:
1️⃣ Escribiendo directamente en el chat, por ejemplo: "Gasté 35000 en materia prima" o "Recibí 150000 de una venta".
2️⃣ ¡El modo rápido! Deja presionado el botón azul del micrófono para activar el dictado por voz y cuéntame qué compraste. Al soltarlo, procesaré tu transacción al instante.

¿Qué movimiento deseas guardar hoy? 📑`;

    setMessages([
      {
        id: 'welcome-msg',
        role: 'ai',
        text: welcomeText
      }
    ]);
  }, [user]);

  useEffect(() => {
    if (autoStartRecording) {
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

  const addMessage = (role: 'user' | 'ai', text: string, transaction?: any, isSubscriptionCheck?: boolean) => {
    setMessages(prev => [...prev, { id: Math.random().toString(), role, text, transaction, isSubscriptionCheck }]);
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
            addMessage('ai', "El comando /balance es una función Pro. Pásate a Pro para ver tu balance detallado.", { isUpgrade: true });
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
            addMessage('ai', "El comando /meta es una función Pro. Pásate a Pro para establecer presupuestos y metas financieras.", { isUpgrade: true });
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
              targetAmount: amount
            });
          }
          break;
        }
          
        case '/pro':
          addMessage('ai', `SmartMone¥ Pro desbloquea el simulador de libertad financiera, presupuestos ilimitados, reportes PDF y CSV detallados, y elimina el límite de 20 registros mensuales.`, { isUpgrade: true });
          break;

        case '/ayuda':
          addMessage('ai', `Comandos disponibles:\n${COMMANDS.filter(c => c.name !== 'pro').map(c => `${c.usage}: ${c.description}`).join('\n')}\nNota: El plan gratuito está limitado a 20 registros por mes.`);
          break;

        case '/start':
          addMessage('ai', `¡Hola ${user.name || user.email.split('@')[0]}! Soy tu asistente financiero. Puedes registrar gastos e ingresos diciendo "Recibí 100 mil de salario" o "Gasté 50 mil en almuerzo". El plan gratuito permite hasta 20 registros mensuales.`);
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
      if (result && result.amount > 0) {
        addMessage('ai', `Detecté un ${result.type === 'expense' ? 'gasto' : 'ingreso'} de ${formatCurrency(result.amount)} en ${result.category}. ¿Deseas registrarlo?`, result);
      } else {
        // Modificación: Llamamos al mensaje amable de ayuda en vez de la respuesta genérica
        sendFriendlyHelpMessage();
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
        m.id === msgId ? { ...m, transaction: null } : m
      ));

      addMessage('ai', `✅ ¡Listo! He registrado el movimiento: "${tx.description}" por ${formatCurrency(tx.amount)}.`);
      
      if (result?.alerts && result.alerts.length > 0) {
        result.alerts.forEach(alert => {
            addMessage('ai', alert);
        });
      }

      if (tx.type === 'expense' && tx.description) {
        const desc = tx.description.toLowerCase();
        const subscriptionKeywords = ['spotify', 'netflix', 'prime', 'disney', 'hbo', 'apple', 'youtube', 'gym', 'gimnasio', 'suscripcion', 'crunchyroll', 'canva', 'microsoft'];
        
        const isPotentialSub = subscriptionKeywords.some(keyword => desc.includes(keyword));
        
        if (isPotentialSub) {
          setTimeout(() => {
            addMessage(
              'ai', 
              `🔍 Noté que "${tx.description}" parece ser un servicio o suscripción periódica. ¿Quieres que lo marque como un gasto recurrente para rastrearlo automáticamente en tu Dashboard?`, 
              tx, 
              true
            );
          }, 800);
        }
      }

      const newCount = (parseInt(sessionStorage.getItem('reg_count') || '0')) + 1;
      sessionStorage.setItem('reg_count', newCount.toString());
      
      if (newCount % 3 === 0) {
        const randomTip = FINANCE_TIPS[Math.floor(Math.random() * FINANCE_TIPS.length)];
        setTimeout(() => {
          addMessage('ai', `💡 Tip $martMone¥: ${randomTip}`);
        }, 1200);
      }
    } catch (error: any) {
      addMessage('ai', `❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRecurring = async (msgId: string, tx: any) => {
    try {
      setIsLoading(true);
      const updatedTx = { ...tx, isRecurring: true };
      await addTransaction(updatedTx); 
      
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, transaction: null, isSubscriptionCheck: false } : m));
      addMessage('ai', `🌟 Perfecto. El gasto ha sido configurado como recurrente. Ahora aparecerá en tu sección de suscripciones activas del Dashboard.`);
    } catch (error: any) {
      addMessage('ai', `❌ No pude actualizar el estado de la suscripción: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    setIsRecording(true);
    isRecordingRef.current = true;
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

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/aac';

      mediaRecorder.current = new MediaRecorder(stream, { mimeType });
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
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
            const result = await parseTransaction({ mimeType, data: base64Audio });
            if (result && result.amount > 0) {
              addMessage('ai', `Detecté por voz: ${result.type === 'expense' ? 'gasto' : 'ingreso'} de ${formatCurrency(result.amount)} en ${result.category}. ¿Deseas registrarlo?`, result);
            } else {
              // Modificación: Mensaje amable de ayuda también para transcripciones de voz fallidas
              sendFriendlyHelpMessage();
            }
          } catch (error) {
            console.error("Gemini Error:", error);
            addMessage('ai', "No pude procesar el audio correctamente. Intenta escribiéndolo.");
          } finally {
            setIsLoading(false);
          }
        };
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (audioContext.current) {
          audioContext.current.close().catch(() => {});
          audioContext.current = null;
        }
      };

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
      isRecordingRef.current = false;
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
    isRecordingRef.current = false;
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
                "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line",
                msg.role === 'user' 
                  ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/20" 
                  : "bg-white text-slate-900 border border-slate-200 rounded-tl-none shadow-sm"
              )}>
                {msg.text}
              </div>
              
              {msg.transaction && (
                <div className="mt-2 flex gap-2">
                  {msg.transaction.isUpgrade ? (
                    <button 
                      onClick={onUpgrade}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                      Ver Planes Pro
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : msg.isSubscriptionCheck ? (
                    <>
                      <button 
                        onClick={() => handleMarkAsRecurring(msg.id, msg.transaction)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                      >
                        Sí, es suscripción 🔁
                      </button>
                      <button 
                        onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, transaction: null, isSubscriptionCheck: false } : m))}
                        className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
                      >
                        No, gasto único
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={async () => {
                            if (msg.transaction.isGoal) {
                                try {
                                    await addGoal({
                                        name: msg.transaction.name,
                                        targetAmount: msg.transaction.targetAmount,
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
                    </>
                  )}
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
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={() => { if (isRecordingRef.current) stopRecording(); }}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={stopRecording}
            className={cn(
              "p-3 rounded-2xl transition-all select-none touch-none",
              isRecording ? "bg-red-500 text-white animate-pulse scale-105" : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
            )}
            title="Mantén presionado para hablar"
          >
            {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <div className="flex-1 relative">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && processInput(input)}
              placeholder={isRecording ? "Escuchando..." : "Escribe algo o usa /comandos..."}
              className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 transition-colors placeholder:text-slate-400"
            />
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
