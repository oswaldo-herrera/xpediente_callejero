// Después de `vite build`: crea copias de index.html con su propia vista previa
// (WhatsApp, Facebook) para los enlaces que se comparten. Vercel sirve
// dist/denuncia.html en /denuncia gracias a "cleanUrls" en vercel.json.
import { readFileSync, writeFileSync } from 'node:fs'

const SITIO = 'https://www.xpedientecallejero.com'

const PAGINAS = [
  {
    archivo: 'denuncia.html',
    url: `${SITIO}/denuncia`,
    titulo: 'Mándanos tu denuncia · Xpediente Callejero',
    descripcion: 'Cuéntanos qué pasa en tu colonia. Llena el formulario y envíalo por WhatsApp.',
    imagen: `${SITIO}/og-denuncia.jpg`,
    ancho: 720,
    alto: 1280,
    alt: 'Mándanos tu denuncia: cuéntanos qué pasa en tu colonia',
  },
]

const base = readFileSync('dist/index.html', 'utf8')
const meta = (html, attr, nombre, valor) => {
  const re = new RegExp(`(<meta ${attr}="${nombre}" content=")[^"]*(")`)
  if (!re.test(html)) throw new Error(`Falta la etiqueta ${nombre} en index.html`)
  return html.replace(re, `$1${valor}$2`)
}

for (const p of PAGINAS) {
  let html = base.replace(/<title>[^<]*<\/title>/, `<title>${p.titulo}</title>`)
  html = meta(html, 'name', 'description', p.descripcion)
  html = meta(html, 'property', 'og:url', p.url)
  html = meta(html, 'property', 'og:title', p.titulo)
  html = meta(html, 'property', 'og:description', p.descripcion)
  html = meta(html, 'property', 'og:image', p.imagen)
  html = meta(html, 'property', 'og:image:width', p.ancho)
  html = meta(html, 'property', 'og:image:height', p.alto)
  html = meta(html, 'property', 'og:image:alt', p.alt)
  html = meta(html, 'name', 'twitter:title', p.titulo)
  html = meta(html, 'name', 'twitter:description', p.descripcion)
  html = meta(html, 'name', 'twitter:image', p.imagen)
  writeFileSync(`dist/${p.archivo}`, html)
  console.log(`Vista previa creada: dist/${p.archivo}`)
}
