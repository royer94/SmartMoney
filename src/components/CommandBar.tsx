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
  isConfirmed?: boolean;
}

// ==================== NLP HELPERS AVANZADOS ====================

const MONEY_SLANG: Record<string, { keywords: string[]; multiplier: number }[]> = {
  COL: [
    { keywords: ['lucas', 'luka'], multiplier: 1000 },
    { keywords: ['palos', 'palo', 'millón', 'millon', 'melón'], multiplier: 1000000 },
    { keywords: ['mil'], multiplier: 1000 },
    { keywords: ['barra', 'barras'], multiplier: 1000000 }
  ],
  MX: [
    { keywords: ['varos', 'varo', 'pesos'], multiplier: 1 },
    { keywords: ['kilos', 'kilo'], multiplier: 1000 },
    { keywords: ['millón', 'millon'], multiplier: 1000000 }
  ],
  AR: [
    { keywords: ['lucas', 'luka', 'guita'], multiplier: 1000 },
    { keywords: ['palos', 'palo', 'millón', 'millon'], multiplier: 1000000 },
    { keywords: ['mil'], multiplier: 1000 }
  ],
  CL: [
    { keywords: ['lucas', 'luka'], multiplier: 1000 },
    { keywords: ['palos', 'palo', 'millón', 'millon'], multiplier: 1000000 },
    { keywords: ['mil'], multiplier: 1000 }
  ],
  PE: [
    { keywords: ['lucas', 'luka'], multiplier: 1000 },
    { keywords: ['palos', 'palo', 'millón', 'millon'], multiplier: 1000000 },
    { keywords: ['mil'], multiplier: 1000 }
  ],
  ES: [
    { keywords: ['pavos', 'pavo', 'euros'], multiplier: 1 },
    { keywords: ['kilos', 'kilo'], multiplier: 1000 },
    { keywords: ['millón', 'millon'], multiplier: 1000000 },
    { keywords: ['mil'], multiplier: 1000 }
  ]
};

const normalizeForNlp = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿¡]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const palabrasANumero = (text: string): number | null => {
  const normalized = normalizeForNlp(text);
  const palabras = normalized.split(/\s+/);
  const numeros: Record<string, number> = {
    'cero': 0, 'un': 1, 'uno': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4,
    'cinco': 5, 'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
    'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
    'dieciseis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19,
    'veinte': 20, 'treinta': 30, 'cuarenta': 40, 'cincuenta': 50,
    'sesenta': 60, 'setenta': 70, 'ochenta': 80, 'noventa': 90,
    'cien': 100, 'cientos': 100, 'quinientos': 500, 'quinientas': 500,
    'setecientos': 700, 'ochocientos': 800, 'novecientos': 900,
    'mil': 1000, 'millón': 1000000, 'millones': 1000000
  };
  let total = 0;
  let current = 0;
  for (let i = 0; i < palabras.length; i++) {
    const w = palabras[i];
    if (numeros[w] !== undefined) {
      if (w === 'mil' || w === 'millón' || w === 'millones') {
        total += (current || 1) * numeros[w];
        current = 0;
      } else {
        current += numeros[w];
      }
    } else if (w === 'y' && i+1 < palabras.length && numeros[palabras[i+1]] && current >= 30) {
      const next = numeros[palabras[i+1]];
      if (next && next < 10) current += next;
      i++;
    } else if (current > 0 && (w === 'mil' || w === 'millones')) {
      total += current * numeros[w];
      current = 0;
    }
  }
  total += current;
  return total > 0 ? total : null;
};

const parseMoneyValue = (text: string): number | null => {
  const normalized = normalizeForNlp(text);
  if (normalized.includes('medio millon') || normalized.includes('medio millón')) return 500000;
  if (normalized.includes('cuarto de millon') || normalized.includes('cuarto de millón')) return 250000;
  for (const region of Object.values(MONEY_SLANG)) {
    for (const slang of region) {
      for (const keyword of slang.keywords) {
        const regex = new RegExp(`(\\d+(?:[\\.,]\\d+)?)\\s*${keyword}`, 'i');
        const match = normalized.match(regex);
        if (match) {
          let amount = parseFloat(match[1].replace(',', '.'));
          if (isNaN(amount)) continue;
          return amount * slang.multiplier;
        }
      }
    }
  }
  const kMatch = normalized.match(/(\d+(?:[\\.,]\\d+)?)\s*k\b/i);
  if (kMatch) {
    let amount = parseFloat(kMatch[1].replace(',', '.'));
    if (!isNaN(amount)) return amount * 1000;
  }
  const mMatch = normalized.match(/(\d+(?:[\\.,]\\d+)?)\s*m\b/i);
  if (mMatch) {
    let amount = parseFloat(mMatch[1].replace(',', '.'));
    if (!isNaN(amount)) return amount * 1000000;
  }
  const numMatch = normalized.match(/\b(\d{1,3}(?:[\\.,]\d{3})*(?:[\\.,]\d+)?|\d+)\b/);
  if (numMatch) {
    let amount = parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(amount) && amount > 0) return amount;
  }
  return null;
};

const extractAmount = (text: string): number | null => {
  const normalized = normalizeForNlp(text);
  const slangMatch = normalized.match(/(\d+(?:[\\.,]\d+)?)\s*(lucas|palos|varos|pavos|guita|kilos|euros|pesos)/i);
  if (slangMatch) {
    let amount = parseFloat(slangMatch[1].replace(',', '.'));
    if (!isNaN(amount)) {
      const word = slangMatch[2];
      if (word === 'palos') amount *= 1000000;
      else if (word === 'lucas' || word === 'guita') amount *= 1000;
      else if (word === 'kilos') amount *= 1000;
      return amount;
    }
  }
  const patterns = [
    /(?:gast[ée]|pag[ué]|compr[ée]|invert[ée]|perd[ée]|clavaron|fund[íi]|rompieron|ching[ué]|me\s+fui)\s+(?:de\s+)?(\d+(?:[\\.,]\d+)?)\s*(?:lucas|varos|pavos|kilos|palos|euros|pesos)?/i,
    /(?:recib[íi]|gan[ée]|cay[óo]|factur[ée]|vend[íi]|cobr[ée]|ingres[óo])\s+(?:de\s+)?(\d+(?:[\\.,]\d+)?)\s*(?:lucas|varos|pavos|kilos|palos|euros|pesos)?/i,
    /(\d+(?:[\\.,]\d+)?)\s*(?:lucas|varos|pavos|kilos|palos|euros|pesos)/i,
    /(?:me\s+)?(?:cay[óo]|lleg[óo])\s+(?:la\s+)?(?:n[óo]mina|plata)\s+(?:de\s+)?(\d+(?:[\\.,]\d+)?)/i,
    /(?:vend[íi]|factur[ée])\s+(?:una\s+)?(?:compu|carro|moto|casa)\s+(?:en\s+)?(\d+(?:[\\.,]\d+)?)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let amount = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(amount)) return amount;
    }
  }
  const palabrasNum = palabrasANumero(text);
  if (palabrasNum && palabrasNum > 0) return palabrasNum;
  return parseMoneyValue(text);
};

const EXPENSE_PHRASES = [
  'clavaron', 'fundí', 'rompieron', 'chingué', 'gasté', 'pagué', 'compré', 
  'perdí', 'se me fue', 'me fui', 'tiré', 'boté', 'regalé', 'pierdo',
  'me desplumé', 'me endeudé', 'me costó', 'invertí', 'boté la plata'
];

const INCOME_PHRASES = [
  'cayó', 'recibí', 'gané', 'facturé', 'vendí', 'cobré', 'ingresó',
  'me pagaron', 'me transfirieron', 'depositaron', 'abonaron', 'cayó la nomina',
  'cayó el salario', 'recibí mi pago', 'me liquidaron', 'me pagaron la chamba'
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Supermercado': [
    'mercado', 'supermercado', 'carulla', 'éxito', 'jumbo', 'd1', 'ara', 
    'mercar', 'tienda', 'abarrotes', 'despensa', 'cesta', 'víveres', 'super',
    'makro', 'alkosto', 'olimpica', 'la 14', 'metro', 'superama', 'soriana'
  ],
  'Comida': [
    'comida', 'almuerzo', 'cena', 'desayuno', 'restaurante', 'café', 'cafe',
    'corrientazo', 'empanada', 'pizza', 'hamburguesa', 'comida rápida',
    'delivery', 'domicilio', 'rappi', 'pedidosya', 'menú', 'parrilla', 'asado',
    'picada', 'fritos', 'perro caliente', 'taco', 'sushi', 'comida china'
  ],
  'Transporte': [
    'transporte', 'uber', 'taxi', 'bus', 'gasolina', 'carro', 'moto', 'peaje',
    'pasaje', 'mío', 'transmilenio', 'metro', 'combustible', 'parqueadero',
    'taller', 'repuesto', 'mantenimiento', 'indrive', 'didi', 'colectivo',
    'micro', 'bondi', 'camión', 'flete', 'mensajería'
  ],
  'Servicios': [
    'servicios', 'luz', 'agua', 'gas', 'internet', 'celular', 'plan', 'datos',
    'arriendo', 'renta', 'administración', 'administracion', 'colegio',
    'pensión', 'pension', 'universidad', 'electricidad', 'seguro', 'seguros',
    'agua potable', 'alcantarillado', 'aseo', 'telefonía', 'fibra óptica'
  ],
  'Suscripciones': [
    'netflix', 'spotify', 'youtube', 'amazon', 'prime', 'disney', 'hbo',
    'apple', 'gym', 'gimnasio', 'crunchyroll', 'canva', 'microsoft',
    'suscripcion', 'suscripción', 'monthly', 'mensualidad', 'premium',
    'deezer', 'tidal', 'paramount', 'star+', 'vix', 'claro video'
  ],
  'Entretenimiento': [
    'cine', 'cerveza', 'rumba', 'fiesta', 'salida', 'viaje', 'hotel',
    'paseo', 'juego', 'consola', 'playstation', 'steam', 'bar', 'club',
    'concierto', 'evento', 'regalo', 'regalos', 'tragos', 'licor', 'cerveza',
    'whisky', 'ron', 'tequila', 'discoteca', 'antros', 'videojuegos'
  ],
  'Salud': [
    'médico', 'doctor', 'droga', 'farmacia', 'medicamento', 'salud', 'eps',
    'medicina', 'dentista', 'odontologo', 'odontólogo', 'pastillas', 'jarabe',
    'clínica', 'clinica', 'hospital', 'cirugía', 'examen', 'laboratorio',
    'terapia', 'psicólogo', 'gimnasio', 'yoga', 'medicina prepagada'
  ],
  'Educación': [
    'curso', 'libro', 'cuaderno', 'platzi', 'udemy', 'clase', 'tutor',
    'papelería', 'papeleria', 'estudios', 'universidad', 'colegio', 'colegiatura',
    'matrícula', 'inscripción', 'diplomado', 'certificación', 'coursera'
  ],
  'Ropa': [
    'ropa', 'zapato', 'tenis', 'camisa', 'pantalón', 'pantalon', 'chaqueta',
    'vestido', 'tienda', 'centro comercial', 'moda', 'jeans', 'blusa',
    'suéter', 'bufanda', 'gorra', 'sombrero', 'cartera', 'bolso', 'accesorios'
  ],
  'Mascotas': [
    'perro', 'perros', 'gato', 'gatos', 'mascota', 'veterinaria', 
    'peluqueria canina', 'alimento para perro', 'croquetas', 'arena',
    'collar', 'correa', 'juguete para perro', 'baño de mascotas'
  ],
  'Otros': [
    'otros', 'varios', 'general', 'gasto', 'compra'
  ]
};

const parseLocalTransaction = (text: string) => {
  if (!text || typeof text !== 'string') return null;
  const originalText = text;
  const normalized = normalizeForNlp(text);
  let amount = extractAmount(originalText);
  if (!amount || amount <= 0) return null;
  let type: 'expense' | 'income' = 'expense';
  const hasExpenseKeyword = EXPENSE_PHRASES.some(phrase => normalized.includes(phrase.toLowerCase()));
  const hasIncomeKeyword = INCOME_PHRASES.some(phrase => normalized.includes(phrase.toLowerCase()));
  if (hasIncomeKeyword && !hasExpenseKeyword) type = 'income';
  else if (hasExpenseKeyword && !hasIncomeKeyword) type = 'expense';
  else if (hasIncomeKeyword && hasExpenseKeyword) {
    const incomeContext = normalized.match(/(recib[íi]|gan[ée]|factur[ée]|vend[íi]|cay[óo])/i);
    const expenseContext = normalized.match(/(gast[ée]|pag[ué]|compr[ée]|perd[ée])/i);
    if (incomeContext && !expenseContext) type = 'income';
    else if (expenseContext && !incomeContext) type = 'expense';
  }
  
  // --- PRIORIDAD ESPECIAL: Si hay palabra de supermercado, asignar directamente ---
  const supermercadoKeywords = CATEGORY_KEYWORDS['Supermercado'];
  const isSupermercado = supermercadoKeywords.some(keyword => normalized.includes(keyword));
  
  let category = 'Otros';
  let maxMatches = 0;
  
  if (isSupermercado) {
    category = 'Supermercado';
  } else {
    // Evaluar el resto de categorías (excluyendo Supermercado para no duplicar)
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (cat === 'Supermercado') continue;
      let matches = 0;
      for (const keyword of keywords) {
        if (normalized.includes(keyword)) matches++;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        category = cat;
      }
    }
  }
  
  // Ajustes para ingresos (sobrescribe categoría si es salario, ventas, etc.)
  if (type === 'income') {
    if (normalized.includes('salario') || normalized.includes('nomina') || normalized.includes('nómina') || normalized.includes('sueldo')) category = 'Salario';
    else if (normalized.includes('venta') || normalized.includes('vendí') || normalized.includes('vendió') || normalized.includes('facturé')) category = 'Ventas';
    else if (normalized.includes('comisión') || normalized.includes('honorarios')) category = 'Honorarios';
    else if (normalized.includes('transferencia') || normalized.includes('abono')) category = 'Transferencias';
  }
  
  let description = originalText;
  const wordsToRemove = [
    'gaste en', 'gasté en', 'pague', 'pagué', 'compre', 'compré', 
    'recibi', 'recibí', 'ingreso de', 'gasto de', 'de', 'en', 'por', 
    'un', 'una', 'unos', 'unas', 'ayer', 'hoy', 'el', 'la', 'los', 'las',
    'del', 'al', 'con', 'para', 'me', 'te', 'se', 'nos', 'les',
    'clavaron', 'fundí', 'rompieron', 'chingué', 'cayó', 'facturé',
    'fui', 'fuimos', 'estuvo', 'estuvimos'
  ];
  let cleanDesc = description;
  wordsToRemove.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleanDesc = cleanDesc.replace(regex, '');
  });
  cleanDesc = cleanDesc.replace(/\b\d+(?:[\.,]\d+)?\s*(lucas|varos|pavos|kilos|palos|euros|pesos)?\b/gi, '');
  cleanDesc = cleanDesc.replace(/[\$€£\¥\s,\.]/g, ' ');
  cleanDesc = cleanDesc.replace(/\s+/g, ' ').trim();
  if (!cleanDesc || cleanDesc.length < 2) {
    description = type === 'expense' ? `Gasto en ${category.toLowerCase()}` : `Ingreso por ${category.toLowerCase()}`;
  } else {
    description = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
    if (description.length > 60) description = description.substring(0, 57) + '...';
  }
  return { amount: Math.round(amount), description, type, category };
};

const sanitizeAndParseAIResponse = (result: any) => {
  if (!result) return null;
  let data = result;
  if (typeof result === 'string') {
    if (!result.trim().startsWith('{') && !result.trim().startsWith('[')) {
      return parseLocalTransaction(result);
    }
    try {
      const cleanJson = result.replace(/```json|```/g, '').trim();
      data = JSON.parse(cleanJson);
    } catch (e) {
      return parseLocalTransaction(result);
    }
  }
  if (typeof data === 'object' && data.data && data.mimeType) return null;
  const amount = parseFloat(data.amount || data.Monto || data.monto || data.Amount || 0);
  const description = data.description || data.Descripción || data.descripcion || data.concepto || data.Concepto || data.Description || '';
  let type = (data.type || data.tipo || data.Type || 'expense').toLowerCase();
  if (type === 'ingreso' || type === 'income') type = 'income';
  else if (type === 'gasto' || type === 'expense') type = 'expense';
  else type = 'expense';
  const category = data.category || data.categoría || data.categoria || data.Category || 'Otros';
  if (isNaN(amount) || amount <= 0) return parseLocalTransaction(JSON.stringify(data));
  return { amount, description, type, category };
};

export function CommandBar({ user, addTransaction, transactions, addGoal, autoStartRecording, onUpgrade }: { user: UserProfile, addTransaction: any, transactions: Transaction[], addGoal: any, autoStartRecording?: boolean, onUpgrade?: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = sessionStorage.getItem('smartmoney_chat_messages');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error("Error al cargar historial de chat:", e); }
    }
    return [];
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRecordingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const silenceTimer = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => { if (messages.length > 0) sessionStorage.setItem('smartmoney_chat_messages', JSON.stringify(messages)); }, [messages]);

  const sendFriendlyHelpMessage = () => {
    const userName = user.name || user.email.split('@')[0];
    addMessage('ai', `Ups, ${userName}, no alcancé a capturar los detalles de tu movimiento. 📝 No te preocupes, para que pueda registrarlo correctamente, intenta incluir un **monto** y una **descripción clara**.\n💡 Puedes guiarte con estos ejemplos:\n• *"Gasté 45000 en transporte"*\n• *"Ayer pagué 120000 de servicios públicos"*\n• *"Recibí un ingreso de 350000 por una venta"*\n• *"Me clavaron 30 lucas en mercado"*\n• *"Me cayó la nómina de 2 palos"*\n• *"Me chingué 500 varos en comida"*\n¡Inténtalo de nuevo escribiendo o manteniendo presionado el micrófono azul! 🎙️`);
  };

  useEffect(() => {
    if (messages.length > 0) return;
    const userName = user.name || user.email.split('@')[0];
    const welcomeText = `¡Hola, ${userName}! 👋 Aquí puedes registrar tus gastos e ingresos de forma súper fácil y rápida.\n💡 Puedes hacerlo de dos maneras:\n1️⃣ Escribiendo directamente en el chat, por ejemplo: "Gasté 35000 en materia prima" o "Recibí 150000 de una venta".\n2️⃣ ¡El modo rápido! Deja presionado el botón azul del micrófono para activar el dictado por voz y cuéntame qué compraste. Al soltarlo, procesaré tu transacción al instante.\n¿Qué movimiento deseas guardar hoy? 📑`;
    setMessages([{ id: 'welcome-msg', role: 'ai', text: welcomeText }]);
  }, [user]);

  useEffect(() => { if (autoStartRecording) { const timer = setTimeout(() => startRecording(), 100); return () => clearTimeout(timer); } }, [autoStartRecording]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  useEffect(() => { return () => { if (silenceTimer.current) cancelAnimationFrame(silenceTimer.current); if (audioContext.current) audioContext.current.close().catch(() => {}); if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()); }; }, []);

  const addMessage = (role: 'user' | 'ai', text: string, transaction?: any, isSubscriptionCheck?: boolean) => {
    setMessages(prev => [...prev, { id: Math.random().toString(), role, text, transaction, isSubscriptionCheck, isConfirmed: false }]);
  };

  const normalizeTransaction = (tx: any) => {
    if (!tx) return null;
    let description = '';
    if (typeof tx.description === 'string') description = tx.description;
    else if (tx.description && typeof tx.description === 'object') description = tx.description.descripcion || tx.description.concepto || tx.description.text || tx.description.message || '';
    if (typeof description !== 'string') description = '';
    description = description.replace(/[{}[\]"'\\]/g, '').trim().substring(0, 60);
    const category = typeof tx.category === 'string' ? tx.category : 'Otros';
    if (!description) description = tx.type === 'expense' ? `Gasto en ${category}` : `Ingreso por ${category}`;
    return { ...tx, description, amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0, type: tx.type === 'income' ? 'income' : 'expense', category };
  };

  const handleCommand = async (cmd: string) => {
    const cleanCmd = cmd.toLowerCase().trim();
    if (cleanCmd.startsWith('/')) {
      const parts = cleanCmd.split(' ');
      const action = parts[0];
      const now = new Date();
      switch (action) {
        case '/hoy': { const hoy = transactions.filter(t => { const d = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp); return d.getDate() === now.getDate() && d.getMonth() === now.getMonth(); }); const totalHoy = hoy.reduce((acc, t) => acc + (t.type === 'expense' ? t.amount : 0), 0); addMessage('ai', `Hoy has gastado ${formatCurrency(totalHoy)} en ${hoy.length} movimientos.`); break; }
        case '/semana': { const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7); const semana = transactions.filter(t => { const d = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp); return d >= weekAgo; }); const exp = semana.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0); addMessage('ai', `En los últimos 7 días has gastado ${formatCurrency(exp)}.`); break; }
        case '/mes': { const mes = transactions.filter(t => { const d = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp); return d.getMonth() === now.getMonth(); }); const exp = mes.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0); addMessage('ai', `Este mes llevas gastados ${formatCurrency(exp)}.`); break; }
        case '/balance': { if (!user.isPro) { addMessage('ai', "El comando /balance es una función Pro. Pásate a Pro para ver tu balance detallado.", { isUpgrade: true }); break; } const exp = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0); const inc = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0); addMessage('ai', `Balance General:\nTotal Ingresos: ${formatCurrency(inc)}\nTotal Gastos: ${formatCurrency(exp)}\nNeto: ${formatCurrency(inc - exp)}`); break; }
        case '/top': { const top = [...transactions].filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5); addMessage('ai', `Tus mayores gastos:\n${top.map(t => `- ${t.description}: ${formatCurrency(t.amount)}`).join('\n')}`); break; }
        case '/meta': { if (!user.isPro) { addMessage('ai', "El comando /meta es una función Pro. Pásate a Pro para establecer presupuestos y metas financieras.", { isUpgrade: true }); break; } if (parts.length < 3) { addMessage('ai', "Uso correcto: /meta [nombre] [monto]. Ej: /meta Carro 50000000"); } else { const amount = parseFloat(parts[parts.length - 1]); const name = parts.slice(1, -1).join(' '); if (isNaN(amount)) { addMessage('ai', "Monto inválido. Ej: /meta Carro 50000000"); break; } addMessage('ai', `¿Confirmas crear la meta "${name}" por ${formatCurrency(amount)}?`, { isGoal: true, name, targetAmount: amount }); } break; }
        case '/pro': addMessage('ai', `SmartMone¥ Pro desbloquea el simulador de libertad financiera, presupuestos ilimitados, reportes PDF y CSV detallados, y elimina el límite de 20 registros mensuales.`, { isUpgrade: true }); break;
        case '/ayuda': addMessage('ai', `Comandos disponibles:\n${COMMANDS.map(c => `${c.usage}: ${c.description}`).join('\n')}\nNota: El plan gratuito está limitado a 20 registros por mes.`); break;
        case '/start': addMessage('ai', `¡Hola ${user.name || user.email.split('@')[0]}! Soy tu asistente financiero. Puedes registrar gastos e ingresos diciendo "Recibí 100 mil de salario" o "Gasté 50 mil en almuerzo". El plan gratuito permite hasta 20 registros mensuales.`); break;
        case '/libertad': addMessage('ai', "He habilitado el Simulador de Libertad Financiera en tu Dashboard. Puedes acceder desde la pestaña superior."); break;
        case '/suscripciones': { const recurring = transactions.filter(t => t.isRecurring); const total = recurring.reduce((acc, t) => acc + t.amount, 0); if (recurring.length === 0) { addMessage('ai', "No tienes suscripciones activas marcadas. Ve a tu lista de movimientos y marca tus gastos fijos (como Spotify o Gym) como recurrentes."); } else { addMessage('ai', `Tienes ${recurring.length} suscripciones que suman ${formatCurrency(total)}/mes.\n${recurring.map(r => `• ${r.description}: ${formatCurrency(r.amount)}`).join('\n')}`); } break; }
        case '/ocultar': addMessage('ai', "Modo de privacidad activado. Ahora los montos sensibles están ofuscados en la interfaz principal."); break;
        default: addMessage('ai', `Comando no reconocido. Escribe /ayuda para ver la lista.`);
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
      let finalTx = null;
      const localResult = parseLocalTransaction(text);
      const isLocalConfident = localResult && localResult.amount > 0 && localResult.category !== 'Otros';
      if (isLocalConfident) {
        finalTx = localResult;
      } else {
        try {
          const rawResult = await parseTransaction(text);
          finalTx = sanitizeAndParseAIResponse(rawResult);
          if (!finalTx && localResult) finalTx = localResult;
        } catch (apiError) {
          finalTx = localResult;
        }
      }
      if (finalTx && finalTx.amount > 0) {
        const normalizedTx = normalizeTransaction(finalTx);
        addMessage('ai', `Detecté un ${normalizedTx!.type === 'expense' ? 'gasto' : 'ingreso'} de ${formatCurrency(normalizedTx!.amount)} en ${normalizedTx!.category}. ¿Deseas registrarlo?`, normalizedTx);
      } else {
        sendFriendlyHelpMessage();
      }
    } catch (error) {
      sendFriendlyHelpMessage();
    } finally {
      setIsLoading(false);
    }
  };

  const confirmTransaction = async (msgId: string, tx: any) => {
    try {
      setIsLoading(true);
      const normalizedTx = normalizeTransaction(tx);
      const result = await addTransaction(normalizedTx);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isConfirmed: true } : m));
      addMessage('ai', `✅ ¡Listo! He registrado el movimiento: "${normalizedTx.description}" por ${formatCurrency(normalizedTx.amount)}.`);
      if (result?.alerts?.length) result.alerts.forEach((alert: any) => addMessage('ai', alert));
      if (normalizedTx.type === 'expense' && normalizedTx.description) {
        const desc = normalizedTx.description.toLowerCase();
        const subKeywords = ['spotify', 'netflix', 'prime', 'disney', 'hbo', 'apple', 'youtube', 'gym', 'gimnasio', 'suscripcion', 'crunchyroll', 'canva', 'microsoft'];
        if (subKeywords.some(k => desc.includes(k))) {
          setTimeout(() => addMessage('ai', `🔍 Noté que "${normalizedTx.description}" parece ser un servicio o suscripción periódica. ¿Quieres que lo marque como recurrente?`, normalizedTx, true), 800);
        }
      }
      const newCount = (parseInt(sessionStorage.getItem('reg_count') || '0')) + 1;
      sessionStorage.setItem('reg_count', newCount.toString());
      if (newCount % 3 === 0) {
        const randomTip = FINANCE_TIPS[Math.floor(Math.random() * FINANCE_TIPS.length)];
        setTimeout(() => addMessage('ai', `💡 Tip $martMone¥: ${randomTip}`), 1200);
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
      const normalizedTx = normalizeTransaction(tx);
      const updatedTx = { ...normalizedTx, isRecurring: true };
      await addTransaction(updatedTx);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isConfirmed: true, isSubscriptionCheck: false } : m));
      addMessage('ai', `🌟 Perfecto. El gasto ha sido configurado como recurrente.`);
    } catch (error: any) {
      addMessage('ai', `❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    setIsRecording(true);
    isRecordingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 } });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/aac';
      mediaRecorder.current = new MediaRecorder(stream, { mimeType });
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
        if (audioBlob.size === 0) { setIsLoading(false); return; }
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          addMessage('user', '🎤 Procesando tu voz...');
          setIsLoading(true);
          try {
            const transcriptionResult = await parseTransaction({ mimeType, data: base64Audio });
            let transcribedText = '';
            if (typeof transcriptionResult === 'string') transcribedText = transcriptionResult;
            else if (transcriptionResult && typeof transcriptionResult === 'object') transcribedText = transcriptionResult.text || transcriptionResult.transcription || transcriptionResult.message || '';
            if (!transcribedText) throw new Error('No se obtuvo transcripción');
            let finalTx = null;
            const localResult = parseLocalTransaction(transcribedText);
            const isLocalConfident = localResult && localResult.amount > 0 && localResult.category !== 'Otros';
            if (isLocalConfident) finalTx = localResult;
            else {
              try {
                const geminiParseResult = await parseTransaction(transcribedText);
                finalTx = sanitizeAndParseAIResponse(geminiParseResult) || localResult;
              } catch (apiError) { finalTx = localResult; }
            }
            if (finalTx && finalTx.amount > 0) {
              const normalizedTx = normalizeTransaction(finalTx);
              addMessage('ai', `🎤 Por voz: Detecté un ${normalizedTx.type === 'expense' ? 'gasto' : 'ingreso'} de ${formatCurrency(normalizedTx.amount)} en ${normalizedTx.category}. ¿Deseas registrarlo?`, normalizedTx);
            } else {
              addMessage('ai', `No entendí bien lo que dijiste. Por ejemplo: "Gasté 20 mil en comida" o "Recibí 50 mil de un pago"`);
            }
          } catch (error) {
            sendFriendlyHelpMessage();
          } finally {
            setIsLoading(false);
          }
        };
        if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
        if (audioContext.current) { audioContext.current.close().catch(() => {}); audioContext.current = null; }
      };
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
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
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;
        if (average < noiseFloor) noiseFloor = noiseFloor * 0.99 + average * 0.01;
        const isSpeech = average > ABSOLUTE_MIN_SPEECH && average > noiseFloor * SPEECH_ONSET_RATIO;
        const isMaintaining = average > MIN_MAINTAIN_LEVEL && average > noiseFloor * 1.2;
        if (isSpeech) { hasHeardSpeech = true; lastSoundTime = Date.now(); }
        else if (isMaintaining) lastSoundTime = Date.now();
        if (hasHeardSpeech && Date.now() - lastSoundTime > SILENCE_DURATION) { stopRecording(); return; }
        silenceTimer.current = requestAnimationFrame(checkSilence);
      };
      mediaRecorder.current.start();
      silenceTimer.current = requestAnimationFrame(checkSilence);
    } catch (err) {
      setIsRecording(false);
      isRecordingRef.current = false;
      addMessage('ai', "No se pudo acceder al micrófono. Por favor, verifica los permisos.");
    }
  };

  const stopRecording = () => {
    if (silenceTimer.current) { cancelAnimationFrame(silenceTimer.current); silenceTimer.current = null; }
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') mediaRecorder.current.stop();
    setIsRecording(false);
    isRecordingRef.current = false;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] md:h-[calc(100vh-100px)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-4 scroll-smooth">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className={cn("flex flex-col max-w-[80%]", msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
              <div className={cn("p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line", msg.role === 'user' ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/20" : "bg-white text-slate-900 border border-slate-200 rounded-tl-none shadow-sm")}>
                {msg.text}
              </div>
              {msg.transaction && !msg.isConfirmed && (
                <div className="mt-2 flex gap-2">
                  {msg.transaction.isUpgrade ? (
                    <button onClick={onUpgrade} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2">Ver Planes Pro <ArrowRight className="w-3 h-3" /></button>
                  ) : msg.isSubscriptionCheck ? (
                    <>
                      <button onClick={() => handleMarkAsRecurring(msg.id, msg.transaction)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm">Sí, es suscripción 🔁</button>
                      <button onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isConfirmed: true, isSubscriptionCheck: false } : m))} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors">No, gasto único</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { if (msg.transaction.isGoal) { addGoal(msg.transaction.name, msg.transaction.targetAmount); setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isConfirmed: true, text: m.text + " (Meta creada ✅)" } : m)); } else { confirmTransaction(msg.id, msg.transaction); } }} className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-50">Confirmar</button>
                      <button onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors">Ignorar</button>
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
          <button onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={() => { if (isRecordingRef.current) stopRecording(); }} onTouchStart={(e) => { e.preventDefault(); startRecording(); }} onTouchEnd={stopRecording} className={cn("p-3 rounded-2xl transition-all select-none touch-none", isRecording ? "bg-red-500 text-white animate-pulse scale-105" : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20")} title="Mantén presionado para hablar">
            {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <div className="flex-1 relative">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && processInput(input)} placeholder={isRecording ? "Escuchando..." : "Escribe algo o usa /comandos..."} className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 transition-colors placeholder:text-slate-400" />
          </div>
          <button onClick={() => processInput(input)} disabled={!input.trim()} className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/30">
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
