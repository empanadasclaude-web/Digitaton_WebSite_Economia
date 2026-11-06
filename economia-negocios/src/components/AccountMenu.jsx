import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../data/DataContext'
import { downloadJson, readJsonFile } from '../data/backup'
import ConfirmDialog from './ConfirmDialog'
import GlassPanel from './GlassPanel'
import GoogleIcon from './GoogleIcon'
import { useTransition } from './PageTransition'
import './AccountMenu.css'

/**
 * Botón de cuenta (avatar) + popover: datos de la sesión, copia de seguridad
 * de los datos (JSON) y cerrar sesión. Se reutiliza en todos los frames.
 *
 * El popover vive en un portal con posición fija, así su blur nunca queda
 * anidado dentro de otro panel de vidrio (ni lo recorta un overflow).
 *
 * `onNotice(msg)`: avisa al frame (toast) tras exportar/importar.
 */
const SYNC_TEXTO = {
  local: 'Tus datos viven en este navegador.',
  conectando: 'Conectando con el servidor…',
  guardando: 'Guardando en el servidor…',
  ok: 'Tus datos están guardados en el servidor y los ves desde cualquier dispositivo.',
  actualizado: 'Se cargaron cambios hechos desde otro dispositivo.',
  'sin-conexion': 'Sin conexión con el servidor: tus cambios quedan en este navegador y se guardarán al próximo cambio.',
  vencida: 'La sesión con el servidor venció: cierra sesión y vuelve a entrar para seguir guardando.',
  grande: 'Un curso o empresa pesa demasiado (¿logo?) y no se pudo guardar en el servidor.',
}

export default function AccountMenu({ onNotice, className = '' }) {
  const { user, signOut } = useAuth()
  const { exportDb, importDb, sync } = useData()
  const go = useTransition()
  const btnRef = useRef(null)
  const popRef = useRef(null)
  const fileRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const [pending, setPending] = useState(null) // datos leídos, a la espera de confirmar
  const [error, setError] = useState('')

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const narrow = window.innerWidth <= 760
    const wide = r.left > window.innerWidth / 2
    if (narrow || wide) {
      setPos({ top: r.bottom + 12, right: Math.max(12, window.innerWidth - r.right), maxWidth: window.innerWidth - 24 })
    } else {
      setPos({ left: r.right + 16, bottom: Math.max(12, window.innerHeight - r.bottom), origin: 'bottom left' })
    }
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, place])

  useEffect(() => {
    if (!open || pending) return
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, pending])

  const initial = user.givenName?.[0]?.toUpperCase() ?? '?'

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadJson(`economia-negocios-datos-${stamp}.json`, exportDb())
    onNotice?.('Copia de seguridad descargada')
    setOpen(false)
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setError('')
      setPending(await readJsonFile(file))
    } catch (err) {
      setError(err.message)
    }
  }

  const confirmImport = () => {
    const res = importDb(pending)
    setPending(null)
    if (res.ok) {
      setOpen(false)
      onNotice?.('Datos restaurados')
    } else {
      setError(res.error)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`avatar ${className}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Información de cuenta"
        onClick={() => setOpen((v) => !v)}
      >
        {initial}
      </button>

      {open &&
        pos &&
        createPortal(
          <GlassPanel
            ref={popRef}
            className="glass--dense acct"
            role="dialog"
            aria-label="Información de cuenta"
            style={{ ...pos, transformOrigin: pos.origin ?? 'top right' }}
          >
            <h2 className="acct__title">Información de cuenta</h2>
            <p className="acct__name">{user.name}</p>
            <p className="acct__link">
              <span>Vinculado con Google</span>
              <GoogleIcon size={24} />
            </p>

            <div className="acct__backup">
              <p className="acct__hint">{SYNC_TEXTO[sync] ?? SYNC_TEXTO.local} Descarga una copia cuando quieras.</p>
              <div className="acct__row">
                <button type="button" className="link-btn" onClick={handleExport}>
                  Exportar datos
                </button>
                <button type="button" className="link-btn" onClick={() => fileRef.current?.click()}>
                  Importar datos
                </button>
              </div>
              {error && (
                <p className="acct__error" role="alert">
                  {error}
                </p>
              )}
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleFile} />
            </div>

            <button
              type="button"
              className="link-btn acct__logout"
              onClick={() => go('/login', { label: 'Hasta pronto', onCovered: signOut })}
            >
              Cerrar Sesión
            </button>
          </GlassPanel>,
          document.body,
        )}

      {pending &&
        createPortal(
          <ConfirmDialog
            title="¿Restaurar datos?"
            message="Se reemplazarán todas las empresas y cursos actuales por los del archivo. Esta acción no se puede deshacer."
            confirmLabel="Restaurar"
            danger
            onConfirm={confirmImport}
            onCancel={() => setPending(null)}
          />,
          document.body,
        )}
    </>
  )
}
