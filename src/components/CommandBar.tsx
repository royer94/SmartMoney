import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Command as CommandIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseTransaction } from '../lib/gemini';
import { Transaction, UserProfile, COMMANDS } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { FINANCE_TIPS } from '../lib/tips';

// ================= TYPES =================

type ParsedTransaction = {
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description?: string;
};

type GoalTransaction = {
  isGoal: true;
  name: string;
  targetAmount: number;
  currentAmount: number;
};

type MessageTransaction = ParsedTransaction | GoalTransaction;

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  transaction?: MessageTransaction | null;
}

interface Props {
  user: UserProfile;
  transactions: Transaction[];
  addTransaction: (tx: ParsedTransaction) => Promise<any>;
  addGoal: (goal: any) => Promise<void>;
  autoStartRecording?: boolean;
}

// ================= COMPONENT =================

export function CommandBar({ user, transactions, addTransaction, addGoal, autoStartRecording }: Props) {
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

  // ================= EFFECTS =================

  useEffect(() => {
    if (autoStartRecording) {
      const t = setTimeout(startRecording, 100);
      return () => clearTimeout(t);
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
      cleanupAudio();
    };
  }, []);

  // ================= HELPERS =================

  const addMessage = (role: Message['role'], text: string, transaction?: MessageTransaction) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role, text, transaction }]);
  };

  const cleanupAudio = async () => {
    if (audioContext.current) {
      await audioContext.current.close().catch(() => {});
      audioContext.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // ================= COMMANDS =================

  const isSameDay = (d: Date, now: Date) =>
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const isSameMonth = (d: Date, now: Date) =>
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const handleCommand = async (cmd: string) => {
    const clean = cmd.toLowerCase().trim();
    if (!clean.startsWith('/')) return false;

    const now = new Date();
    const [action, ...rest] = clean.split(' ');

    switch (action) {
      case '/hoy': {
        const today = transactions.filter(t => isSameDay(t.timestamp.toDate(), now));
        const total = today.reduce((a, t) => a + (t.type === 'expense' ? t.amount : 0), 0);
        addMessage('ai', `Hoy has gastado ${formatCurrency(total)}.`);
        break;
      }

      case '/mes': {
        const month = transactions.filter(t => isSameMonth(t.timestamp.toDate(), now));
        const total = month.reduce((a, t) => a + (t.type === 'expense' ? t.amount : 0), 0);
        addMessage('ai', `Este mes llevas ${formatCurrency(total)}.`);
        break;
      }

      case '/meta': {
        if (!user.isPro) {
          addMessage('ai', 'Función Pro requerida.');
          break;
        }

        const amount = parseFloat(rest.at(-1) || '');
        const name = rest.slice(0, -1).join(' ');

        if (!name || isNaN(amount)) {
          addMessage('ai', 'Uso: /meta nombre monto');
          break;
        }

        addMessage('ai', `¿Crear meta "${name}" por ${formatCurrency(amount)}?`, {
          isGoal: true,
          name,
          targetAmount: amount,
          currentAmount: 0
        });
        break;
      }

      case '/ayuda': {
        addMessage('ai', COMMANDS.map(c => `${c.usage}: ${c.description}`).join('\n'));
        break;
      }

      default:
        addMessage('ai', 'Comando no reconocido');
    }

    return true;
  };

  // ================= INPUT =================

  const processInput = async (text: string) => {
    if (!text.trim()) return;

    addMessage('user', text);
    setInput('');

    if (await handleCommand(text)) return;

    setIsLoading(true);
    try {
      const result = await parseTransaction(text);
      if (result.amount > 0) {
        addMessage('ai', `Detecté ${formatCurrency(result.amount)} en ${result.category}.`, result);
      } else {
        addMessage('ai', 'No entendí el monto.');
      }
    } catch {
      addMessage('ai', 'Error procesando.');
    } finally {
      setIsLoading(false);
    }
  };

  // ================= CONFIRM =================

  const handleConfirm = async (msg: Message) => {
    if (!msg.transaction) return;

    if ('isGoal' in msg.transaction) {
      await addGoal({
        ...msg.transaction,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      });

      updateMessage(msg.id, ' (Meta creada ✅)');
      return;
    }

    setIsLoading(true);
    try {
      await addTransaction(msg.transaction);
      updateMessage(msg.id, ' (Registrado ✅)');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMessage = (id: string, suffix: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, transaction: null, text: m.text + suffix } : m))
    );
  };

  // ================= AUDIO =================

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    mediaRecorder.current = recorder;
    audioChunks.current = [];

    recorder.ondataavailable = e => audioChunks.current.push(e.data);
    recorder.onstop = async () => {
      await cleanupAudio();
      addMessage('user', '🎤 Audio enviado');
    };

    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
  };

  // ================= UI =================

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div key={msg.id}>
              <div>{msg.text}</div>

              {msg.transaction && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleConfirm(msg)}>Confirmar</button>
                  <button onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}>Ignorar</button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex gap-2 p-4">
        <button onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? <MicOff /> : <Mic />}
        </button>

        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !isRecording && processInput(input)}
        />

        <button onClick={() => processInput(input)}>
          <Send />
        </button>
      </div>
    </div>
  );
}
