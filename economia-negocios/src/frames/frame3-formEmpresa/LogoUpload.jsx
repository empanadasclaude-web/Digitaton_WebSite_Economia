import { useId, useRef, useState } from 'react'
import { CloseIcon, PlusIcon } from '../../components/Icons'
import { MAX_LOGO } from './formState'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })

const imageSize = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('La imagen no se pudo abrir.'))
    img.src = src
  })

/** Valida tipo, peso y dimensiones; devuelve el logo como data URL. */
async function loadLogo(file) {
  if (!ACCEPTED.includes(file.type)) throw new Error('Usa una imagen PNG, JPG, WEBP o SVG.')
  if (file.size > MAX_LOGO.bytes) throw new Error('El archivo pesa más de 1 MB.')
  const dataUrl = await readAsDataUrl(file)
  if (file.type !== 'image/svg+xml') {
    const { width, height } = await imageSize(dataUrl)
    if (width > MAX_LOGO.width || height > MAX_LOGO.height) {
      throw new Error(`La imagen mide ${width}×${height} px; el máximo es ${MAX_LOGO.width}×${MAX_LOGO.height} px.`)
    }
  }
  return dataUrl
}

export default function LogoUpload({ value, onChange }) {
  const uid = useId()
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    try {
      onChange(await loadLogo(file))
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="logo">
      <span className="ef-label" id={`${uid}-label`}>
        Logo Empresa
      </span>

      <div
        className={`logo__box${dragging ? ' is-dragging' : ''}${value ? ' has-image' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
      >
        {value ? (
          <>
            <img src={value} alt="Logo de la empresa" className="logo__img" />
            <button
              type="button"
              className="icon-btn logo__remove"
              onClick={() => {
                onChange(null)
                setError('')
                if (inputRef.current) inputRef.current.value = ''
              }}
              aria-label="Quitar logo"
            >
              <CloseIcon size={18} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="logo__pick"
            onClick={() => inputRef.current?.click()}
            aria-labelledby={`${uid}-label`}
          >
            <span className="logo__plus">
              <PlusIcon size={20} />
            </span>
            <span className="logo__hint">
              Dimensiones máx.
              <br />
              {MAX_LOGO.width} × {MAX_LOGO.height} px
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="logo-input"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <p className="ef-field__err" role="alert">
        {error}
      </p>
    </div>
  )
}
