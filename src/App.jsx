/**
 * Componente: App.jsx
 * 
 * Componente principal que configura la estructura de la aplicación.
 * Gestiona el enrutamiento con React Router DOM, definiendo rutas públicas y protegidas.
 * Maneja el estado del carrito de compras y lo sincroniza con localStorage.
 * Renderiza Navigation y Footer que aparecen en todas las páginas.
 * Se relaciona con main.jsx que lo renderiza, y con Navigation al pasarle el contador del carrito.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Servicios from './pages/Servicios';
import Blog from './pages/Blog';
import Carrito from './pages/Carrito';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Nosotros from './components/Nosotros';
import Terminos from './components/Terminos';
import Politicas from './components/Politicas';

// Componente auxiliar para manejar scroll automático a secciones con hash
function ScrollToHash({ children }) {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const t = setTimeout(() => {
        const el2 = document.getElementById(id);
        if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      return () => clearTimeout(t);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);

  return children;
}

function App() {
  // Estado del carrito de compras
  const [carrito, setCarrito] = useState([]);

  // Cargar carrito desde localStorage al iniciar la aplicación
  useEffect(() => {
    const carritoGuardado = localStorage.getItem('ambienteFestCarrito');
    if (carritoGuardado) {
      setCarrito(JSON.parse(carritoGuardado));
    }
  }, []);

  // Guardar carrito en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem('ambienteFestCarrito', JSON.stringify(carrito));
  }, [carrito]);

  const addToCart = (servicio) => {
    // Evitar que usuarios bloqueados agreguen al carrito
    try {
      const auth = useAuth();
      const blocked = auth?.isBlocked;
      const canInteract = auth?.canInteract;
      if (blocked || (canInteract && !canInteract())) {
        // Mostrar aviso simple al usuario
        window.alert('No puedes realizar esta acción. Contacta al administrador.');
        return;
      }
    } catch (e) {
      // Si el hook falla por alguna razón, continuar con la lógica normal
    }

    setCarrito(prevCarrito => {
      const servicioExistente = prevCarrito.find(item => item.id === servicio.id);
      
      if (servicioExistente) {
        // Si ya existe, incrementar cantidad
        return prevCarrito.map(item =>
          item.id === servicio.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      } else {
        // Si no existe, agregarlo con cantidad 1
        return [...prevCarrito, { ...servicio, cantidad: 1 }];
      }
    });
  };

  const removeFromCart = (servicioId) => {
    setCarrito(prevCarrito => prevCarrito.filter(item => item.id !== servicioId));
  };

  const clearCart = () => {
    setCarrito([]);
  };

  const getTotalItems = () => {
    return carrito.reduce((total, item) => total + item.cantidad, 0);
  };

  return (
    <Router>
      <div className="App">
        <Navigation cartCount={getTotalItems()} />

        <main>
          <ScrollToHash>
            <Routes>
              <Route 
                path="/" 
                element={<Home onAddToCart={addToCart} />} 
              />
              <Route 
                path="/servicios" 
                element={<Servicios onAddToCart={addToCart} />} 
              />
              <Route path="/nosotros" element={<Nosotros />} />
              <Route path="/terminos" element={<Terminos />} />
              <Route path="/politicas" element={<Politicas />} />
              <Route 
                path="/blog" 
                element={<Blog />} 
              />
              <Route 
                path="/carrito" 
                element={
                  <ProtectedRoute>
                    <Carrito 
                      carrito={carrito}
                      onRemoveFromCart={removeFromCart}
                      onClearCart={clearCart}
                    />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/login" 
                element={<Login />} 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <Admin />
                  </ProtectedRoute>
                } 
              />
            </Routes>
        </ScrollToHash>
          </main>
          
          <Footer />
        </div>
      </Router>
  );
}

export default App;
