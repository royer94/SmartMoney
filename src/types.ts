export type TransactionType = 'expense' | 'income';

export interface UserProfile {
  uid: string;
  email: string;
  isPro: boolean;
  proExpiresAt?: string;
  freeRecordsCount: number;
  isAdmin?: boolean;
  currency?: string; // moneda preferida del usuario
}

export interface Transaction {
  id?: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  timestamp: any;
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

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  flag: string;
  countries: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'COP', symbol: '$', name: 'Peso colombiano',    locale: 'es-CO', flag: '🇨🇴', countries: 'Colombia' },
  { code: 'MXN', symbol: '$', name: 'Peso mexicano',      locale: 'es-MX', flag: '🇲🇽', countries: 'México' },
  { code: 'ARS', symbol: '$', name: 'Peso argentino',     locale: 'es-AR', flag: '🇦🇷', countries: 'Argentina' },
  { code: 'CLP', symbol: '$', name: 'Peso chileno',       locale: 'es-CL', flag: '🇨🇱', countries: 'Chile' },
  { code: 'PEN', symbol: 'S/', name: 'Sol peruano',       locale: 'es-PE', flag: '🇵🇪', countries: 'Perú' },
  { code: 'UYU', symbol: '$', name: 'Peso uruguayo',      locale: 'es-UY', flag: '🇺🇾', countries: 'Uruguay' },
  { code: 'PYG', symbol: '₲', name: 'Guaraní paraguayo', locale: 'es-PY', flag: '🇵🇾', countries: 'Paraguay' },
  { code: 'BOB', symbol: 'Bs', name: 'Boliviano',         locale: 'es-BO', flag: '🇧🇴', countries: 'Bolivia' },
  { code: 'CRC', symbol: '₡', name: 'Colón costarricense',locale: 'es-CR', flag: '🇨🇷', countries: 'Costa Rica' },
  { code: 'GTQ', symbol: 'Q', name: 'Quetzal guatemalteco',locale: 'es-GT', flag: '🇬🇹', countries: 'Guatemala' },
  { code: 'USD', symbol: '$', name: 'Dólar americano',    locale: 'en-US', flag: '🇺🇸', countries: 'Ecuador, Venezuela, Panamá, USA' },
  { code: 'EUR', symbol: '€', name: 'Euro',               locale: 'es-ES', flag: '🇪🇺', countries: 'Europa' },
];

export const DEFAULT_CURRENCY = 'COP';

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
  { name: 'hoy',           description: 'Gastos de hoy',                    usage: '/hoy' },
  { name: 'semana',        description: 'Gastos de esta semana',             usage: '/semana' },
  { name: 'mes',           description: 'Gastos de este mes',                usage: '/mes' },
  { name: 'top',           description: 'Top 5 mayores gastos',              usage: '/top' },
  { name: 'balance',       description: 'Balance general (Pro)',              usage: '/balance' },
  { name: 'meta',          description: 'Crear meta financiera (Pro)',        usage: '/meta [nombre] [valor]' },
  { name: 'suscripciones', description: 'Ver suscripciones activas',         usage: '/suscripciones' },
  { name: 'ocultar',       description: 'Ocultar balance (Privacidad)',       usage: '/ocultar' },
  { name: 'libertad',      description: 'Simulador de Libertad Financiera',  usage: '/libertad' },
  { name: 'ayuda',         description: 'Ver todos los comandos',            usage: '/ayuda' },
  { name: 'start',         description: 'Mensaje de bienvenida',             usage: '/start' },
  { name: 'pro',           description: 'Información del plan Pro',          usage: '/pro' },
];
