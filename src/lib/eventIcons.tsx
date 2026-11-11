import {
  Bell,
  Briefcase,
  Cake,
  CalendarDays,
  Car,
  Church,
  Dumbbell,
  Gift,
  GraduationCap,
  House,
  Music,
  PartyPopper,
  PawPrint,
  Pill,
  Plane,
  Scissors,
  ShoppingCart,
  Stethoscope,
  Trophy,
  Users,
  Utensils,
  Wallet,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'
import { forwardRef } from 'react'

/** Dente no mesmo estilo dos ícones lucide (o pacote não tem um). */
const Tooth = forwardRef<SVGSVGElement, LucideProps>(({ size = 24, strokeWidth = 2, color = 'currentColor', ...rest }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <path d="M7.5 3C5 3 3.5 5 3.5 7.5c0 2 .8 3.4 1.5 4.7.6 1.1.9 2.3 1 3.6l.4 3.3c.1 1 .8 1.9 1.7 1.9.8 0 1.4-.6 1.6-1.4l.8-3.4c.2-.8.7-1.2 1.5-1.2s1.3.4 1.5 1.2l.8 3.4c.2.8.8 1.4 1.6 1.4.9 0 1.6-.9 1.7-1.9l.4-3.3c.1-1.3.4-2.5 1-3.6.7-1.3 1.5-2.7 1.5-4.7C20.5 5 19 3 16.5 3c-1.6 0-2.6.7-3.4 1.2-.7.4-1.5.4-2.2 0C10.1 3.7 9.1 3 7.5 3z" />
  </svg>
)) as unknown as LucideIcon

export interface EventIcon {
  id: string
  label: string
  Icon: LucideIcon
  /** Palavras no título que sugerem este ícone (sem acento, minúsculas). */
  keywords: string[]
}

export const EVENT_ICONS: EventIcon[] = [
  { id: 'general', label: 'Geral', Icon: CalendarDays, keywords: [] },
  { id: 'dentist', label: 'Dentista', Icon: Tooth, keywords: ['dentista', 'dente', 'ortodont', 'aparelho', 'canal', 'limpeza'] },
  { id: 'doctor', label: 'Médico', Icon: Stethoscope, keywords: ['medic', 'consulta', 'exame', 'hospital', 'clinica', 'fisio', 'psico', 'terapia'] },
  { id: 'medicine', label: 'Remédio', Icon: Pill, keywords: ['remedio', 'vacina', 'farmacia', 'injecao'] },
  { id: 'gym', label: 'Academia', Icon: Dumbbell, keywords: ['academia', 'treino', 'musculacao', 'crossfit', 'pilates'] },
  { id: 'sport', label: 'Esporte', Icon: Trophy, keywords: ['futebol', 'jogo', 'pelada', 'corrida', 'campeonato', 'volei', 'basquete'] },
  { id: 'birthday', label: 'Aniversário', Icon: Cake, keywords: ['aniversario', 'niver', 'bolo'] },
  { id: 'party', label: 'Festa', Icon: PartyPopper, keywords: ['festa', 'balada', 'churrasco', 'casamento', 'formatura'] },
  { id: 'gift', label: 'Presente', Icon: Gift, keywords: ['presente', 'natal'] },
  { id: 'study', label: 'Estudo', Icon: GraduationCap, keywords: ['aula', 'prova', 'faculdade', 'curso', 'estudo', 'escola', 'trabalho de', 'tcc'] },
  { id: 'work', label: 'Trabalho', Icon: Briefcase, keywords: ['reuniao', 'entrevista', 'trabalho', 'treinamento'] },
  { id: 'travel', label: 'Viagem', Icon: Plane, keywords: ['viagem', 'voo', 'aeroporto', 'ferias'] },
  { id: 'car', label: 'Carro', Icon: Car, keywords: ['carro', 'moto', 'oficina', 'mecanico', 'revisao', 'detran', 'ipva'] },
  { id: 'repair', label: 'Conserto', Icon: Wrench, keywords: ['conserto', 'tecnico', 'manutencao', 'instalacao'] },
  { id: 'shopping', label: 'Compras', Icon: ShoppingCart, keywords: ['mercado', 'compras', 'feira', 'shopping'] },
  { id: 'bills', label: 'Contas', Icon: Wallet, keywords: ['conta', 'pagar', 'boleto', 'banco', 'fatura', 'aluguel', 'pix'] },
  { id: 'pet', label: 'Pet', Icon: PawPrint, keywords: ['veterinario', 'pet', 'cachorro', 'gato', 'banho e tosa'] },
  { id: 'hair', label: 'Cabelo', Icon: Scissors, keywords: ['cabelo', 'barbeiro', 'barba', 'salao', 'manicure', 'unha'] },
  { id: 'food', label: 'Refeição', Icon: Utensils, keywords: ['almoco', 'jantar', 'restaurante', 'cafe', 'pizza'] },
  { id: 'family', label: 'Pessoas', Icon: Users, keywords: ['familia', 'amigos', 'visita', 'encontro', 'mae', 'pai', 'vo'] },
  { id: 'home', label: 'Casa', Icon: House, keywords: ['casa', 'faxina', 'mudanca', 'diarista'] },
  { id: 'church', label: 'Igreja', Icon: Church, keywords: ['igreja', 'missa', 'culto'] },
  { id: 'music', label: 'Música', Icon: Music, keywords: ['show', 'musica', 'ensaio', 'cinema', 'teatro'] },
  { id: 'reminder', label: 'Lembrete', Icon: Bell, keywords: ['lembrete', 'lembrar', 'prazo'] },
]

const byId = new Map(EVENT_ICONS.map((i) => [i.id, i]))

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Sugere um ícone pelo título (ex.: "Dentista" → dente). */
export function suggestIcon(title: string): string | null {
  const t = normalize(title)
  if (!t.trim()) return null
  for (const i of EVENT_ICONS) if (i.keywords.some((k) => t.includes(k))) return i.id
  return null
}

/** Ícone a exibir: o escolhido, senão o sugerido pelo título, senão o geral. */
export function eventIcon(ev: { icon?: string | null; title: string }): EventIcon {
  return byId.get(ev.icon ?? '') ?? byId.get(suggestIcon(ev.title) ?? '') ?? EVENT_ICONS[0]
}
