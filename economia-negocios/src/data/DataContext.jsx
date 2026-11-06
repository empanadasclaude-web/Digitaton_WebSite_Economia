import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { guardarServidor, leerServidor } from './sync'
import temas from './seed/temas.json'
import catalogoIndicadores from './seed/catalogoIndicadores.json'
import empresasSeed from './seed/empresas.json'
import cursosSeed from './seed/cursos.json'
import teoria from './seed/teoria.json'

/**
 * Capa de datos provisional.
 *
 * - `temas` son fijos (no se crean ni se editan): vienen directo del JSON.
 * - `catalogoIndicadores` son los indicadores sugeridos al configurar una empresa.
 * - `empresas` y `cursos` arrancan desde los JSON semilla y los cambios se
 *   guardan en localStorage. Cuando exista el backend, solo hay que cambiar
 *   las funciones de este archivo: las pantallas no se enteran.
 * - La empresa (configuración base) está separada del estado de cada curso:
 *   `curso.estado` guarda sus propios indicadores y progreso, así dos cursos
 *   con la misma empresa nunca se afectan entre sí.
 * - `curso.resultados` guarda los archivos Excel generados por las simulaciones:
 *   { id, nombre, temaId, fecha, participantes, url }.
 * - `curso.estado.progresoTemas[temaId]` = { teoria, simulacion } (booleans). Un tema está
 *   completado cuando ambos son true. Se aceptan los valores antiguos 'pendiente'/'completado'.
 * - `curso.estado.contextoVisto` indica si el grupo ya vio el contexto de la
 *   empresa (scrollytelling); la primera vez que se entra al curso se muestra.
 *
 * Despliegue en Vercel: no hay base de datos. Los JSON de `seed/` viajan dentro
 * de la página como datos iniciales y lo que el docente cambia vive en el
 * navegador (localStorage). Para llevar los datos a otro equipo o convertirlos en
 * los nuevos datos iniciales se usan `exportDb` / `importDb` (menú de cuenta).
 */
const DB_KEY = 'edn.db.v1'

/**
 * Datos guardados antes de que existieran las preguntas, los gráficos vivos o las noticias de la
 * simulación: se completan con los de la semilla (mismo id de empresa; preguntas por id o texto).
 */
function conPreguntasSemilla(db) {
  let cambio = false
  const empresas = db.empresas.map((e) => {
    const semilla = empresasSeed.find((s) => s.id === e.id)
    if (!semilla) return e
    let out = e
    if (semilla.preguntas?.length && !(e.preguntas ?? []).length) {
      cambio = true
      out = { ...out, preguntas: structuredClone(semilla.preguntas) }
    } else if (semilla.preguntas?.length) {
      const preguntas = e.preguntas.map((p) => {
        if (p.grafico) return p
        const sp = semilla.preguntas.find((x) => x.id === p.id || x.texto === p.texto)
        if (!sp?.grafico) return p
        cambio = true
        return {
          ...p,
          grafico: structuredClone(sp.grafico),
          opciones: p.opciones.map((o) => {
            const so = sp.opciones.find((x) => x.id === o.id)
            return so?.grafico ? { ...o, grafico: structuredClone(so.grafico) } : o
          }),
        }
      })
      out = { ...out, preguntas }
    }
    if (e.eventos === undefined && semilla.eventos?.length) {
      cambio = true
      out = { ...out, eventos: structuredClone(semilla.eventos) }
    }
    return out
  })
  return cambio ? { ...db, empresas } : db
}

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const db = JSON.parse(raw)
      if (Array.isArray(db?.empresas) && Array.isArray(db?.cursos)) return conPreguntasSemilla(db)
    }
  } catch {
    /* almacenamiento bloqueado o datos corruptos: se usan las semillas */
  }
  return { empresas: structuredClone(empresasSeed), cursos: structuredClone(cursosSeed) }
}

export const DB_VERSION = 1

/** Valida la forma de un archivo de datos importado. Devuelve un mensaje de error o null. */
export function validateDb(db) {
  if (!db || typeof db !== 'object') return 'El archivo no tiene el formato esperado.'
  if (!Array.isArray(db.empresas) || !Array.isArray(db.cursos)) {
    return 'Faltan las listas de empresas y cursos.'
  }
  const empresaOk = (e) => e && typeof e.id === 'string' && typeof e.nombre === 'string' && Array.isArray(e.indicadores)
  const cursoOk = (c) => c && typeof c.id === 'string' && typeof c.nombre === 'string' && typeof c.empresaId === 'string' && c.estado && typeof c.estado === 'object'
  if (!db.empresas.every(empresaOk)) return 'Alguna empresa del archivo está incompleta.'
  if (!db.cursos.every(cursoOk)) return 'Algún curso del archivo está incompleto.'
  const ids = new Set(db.empresas.map((e) => e.id))
  if (!db.cursos.every((c) => ids.has(c.empresaId))) return 'Hay cursos que apuntan a una empresa que no está en el archivo.'
  return null
}

/** Siguiente id de empresa: emp-1, emp-2… */
export function nextEmpresaId(empresas) {
  const max = empresas.reduce((m, e) => Math.max(m, Number(String(e.id).replace(/\D/g, '')) || 0), 0)
  return `emp-${max + 1}`
}

const DataContext = createContext(null)

/** Progreso normalizado de un tema: { teoria, simulacion, completo }. Acepta los valores antiguos. */
export function progresoDeTema(curso, temaId) {
  const v = curso?.estado?.progresoTemas?.[temaId]
  const obj = typeof v === 'object' && v
  const teoria = obj ? Boolean(v.teoria) : v === 'completado'
  const simulacion = obj ? Boolean(v.simulacion) : v === 'completado'
  return { teoria, simulacion, completo: teoria && simulacion }
}

export function DataProvider({ children }) {
  const [db, setDb] = useState(loadDb)

  useEffect(() => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db))
    } catch {
      /* noop (p. ej. cuota llena por un logo muy pesado) */
    }
  }, [db])

  // ── Persistencia en el servidor (Redis) ──────────────────────────────────────
  // Estados: 'local' (sin servidor) · 'conectando' · 'ok' · 'guardando' · 'sin-conexion' ·
  // 'vencida' (hay que volver a iniciar sesión) · 'actualizado' (se trajeron cambios de otro dispositivo).
  const { user } = useAuth()
  const syncInfo = user?.sync ?? null
  const token = syncInfo && syncInfo.exp > Date.now() ? syncInfo.token : null
  const [sync, setSync] = useState('local')
  const rev = useRef(0)
  const listo = useRef(false) // ya se leyó el servidor: desde ahora los cambios se guardan
  const omitir = useRef(false) // el cambio de db vino del servidor: no devolverlo
  const iniciando = useRef(null)
  const dbRef = useRef(db)
  dbRef.current = db

  const adoptar = useCallback((remota) => {
    const data = { empresas: remota.empresas, cursos: remota.cursos.map((c) => ({ resultados: [], ...c })) }
    if (validateDb(data)) return false
    omitir.current = true
    setDb(conPreguntasSemilla(data))
    return true
  }, [])

  useEffect(() => {
    listo.current = false
    if (!token) {
      setSync(syncInfo ? 'vencida' : 'local')
      return
    }
    if (iniciando.current === token) return
    iniciando.current = token
    setSync('conectando')
    ;(async () => {
      const r = await leerServidor(token)
      if (r.status === 401) return setSync('vencida')
      if (!r.ok) return setSync(r.status === 501 || r.status === 404 ? 'local' : 'sin-conexion')
      rev.current = r.rev ?? 0
      if (r.db && adoptar(r.db)) {
        listo.current = true
        return setSync('ok')
      }
      // Servidor vacío: los datos de este navegador (semillas + cambios) se vuelven los datos oficiales.
      const g = await guardarServidor(token, dbRef.current, rev.current)
      if (g.ok) {
        rev.current = g.rev
        listo.current = true
        setSync('ok')
      } else setSync('sin-conexion')
    })()
  }, [token, syncInfo, adoptar])

  useEffect(() => {
    if (!listo.current || !token) return
    if (omitir.current) {
      omitir.current = false
      return
    }
    setSync('guardando')
    const t = setTimeout(async () => {
      const g = await guardarServidor(token, db, rev.current)
      if (g.ok) {
        rev.current = g.rev
        return setSync('ok')
      }
      if (g.status === 409) {
        // Otro dispositivo guardó antes: se trae su versión para no pisarla.
        const r = await leerServidor(token)
        if (r.ok && r.db && adoptar(r.db)) {
          rev.current = r.rev
          return setSync('actualizado')
        }
      }
      setSync(g.status === 401 ? 'vencida' : g.status === 413 ? 'grande' : 'sin-conexion')
    }, 900)
    return () => clearTimeout(t)
  }, [db, token, adoptar])

  const createCurso = useCallback(({ nombre, empresaId }) => {
    setDb((prev) => {
      const empresa = prev.empresas.find((e) => e.id === empresaId)
      if (!empresa) return prev
      const created = {
        id: `curso-${Date.now().toString(36)}`,
        nombre: nombre.trim(),
        empresaId,
        creadoEn: new Date().toISOString(),
        estado: {
          indicadores: empresa.indicadores.map((i) => ({ id: i.id, valor: i.valorInicial })),
          progresoTemas: Object.fromEntries(temas.map((t) => [t.id, { teoria: false, simulacion: false }])),
          contextoVisto: false,
        },
        resultados: [],
      }
      return { ...prev, cursos: [...prev.cursos, created] }
    })
  }, [])

  const updateCurso = useCallback((id, patch) => {
    setDb((prev) => ({
      ...prev,
      cursos: prev.cursos.map((c) => (c.id === id ? { ...c, ...patch, nombre: (patch.nombre ?? c.nombre).trim() } : c)),
    }))
  }, [])

  const deleteCurso = useCallback((id) => {
    setDb((prev) => ({ ...prev, cursos: prev.cursos.filter((c) => c.id !== id) }))
  }, [])

  /** Crea la empresa o, si el id ya existe, reemplaza su configuración base. */
  const saveEmpresa = useCallback((empresa) => {
    setDb((prev) => {
      const exists = prev.empresas.some((e) => e.id === empresa.id)
      return {
        ...prev,
        empresas: exists
          ? prev.empresas.map((e) => (e.id === empresa.id ? empresa : e))
          : [...prev.empresas, empresa],
      }
    })
  }, [])

  /** Elimina una empresa. No lo hace si algún curso todavía la usa (devuelve { ok:false }). */
  const deleteEmpresa = useCallback((id) => {
    if (dbRef.current.cursos.some((c) => c.empresaId === id)) return { ok: false, error: 'en-uso' }
    setDb((prev) => ({ ...prev, empresas: prev.empresas.filter((e) => e.id !== id) }))
    return { ok: true }
  }, [])

  /** Marca que el grupo ya vio el contexto de la empresa. */
  const markContextoVisto = useCallback((id) => {
    setDb((prev) => ({
      ...prev,
      cursos: prev.cursos.map((c) =>
        c.id === id && !c.estado?.contextoVisto ? { ...c, estado: { ...c.estado, contextoVisto: true } } : c,
      ),
    }))
  }, [])

  /** Marca la teoría de un tema como vista en un curso. */
  const markTeoriaVistaCb = useCallback((cursoId, temaId) => {
    setDb((prev) => {
      const c = prev.cursos.find((x) => x.id === cursoId)
      if (!c) return prev
      const actual = progresoDeTema(c, temaId)
      if (actual.teoria) return prev
      return {
        ...prev,
        cursos: prev.cursos.map((x) =>
          x.id === cursoId
            ? { ...x, estado: { ...x.estado, progresoTemas: { ...x.estado.progresoTemas, [temaId]: { teoria: true, simulacion: actual.simulacion } } } }
            : x,
        ),
      }
    })
  }, [])

  /**
   * Cierra una simulación: guarda el resultado (descargable en Excel desde el panel),
   * marca la simulación del tema como realizada y deja los indicadores finales como
   * nuevo estado del curso (las decisiones se acumulan entre simulaciones).
   * `resultado` = { id, nombre, temaId, fecha, participantes, datos }.
   */
  const guardarSimulacion = useCallback((cursoId, temaId, resultado, valoresFinales) => {
    setDb((prev) => {
      const c = prev.cursos.find((x) => x.id === cursoId)
      if (!c || c.resultados?.some((r) => r.id === resultado.id)) return prev
      const actual = progresoDeTema(c, temaId)
      return {
        ...prev,
        cursos: prev.cursos.map((x) =>
          x.id !== cursoId
            ? x
            : {
                ...x,
                resultados: [...(x.resultados ?? []), resultado],
                estado: {
                  ...x.estado,
                  indicadores: x.estado.indicadores.map((i) => ({ ...i, valor: valoresFinales[i.id] ?? i.valor })),
                  progresoTemas: { ...x.estado.progresoTemas, [temaId]: { teoria: actual.teoria, simulacion: true } },
                },
              },
        ),
      }
    })
  }, [])

/** Copia de todos los datos en un objeto listo para guardar como .json. */
  const exportDb = useCallback(
    () => ({ version: DB_VERSION, exportadoEn: new Date().toISOString(), empresas: db.empresas, cursos: db.cursos }),
    [db],
  )

  /** Reemplaza todos los datos por los de un archivo ya validado. */
  const importDb = useCallback((data) => {
    const error = validateDb(data)
    if (error) return { ok: false, error }
    setDb({
      empresas: data.empresas,
      cursos: data.cursos.map((c) => ({ resultados: [], ...c })),
    })
    return { ok: true }
  }, [])

  const value = useMemo(
    () => ({
      temas,
      teoria,
      catalogoIndicadores,
      empresas: db.empresas,
      cursos: db.cursos,
      createCurso,
      updateCurso,
      deleteCurso,
      saveEmpresa,
      deleteEmpresa,
      markContextoVisto,
      markTeoriaVista: markTeoriaVistaCb,
      guardarSimulacion,
      exportDb,
      importDb,
      sync,
    }),
    [db, sync, createCurso, updateCurso, deleteCurso, saveEmpresa, deleteEmpresa, markContextoVisto, markTeoriaVistaCb, guardarSimulacion, exportDb, importDb],
  )
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData debe usarse dentro de <DataProvider>')
  return ctx
}
