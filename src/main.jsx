import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// El admin se carga aparte para no pesar en el sitio público
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const PersonajePage = lazy(() => import('./PersonajePage.jsx'))
const DenunciaPage = lazy(() => import('./DenunciaPage.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/personaje/:slug" element={<Suspense fallback={null}><PersonajePage /></Suspense>} />
        <Route path="/denuncia" element={<Suspense fallback={null}><DenunciaPage /></Suspense>} />
        <Route path="/admin/*" element={<Suspense fallback={null}><AdminApp /></Suspense>} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
