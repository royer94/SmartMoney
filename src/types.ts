export type TransactionType = 'expense' | 'income';
// 🌟 Nuevo tipo para diferenciar si el registro se creó por texto o dictado por voz
export type InputModeType = 'text' | 'voice';

export interface UserProfile {
  uid: string;
  email: string;
  isPro: boolean;
  proExpiresAt?: string;
  freeRecordsCount: number;
  isAdmin?: boolean;
  currency?: string;
  name?: string;        // nombre del usuario
  birthdate?: string;   // fecha de nacimiento ISO: "1994-05-18"
  onboardingDone?: boolean; // si ya completó el onboarding
  
  // ✅ Nuevos campos para el sistema de suscripción y límites
  isActive?: boolean;           // suscripción pagada activa
  isTrialActive?: boolean;      // trial en curso
  trialEndDate?: any;           // fecha de fin del trial (Timestamp o Date)
  monthlyRecordCount?: number;  // contador de registros de texto en el mes
  monthlyVoiceCount?: number;   // contador de registros de voz en el mes
  lastResetDate?: any;          // fecha del último reseteo de contadores
  
  // ✅ Campos para la oferta del trial (activación manual)
  trialOfferLastShown?: number;  // última transacción en que se mostró la oferta
  trialOfferAccepted?: boolean;  // si el usuario ya aceptó el trial (para no volver a mostrar)
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
  // 🌟 Campo obligatorio para clasificar el origen y aplicar las restricciones en el plan Free
  inputMode: InputModeType;
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
  { code: 'COP', symbol: '$', name: 'Peso colombiano',     locale: 'es-CO', flag: '🇨🇴', countries: 'Colombia' },
  { code: 'MXN', symbol: '$', name: 'Peso mexicano',        locale: 'es-MX', flag: '🇲🇽', countries: 'México' },
  { code: 'ARS', symbol: '$', name: 'Peso argentino',      locale: 'es-AR', flag: '🇦🇷', countries: 'Argentina' },
  { code: 'CLP', symbol: '$', name: 'Peso chileno',        locale: 'es-CL', flag: '🇨🇱', countries: 'Chile' },
  { code: 'PEN', symbol: 'S/', name: 'Sol peruano',        locale: 'es-PE', flag: '🇵🇪', countries: 'Perú' },
  { code: 'UYU', symbol: '$', name: 'Peso uruguayo',       locale: 'es-UY', flag: '🇺🇾', countries: 'Uruguay' },
  { code: 'PYG', symbol: '₲', name: 'Guaraní paraguayo',  locale: 'es-PY', flag: '🇵🇾', countries: 'Paraguay' },
  { code: 'BOB', symbol: 'Bs', name: 'Boliviano',          locale: 'es-BO', flag: '🇧🇴', countries: 'Bolivia' },
  { code: 'CRC', symbol: '₡', name: 'Colón costarricense', locale: 'es-CR', flag: '🇨🇷', countries: 'Costa Rica' },
  { code: 'GTQ', symbol: 'Q', name: 'Quetzal guatemalteco', locale: 'es-GT', flag: '🇬🇹', countries: 'Guatemala' },
  { code: 'USD', symbol: '$', name: 'Dólar americano',     locale: 'en-US', flag: '🇺🇸', countries: 'Ecuador, Venezuela, Panamá, USA' },
  { code: 'EUR', symbol: '€', name: 'Euro',                locale: 'es-ES', flag: '🇪🇺', countries: 'Europa' },
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

// 🌟 Reemplazo de FREE_LIMIT = 20 por los topes independientes del Backend:
export const FREE_TEXT_LIMIT = 40;
export const FREE_VOICE_LIMIT = 10;

export interface Command {
  name: string;
  description: string;
  usage: string;
}

export const COMMANDS: Command[] = [
  { name: 'hoy',           description: 'Gastos de hoy',                   usage: '/hoy' },
  { name: 'semana',        description: 'Gastos de esta semana',            usage: '/semana' },
  { name: 'mes',           description: 'Gastos de este mes',               usage: '/mes' },
  { name: 'top',           description: 'Top 5 mayores gastos',             usage: '/top' },
  { name: 'balance',       description: 'Balance general (Pro)',             usage: '/balance' },
  { name: 'meta',          description: 'Crear meta financiera (Pro)',       usage: '/meta [nombre] [valor]' },
  { name: 'suscripciones', description: 'Ver suscripciones activas',        usage: '/suscripciones' },
  { name: 'ocultar',       description: 'Ocultar balance (Privacidad)',      usage: '/ocultar' },
  { name: 'libertad',      description: 'Simulador de Libertad Financiera', usage: '/libertad' },
  { name: 'ayuda',         description: 'Ver todos los comandos',           usage: '/ayuda' },
  { name: 'start',         description: 'Mensaje de bienvenida',            usage: '/start' },
  { name: 'pro',           description: 'Información del plan Pro',         usage: '/pro' },
];
