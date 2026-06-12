import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import "./styles/animations.css"
import { AuthProvider } from './hooks/useAuth.jsx'
import { inject } from '@vercel/analytics'
import { registerServiceWorker } from './services/serviceWorkerRegistration.js'

inject();
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
