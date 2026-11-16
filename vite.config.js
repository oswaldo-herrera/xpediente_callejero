import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// En local sirve /api/* con las mismas funciones que usa Vercel en producción.
// Las variables de .env.local (incluida la llave service_role) solo llegan a estas
// funciones del servidor, nunca al código de la página.
const apiLocal = env => ({
  name: 'api-local',
  configureServer(server) {
    Object.assign(process.env, env)
    server.middlewares.use(async (req, res, next) => {
      const ruta = req.url.match(/^\/api\/([a-z-]+)(?:\?|$)/)
      if (!ruta) return next()
      try {
        const { default: handler } = await server.ssrLoadModule(`/api/${ruta[1]}.js`)
        await handler(req, res)
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ mensaje: err.message }))
      }
    })
  },
})

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), apiLocal(loadEnv(mode, process.cwd(), ''))],
}))
