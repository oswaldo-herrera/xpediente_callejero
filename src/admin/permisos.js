// Módulos que se pueden dar a un miembro del equipo (Usuarios queda solo para admins).
// Si cambias esta lista, actualiza también MODULOS en api/usuarios.js.
export const MODULOS_PERMISOS = [
  { id: 'monitoreo', label: 'Monitoreo' },
  { id: 'comentarios', label: 'Comentarios' },
  { id: 'noticias', label: 'Noticias' },
  { id: 'videos', label: 'Videos' },
  { id: 'expedientes', label: 'Expedientes' },
  { id: 'calendario', label: 'Calendario' },
]

// Lo que recibe un periodista nuevo si no se marca otra cosa
export const MODULOS_BASE = ['monitoreo', 'comentarios']
