export type Theme = 'auto' | 'light' | 'dark'

const KEY = 'shifts-theme'
/** Cor da barra de status do celular em cada tema (igual ao fundo do app). */
const BAR = { light: '#f5f6f4', dark: '#121212' } as const

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' ? t : 'auto'
  } catch {
    return 'auto'
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = theme
  // As duas metas (claro/escuro do sistema) recebem a cor do tema forçado, ou voltam ao padrão.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const sys = m.media.includes('dark') ? 'dark' : 'light'
    m.content = BAR[theme === 'auto' ? sys : theme]
  })
}

export function setTheme(theme: Theme) {
  try {
    if (theme === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    /* ignora */
  }
  applyTheme(theme)
}
