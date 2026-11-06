import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ThemeSwitch from './components/ThemeSwitch'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './frames/frame1-login/Login'

// Cada frame se descarga cuando se necesita: el login no carga el código del resto.
const frames = {
  panel: () => import('./frames/frame2-panelAdmin/PanelAdmin'),
  empresa: () => import('./frames/frame3-formEmpresa/EmpresaForm'),
  contexto: () => import('./frames/frame3b-contextoEmpresa/ContextoEmpresa'),
  home: () => import('./frames/frame4-homeGrupo/HomeGrupo'),
  teoria: () => import('./frames/frame3c-temaTeoria/TemaTeoria'),
}
const PanelAdmin = lazy(frames.panel)
const EmpresaForm = lazy(frames.empresa)
const ContextoEmpresa = lazy(frames.contexto)
const HomeGrupo = lazy(frames.home)
const TemaTeoria = lazy(frames.teoria)

export default function App() {
  const { pathname } = useLocation()
  // En el home del grupo el suiche va dentro del encabezado; en el resto, flotante.
  const inlineSwitch = /^\/curso\/[^/]+\/?$/.test(pathname)
  // Con el navegador desocupado se precargan los demás frames, así la transición
  // de cortina nunca espera una descarga.
  useEffect(() => {
    const preload = () => Object.values(frames).forEach((load) => load())
    const id = window.requestIdleCallback ? window.requestIdleCallback(preload) : setTimeout(preload, 1200)
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id))
  }, [])

  return (
    <Suspense fallback={null}>
      {!inlineSwitch && <ThemeSwitch floating />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<PanelAdmin />} />
          <Route path="/empresas/nueva" element={<EmpresaForm />} />
          <Route path="/empresas/:id" element={<EmpresaForm />} />
          <Route path="/curso/:cursoId" element={<HomeGrupo />} />
          <Route path="/curso/:cursoId/contexto" element={<ContextoEmpresa />} />
          <Route path="/curso/:cursoId/tema/:temaId" element={<TemaTeoria />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
