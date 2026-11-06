import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'edn.theme.v2'
const Ctx = createContext(null)

const read = () => {
  try {
    return localStorage.getItem(KEY) === 'default' ? 'default' : 'uao'
  } catch {
    return 'uao'
  }
}

/** Paleta de la página: 'uao' (manual de identidad UAO, la predeterminada) o 'default' (cobalto → hielo). */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(read)

  useEffect(() => {
    if (theme === 'uao') document.documentElement.dataset.theme = 'uao'
    else delete document.documentElement.dataset.theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* sin almacenamiento: el cambio vale solo para esta sesión */
    }
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'uao' ? 'default' : 'uao')), [])
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return v
}
