// Mensaje de una sola vez que un frame deja para el siguiente
// (por ejemplo "Empresa creada" al volver al panel).
let pending = null

export function setFlash(message) {
  pending = message
}

export function takeFlash() {
  const message = pending
  pending = null
  return message
}
