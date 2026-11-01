// Las notas se publican desde el CRM (admin → Noticias); aquí no va contenido a mano.
export const SECCIONES = []

export const youtubeId = url => (url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|studio\.youtube\.com\/video\/)([\w-]{11})/)?.[1]

export const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')


export const CATEGORIAS = ['Todos', ...new Set(SECCIONES.map(s => s.cat))]

export const TICKER = SECCIONES.map(s => `${s.municipio.toUpperCase()}: ${s.title}`)

// ─── Cifras del tablero ───────────────────────────────────────────────────────
// Todo se calcula con notas y expedientes reales; aquí solo van etiquetas y colores.

// Los valores de los indicadores se calculan con los expedientes (App.jsx → useKpis)
export const KPIS = [
  { key: 'abiertos', icon: 'folder', label: 'Expedientes abiertos', note: 'Casos abiertos o en investigación' },
  { key: 'seguimiento', icon: 'target', label: 'En seguimiento', note: 'Con actividad reciente' },
  { key: 'cerrados', icon: 'check', label: 'Cerrados', note: 'Con respuesta o resolución' },
  { key: 'respuestas', icon: 'doc', label: 'Respuestas oficiales', note: 'Oficios y comunicados' },
  { key: 'municipios', icon: 'pin', label: 'Municipios activos', note: 'Con expedientes abiertos' },
]

export const ESTADOS_EXPEDIENTE = [
  { id: 'abierto', label: 'Abierto' },
  { id: 'investigacion', label: 'En investigación' },
  { id: 'seguimiento', label: 'En seguimiento' },
  { id: 'cerrado', label: 'Cerrado' },
]
export const estadoLabel = id => ESTADOS_EXPEDIENTE.find(s => s.id === id)?.label || id

export const MUNICIPIOS = [
  // lado: columna de su etiqueta en el mapa (cerca: junto al punto)
  { name: 'Ecatepec', lado: 'der', lon: -99.050, lat: 19.601 },
  { name: 'Naucalpan', lado: 'izq', lon: -99.239, lat: 19.478 },
  { name: 'Cuauhtémoc', lado: 'der', lon: -99.150, lat: 19.440 },
  { name: 'Tlalnepantla', lado: 'izq', lon: -99.195, lat: 19.540 },
  { name: 'Gustavo A. Madero', lado: 'der', lon: -99.110, lat: 19.490 },
  { name: 'Cuautitlán Izcalli', lado: 'izq', lon: -99.215, lat: 19.646 },
  { name: 'Atizapán de Zaragoza', lado: 'izq', lon: -99.255, lat: 19.559 },
  { name: 'Toluca', lado: 'cerca', lon: -99.657, lat: 19.292 },
  { name: 'Tultitlán', lado: 'der', lon: -99.169, lat: 19.645 },
  { name: 'Nicolás Romero', lado: 'izq', lon: -99.313, lat: 19.635 },
  { name: 'Miguel Hidalgo', lado: 'izq', lon: -99.190, lat: 19.430 },
  { name: 'Huixquilucan', lado: 'izq', lon: -99.350, lat: 19.360 },
  { name: 'Coacalco', lado: 'der', lon: -99.107, lat: 19.629 },
  { name: 'Azcapotzalco', lado: 'izq', lon: -99.186, lat: 19.487 },
  { name: 'Venustiano Carranza', lado: 'der', lon: -99.090, lat: 19.430 },
  { name: 'Cuautitlán', lado: 'izq', lon: -99.179, lat: 19.671 },
  { name: 'Tultepec', lado: 'der', lon: -99.128, lat: 19.685 },
  { name: 'Metepec', lado: 'cerca', lon: -99.604, lat: 19.251 },
  { name: 'Cuajimalpa', lado: 'izq', lon: -99.290, lat: 19.360 },
  { name: 'Tepotzotlán', lado: 'izq', lon: -99.223, lat: 19.716 },
  { name: 'Texcoco', lado: 'der', lon: -98.882, lat: 19.511 },
]

// Cada filtro del mapa muestra las notas de expedientes con esa categoría
export const MAP_FILTERS = [
  { id: 'todas', label: 'Todas', icon: 'layers' },
  { id: 'seguridad', label: 'Seguridad', icon: 'shield', categoria: 'Seguridad' },
  { id: 'corrupcion', label: 'Corrupción', icon: 'coin', categoria: 'Corrupción' },
  { id: 'servicios', label: 'Servicios', icon: 'drop', categoria: 'Servicios públicos' },
  { id: 'obra', label: 'Obra pública', icon: 'crane', categoria: 'Desarrollo urbano' },
]

export const INCIDENTES = [
  { label: 'Seguridad', color: '#E5484D' },
  { label: 'Servicios públicos', color: '#3584E0' },
  { label: 'Corrupción', color: '#B88700' },
  { label: 'Desarrollo urbano', color: '#9C68F2' },
  { label: 'Medio ambiente', color: '#1F9C5B' },
  { label: 'Otros', color: '#6B6B6B' },
]

export const CATEGORIAS_EXPEDIENTE = INCIDENTES.map(c => c.label)

export const ESTATUS = [
  { estado: 'abierto', label: 'Abiertos', icon: 'folder', tone: 'red' },
  { estado: 'investigacion', label: 'En investigación', icon: 'search', tone: 'yellow' },
  { estado: 'seguimiento', label: 'En seguimiento', icon: 'target', tone: 'yellow' },
  { estado: 'cerrado', label: 'Cerrados', icon: 'check', tone: 'green' },
]

// Personajes de Xpediente Callejero (imágenes en /public)
export const PERSONAJES = {
  // host: presentador principal; tiene página pero no tarjeta en la cuadrícula de 12
  // pos: encuadre de la imagen cuando no es retrato
  narizio: { name: 'Narizio Olfario', segmento: 'Presentador principal', img: '/personajes/NARIZIO.png', host: true },
  lizzet: { name: 'Lizzet Arriaga', segmento: 'Periodismo local', img: '/lizzet_arriaga.jpg', pos: '54% top', host: true, kicker: 'Reportera' },
  rolando: { name: 'El Rol Ando', segmento: 'Dando el rol', img: '/personajes/EL%20ROL%20ANDO.png' },
  donaPelos: { name: 'Doña Pelos', segmento: 'La voz de la banqueta', img: '/personajes/DO%C3%91A%20PELOS.png' },
  chicharo: { name: '«El Chícharo»', segmento: 'Lo que no te contaron', img: '/personajes/EL%20CH%C3%8DCHARO.png' },
  pancracio: { name: 'Pancracio', segmento: 'Con las manos en la masa', img: '/personajes/PANCRACIO%20MIGAJON.png' },
  laMari: { name: 'La Mari', segmento: 'Sobre la mesa', img: '/personajes/LA%20MARI.png' },
  misteriozo: { name: 'Mister Iozo', segmento: 'El ojo que todo lo ve', img: '/personajes/MISTER%20IOZO.png' },
  elPoli: { name: 'El Poli', segmento: 'La cuenta pendiente', img: '/personajes/EL%20POLI.png' },
  elVrayan: { name: 'El Vrayan', segmento: 'Chécatesta', img: '/personajes/EL%20VRAYAN.png' },
  yakazi: { name: 'Yakazi', segmento: 'Ya merito', img: '/personajes/YAKAZI.png' },
  veranito: { name: 'Vera Nito', segmento: 'Clima', img: '/personajes/VERA%20NITA.png' },
  betoBarrigol: { name: 'Beto Barrigol', segmento: 'Deportes', img: '/personajes/BETO%20BARRIGOL.png' },
  dulceVictoria: { name: 'Dulce Victoria', segmento: 'Deportes', img: '/personajes/DULCE%20VICTORIA.png' },
}

// Paneles de la portada que se llenan con las notas de ciertos personajes
export const PANELES_PORTADA = {
  evidencia: { title: 'Evidencia aérea', personajes: ['narizio'] },
  voces: { title: 'La voz de la banqueta', personajes: ['donaPelos', 'elVrayan'] },
}

export const MUNICIPIOS_DENUNCIA = [
  ...new Set([...MUNICIPIOS.map(m => m.name), 'Otro municipio']),
]

// Número de WhatsApp que recibe las denuncias, con lada de país (ej. '5215512345678').
// Vacío: WhatsApp abre el mensaje listo y el usuario elige a quién enviarlo.
export const WHATSAPP_NUMBER = ''

// Video del teaser de entrada ("Próximamente"). Pega aquí el "Copiar link" del
// admin (Supabase). Vacío = no se muestra la intro.
export const TEASER_VIDEO = 'https://xysarosunlwjxhspfiql.supabase.co/storage/v1/object/public/videos/2026/10/02a90e14-b512-4930-b2c0-c0eef4b5fcf2-yakazi-caption.mp4'

// En local (npm run dev) aparece la X para cerrarlo y entrar al sitio;
// en producción (Vercel) no se puede cerrar y el sitio queda oculto detrás.
// Sin X en ningún lado: false · con X en todos lados: true
export const TEASER_CLOSABLE = false

// Cada personaje tiene su página: /personaje/<slug>
Object.entries(PERSONAJES).forEach(([key, p]) => {
  p.key = key
  p.slug = slugify(p.name)
  p.seccion = SECCIONES.find(s => s.who === key || s.reporter === key) || null
})
