import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import GlassFilters from './components/GlassFilters'
import { AuthProvider } from './context/AuthContext'
import { GOOGLE_CLIENT_ID } from './config/auth'
import './styles/global.css'

const app = (
  <BrowserRouter>
    <AuthProvider>
      <GlassFilters />
      <App />
    </AuthProvider>
  </BrowserRouter>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {GOOGLE_CLIENT_ID ? (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{app}</GoogleOAuthProvider>
    ) : (
      app
    )}
  </StrictMode>,
)
