import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const db = JSON.parse(raw)
      if (Array.isArray(db?.empresas) && Array.isArray(db?.cursos)) return db
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
      markContextoVisto,
      markTeoriaVista: markTeoriaVistaCb,
      exportDb,
      importDb,
    }),
    [db, createCurso, updateCurso, deleteCurso, saveEmpresa, markContextoVisto, markTeoriaVistaCb, exportDb, importDb],
  )
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData debe usarse dentro de <DataProvider>')
  return ctx
}
