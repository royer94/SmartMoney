export type TransactionType = 'expense' | 'income';

export interface UserProfile {
  uid: string;
  email: string;
  isPro: boolean;
  proExpiresAt?: string;
  freeRecordsCount: number;
  isAdmin?: boolean;
}

export interface Transaction {
  id?: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  timestamp: any; // Firestore Timestamp
  isRecurring?: boolean;
}

export interface Goal {
  id?: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  month: number;
  year: number;
}

export const CATEGORIES = [
  'Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación',
  'Ropa', 'Servicios', 'Regalos', 'Viajes', 'Mascotas', 'Hogar',
  'Gimnasio', 'Suscripciones', 'Inversiones', 'Ahorro', 'Seguros', 'Otros',
  'Salario', 'Freelance', 'Ventas', 'Intereses', 'Dividendos', 'Bonos',
  'Lotería', 'Reembolso', 'Alquiler', 'Regalo recibido', 'Beca', 'Trabajos Extra',
  'Intercambios', 'Premios', 'Pensión', 'Comisiones', 'Donaciones', 'Varios'
];

export const FREE_LIMIT = 20;

export interface Command {
  name: string;
  description: string;
  usage: string;
}

export const COMMANDS: Command[] = [
  { name: 'hoy', description: 'Gastos de hoy', usage: '/hoy' },
  { name: 'semana', description: 'Gastos de esta semana', usage: '/semana' },
  { name: 'vsanterior', description: 'Comparar con periodo anterior', usage: '/vsanterior' },
  { name: 'mes', description: 'Gastos de este mes', usage: '/mes' },
  { name: 'top', description: 'Top gastos', usage: '/top' },
  { name: 'compartir', description: 'Exportar reporte', usage: '/compartir' },
  { name: 'gastos', description: 'Lista de gastos', usage: '/gastos' },
  { name: 'borrargasto', description: 'Borrar gasto por ID', usage: '/borrargasto [ID]' },
  { name: 'ingresos', description: 'Lista de ingresos (Pro)', usage: '/ingresos' },
  { name: 'borraringreso', description: 'Borrar ingreso por ID (Pro)', usage: '/borraringreso [ID]' },
  { name: 'balance', description: 'Balance general (Pro)', usage: '/balance' },
  { name: 'meta', description: 'Metas financieras (Pro)', usage: '/meta [nombre] [valor]' },
  { name: 'guia', description: 'Ver tutorial', usage: '/guia' },
  { name: 'ayuda', description: 'Ver ayuda', usage: '/ayuda' },
  { name: 'start', description: 'Bienvenida', usage: '/start' },
  { name: 'pro', description: 'Información Pro', usage: '/pro' },
  { name: 'ocultar', description: 'Ocultar balance (Privacidad)', usage: '/ocultar' },
  { name: 'libertad', description: 'Simulador de Libertad Financiera', usage: '/libertad' },
];
