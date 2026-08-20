import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

document.documentElement.lang = 'ar-EG'
document.documentElement.dir = 'rtl'
document.title = 'هوريكا سمارت | تطبيق السائق'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
