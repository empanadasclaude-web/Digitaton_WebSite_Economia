// Descarga y lectura de archivos JSON del navegador (respaldo de datos).

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readJsonFile(file) {
  if (file.size > 20_000_000) throw new Error('El archivo es demasiado grande.')
  try {
    return JSON.parse(await file.text())
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
}
