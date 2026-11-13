export interface ParsedLocalTransaction {
  amount: number;
  description: string;
  type: 'expense' | 'income';
  category: string;
  timestamp?: string;
}

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

export const normalizeForNlp = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿¡]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseLocalizedNumber = (rawNum: string): number => {
  const cleaned = rawNum.trim();
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/[.,]/g, ''));
  }
  return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
};

export const palabrasANumero = (text: string): number | null => {
  const normalized = normalizeForNlp(text);
  const palabras = normalized.split(/\s+/);
  const numeros: Record<string, number> = {
    'cero': 0, 'un': 1, 'uno': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4,
    'cinco': 5, 'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
    'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
    'dieciseis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19,
    'veinte': 20, 'veintiun': 21, 'veintiuno': 21, 'veintiuna': 21,
    'veintidos': 22, 'veintitres': 23, 'veinticuatro': 24, 'veinticinco': 25,
    'veintiseis': 26, 'veintisiete': 27, 'veintiocho': 28, 'veintinueve': 29,
    'treinta': 30, 'cuarenta': 40, 'cincuenta': 50,
    'sesenta': 60, 'setenta': 70, 'ochenta': 80, 'noventa': 90,
    'cien': 100, 'ciento': 100, 'cientos': 100,
    'doscientos': 200, 'doscientas': 200, 'trescientos': 300, 'trescientas': 300,
    'cuatrocientos': 400, 'cuatrocientas': 400, 'quinientos': 500, 'quinientas': 500,
    'seiscientos': 600, 'seiscientas': 600, 'setecientos': 700, 'setecientas': 700,
    'ochocientos': 800, 'ochocientas': 800, 'novecientos': 900, 'novecientas': 900,
    'mil': 1000, 'millon': 1000000, 'millones': 1000000
  };
  let total = 0;
  let current = 0;
  let started = false;
  for (let i = 0; i < palabras.length; i++) {
    const w = palabras[i];
    if (numeros[w] !== undefined) {
      if ((w === 'un' || w === 'una') && !started) {
        const nextWord = palabras[i + 1];
        if (nextWord !== 'mil' && nextWord !== 'millon' && nextWord !== 'millones') {
          continue;
        }
      }
      started = true;
      if (w === 'mil' || w === 'millon' || w === 'millones') {
        total += (current || 1) * numeros[w];
        current = 0;
      } else {
        current += numeros[w];
      }
    } else if (started && w === 'y' && i + 1 < palabras.length && numeros[palabras[i + 1]] && current >= 30) {
      const next = numeros[palabras[i + 1]];
      if (next && next < 10) current += next;
      i++;
    } else if (started) {
      break;
    }
  }
  total += current;
  return total > 0 ? total : null;
};

const parseMoneyValue = (text: string): number | null => {
  const normalized = normalizeForNlp(text);
  if (normalized.includes('medio millon')) return 500000;
  if (normalized.includes('cuarto de millon')) return 250000;
  for (const region of Object.values(MONEY_SLANG)) {
    for (const slang of region) {
      for (const keyword of slang.keywords) {
        const regex = new RegExp(`(\\d+(?:[\\.,]\\d+)?)\\s*${keyword}`, 'i');
        const match = text.match(regex);
        if (match) {
          const amount = parseLocalizedNumber(match[1]);
          if (isNaN(amount)) continue;
          return amount * slang.multiplier;
        }
      }
    }
  }
  const kMatch = text.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    const amount = parseLocalizedNumber(kMatch[1]);
    if (!isNaN(amount)) return amount * 1000;
  }
  const mMatch = text.match(/(\d+(?:[.,]\d+)?)\s*m\b/i);
  if (mMatch) {
    const amount = parseLocalizedNumber(mMatch[1]);
    if (!isNaN(amount)) return amount * 1000000;
  }
  const numMatch = text.match(/\b(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\b/);
  if (numMatch) {
    const amount = parseLocalizedNumber(numMatch[1]);
    if (!isNaN(amount) && amount > 0) return amount;
  }
  return null;
};

const MONTHS_ES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

const DATE_PHRASE_REGEX = /\b(?:del|el)?\s*\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+\d{4})?\b/gi;

const stripDatePhrasesForAmount = (text: string): string =>
  text
    .replace(DATE_PHRASE_REGEX, ' ')
    .replace(/\bhace\s+\d+\s+d[ií]as?\b/gi, ' ')
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, ' ');

export const extractAmount = (text: string): number | null => {
  const cleanedForAmount = stripDatePhrasesForAmount(text);
  const slangMatch = cleanedForAmount.match(/(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(lucas|palos|varos|pavos|guita|kilos|euros|pesos)/i);
  if (slangMatch) {
    let amount = parseLocalizedNumber(slangMatch[1]);
    if (!isNaN(amount)) {
      const word = slangMatch[2].toLowerCase();
      if (word === 'palos') amount *= 1000000;
      else if (word === 'lucas' || word === 'guita' || word === 'kilos') amount *= 1000;
      return amount;
    }
  }
  const patterns = [
    /(?:gast[ée]|pag[ué]|compr[ée]|invert[ée]|perd[ée]|clavaron|fund[íi]|rompieron|ching[ué]|me\s+fui)\s+(?:de\s+)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(?:lucas|varos|pavos|kilos|palos|euros|pesos)?/i,
    /(?:recib[íi]|gan[ée]|cay[óo]|factur[ée]|vend[íi]|cobr[ée]|ingres[óo])\s+(?:de\s+)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(?:lucas|varos|pavos|kilos|palos|euros|pesos)?/i,
    /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(?:lucas|varos|pavos|kilos|palos|euros|pesos)/i,
    /(?:me\s+)?(?:cay[óo]|lleg[óo])\s+(?:la\s+)?(?:n[óo]mina|plata)\s+(?:de\s+)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)/i,
    /(?:vend[íi]|factur[ée])\s+(?:una\s+)?(?:compu|carro|moto|casa)\s+(?:en\s+)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)/i
  ];
  for (const pattern of patterns) {
    const match = cleanedForAmount.match(pattern);
    if (match) {
      const amount = parseLocalizedNumber(match[1]);
      if (!isNaN(amount)) return amount;
    }
  }
  const palabrasNum = palabrasANumero(cleanedForAmount);
  if (palabrasNum && palabrasNum > 0) return palabrasNum;
  return parseMoneyValue(cleanedForAmount);
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
    'makro', 'alkosto', 'olimpica', 'la 14', 'metro', 'superama', 'soriana',
    'pan'
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
    'concierto', 'evento', 'regalo', 'regalos', 'tragos', 'licor',
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

export const hasKeyword = (normalizedText: string, keyword: string): boolean => {
  const normKw = normalizeForNlp(keyword);
  if (!normKw) return false;
  const escaped = normKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, 'i').test(normalizedText);
};

export const isSupermercadoText = (text: string): boolean => {
  if (!text) return false;
  const normalized = normalizeForNlp(text);
  const supermercadoKeywords = CATEGORY_KEYWORDS['Supermercado'];
  return supermercadoKeywords.some(keyword => hasKeyword(normalized, keyword));
};

export const extractTransactionDate = (text: string, referenceNow: Date = new Date()): string | undefined => {
  if (!text) return undefined;
  const normalized = normalizeForNlp(text);
  const daysAgo = (days: number) => {
    const d = new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate() - days, 12, 0, 0);
    return d.toISOString();
  };

  if (/\b(antier|anteayer)\b/.test(normalized)) return daysAgo(2);
  if (/\bayer\b/.test(normalized)) return daysAgo(1);

  const haceNumMatch = normalized.match(/\bhace\s+(\d+)\s+dias?\b/);
  if (haceNumMatch) {
    const n = parseInt(haceNumMatch[1], 10);
    if (n > 0 && n <= 365) return daysAgo(n);
  }

  const wordDays: Record<string, number> = {
    un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
    seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  };
  const haceWordMatch = normalized.match(/\bhace\s+(un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+dias?\b/);
  if (haceWordMatch) return daysAgo(wordDays[haceWordMatch[1]]);

  const weekdays: Record<string, number> = {
    domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
  };
  const weekdayMatch = normalized.match(/\bel\s+(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/);
  if (weekdayMatch) {
    const targetDay = weekdays[weekdayMatch[1]];
    const diff = (referenceNow.getDay() - targetDay + 7) % 7 || 7;
    return daysAgo(diff);
  }

  const monthDateMatch = normalized.match(
    /\b(?:del|el)?\s*(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+(\d{4}))?\b/
  );
  if (monthDateMatch) {
    const day = parseInt(monthDateMatch[1], 10);
    const month = MONTHS_ES[monthDateMatch[2]];
    let year = monthDateMatch[3] ? parseInt(monthDateMatch[3], 10) : referenceNow.getFullYear();
    if (day >= 1 && day <= 31 && month !== undefined) {
      let candidate = new Date(year, month, day, 12, 0, 0);
      if (!monthDateMatch[3] && candidate > referenceNow) {
        year -= 1;
        candidate = new Date(year, month, day, 12, 0, 0);
      }
      if (!Number.isNaN(candidate.getTime()) && candidate.getMonth() === month) {
        return candidate.toISOString();
      }
    }
  }

  const slashDateMatch = normalized.match(/\b(\d{1,2})\s+(\d{1,2})(?:\s+(\d{2,4}))?\b/);
  if (slashDateMatch && /\b(?:del|el|fecha)\b/.test(normalized)) {
    const day = parseInt(slashDateMatch[1], 10);
    const month = parseInt(slashDateMatch[2], 10) - 1;
    let year = slashDateMatch[3] ? parseInt(slashDateMatch[3], 10) : referenceNow.getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      const candidate = new Date(year, month, day, 12, 0, 0);
      if (!Number.isNaN(candidate.getTime()) && candidate.getMonth() === month) {
        return candidate.toISOString();
      }
    }
  }

  return undefined;
};

export const formatShortDate = (isoDate?: string): string => {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

export const parseLocalTransaction = (text: string): ParsedLocalTransaction | null => {
  if (!text || typeof text !== 'string') return null;
  const originalText = text;
  const normalized = normalizeForNlp(text);
  const amount = extractAmount(originalText);
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

  const supermercadoKeywords = CATEGORY_KEYWORDS['Supermercado'];
  const isSupermercado = supermercadoKeywords.some(keyword => hasKeyword(normalized, keyword));

  let category = 'Otros';
  let maxMatches = 0;

  if (isSupermercado) {
    category = 'Supermercado';
  } else {
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (cat === 'Supermercado') continue;
      let matches = 0;
      for (const keyword of keywords) {
        if (hasKeyword(normalized, keyword)) matches++;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        category = cat;
      }
    }
  }

  if (type === 'income') {
    if (normalized.includes('salario') || normalized.includes('nomina') || normalized.includes('nómina') || normalized.includes('sueldo')) category = 'Salario';
    else if (normalized.includes('venta') || normalized.includes('vendí') || normalized.includes('vendió') || normalized.includes('facturé')) category = 'Ventas';
    else if (normalized.includes('comisión') || normalized.includes('honorarios')) category = 'Honorarios';
    else if (normalized.includes('transferencia') || normalized.includes('abono')) category = 'Transferencias';
  }

  let description = originalText;
  const wordsToRemove = [
    'gaste en', 'gasté en', 'gaste', 'gasté', 'pague', 'pagué', 'compre', 'compré',
    'recibi', 'recibí', 'ingreso de', 'gasto de', 'de', 'en', 'por',
    'un', 'una', 'unos', 'unas', 'ayer', 'hoy', 'el', 'la', 'los', 'las',
    'del', 'al', 'con', 'para', 'me', 'te', 'se', 'nos', 'les',
    'clavaron', 'fundí', 'rompieron', 'chingué', 'cayó', 'facturé',
    'fui', 'fuimos', 'estuvo', 'estuvimos'
  ];
  let cleanDesc = description.replace(DATE_PHRASE_REGEX, ' ');
  wordsToRemove.forEach(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, 'gi');
    cleanDesc = cleanDesc.replace(regex, ' ');
  });
  cleanDesc = cleanDesc.replace(/\b\d+(?:[.,]\d+)?\s*(lucas|varos|pavos|kilos|palos|euros|pesos)?\b/gi, '');
  cleanDesc = cleanDesc.replace(/[$€£¥\s,.]/g, ' ');
  cleanDesc = cleanDesc.replace(/\s+/g, ' ').trim();
  if (!cleanDesc || cleanDesc.length < 2) {
    description = type === 'expense' ? `Gasto en ${category.toLowerCase()}` : `Ingreso por ${category.toLowerCase()}`;
  } else {
    description = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
    if (description.length > 60) description = description.substring(0, 57) + '...';
  }
  const timestamp = extractTransactionDate(originalText);
  return { amount: Math.round(amount), description, type, category, ...(timestamp ? { timestamp } : {}) };
};

export const sanitizeAndParseAIResponse = (result: any) => {
  if (!result) return null;
  let data = result;
  if (typeof result === 'string') {
    if (!result.trim().startsWith('{') && !result.trim().startsWith('[')) {
      return parseLocalTransaction(result);
    }
    try {
      const cleanJson = result.replace(/```json|```/g, '').trim();
      data = JSON.parse(cleanJson);
    } catch {
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
