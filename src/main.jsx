/**
 * Archivo: main.jsx
 * 
 * Punto de entrada principal de la aplicación React.
 * Renderiza el componente App dentro del elemento 'root' del index.html.
 * Envuelve la aplicación con AuthProvider para proporcionar contexto de autenticación global.
 * StrictMode ayuda a identificar problemas potenciales durante el desarrollo.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'

// Importar Bootstrap JS para funcionalidad de componentes interactivos
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Renderizar la aplicación en el elemento root del HTML
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
