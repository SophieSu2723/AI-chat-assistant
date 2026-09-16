import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './styles.css'
import { App } from './App'

// Check for a new version whenever the app is reopened.  The update is applied
// automatically so an installed copy does not remain on an old demo build.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
