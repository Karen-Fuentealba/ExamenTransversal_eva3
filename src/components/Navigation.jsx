/**
 * Componente: Navigation
 * 
 * Barra de navegación principal de la aplicación.
 * Muestra enlaces dinámicos según el estado de autenticación y rol del usuario.
 * Incluye contador de items en el carrito y manejo de menú responsive.
 * Se relaciona con App.jsx que lo renderiza en todas las páginas,
 * y con AuthContext para obtener datos del usuario autenticado.
 */

import React, { useState } from 'react';
import { Navbar, Nav, Container, Badge } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../context/AuthContext';

const Navigation = ({ cartCount = 0 }) => {
  // Obtener datos de autenticación de forma defensiva para evitar errores durante HMR
  let user = null; let logout = () => {}; let isAdmin = () => false; let isBlocked = false;
  try {
    const auth = useAuth();
    user = auth.user; logout = auth.logout; isAdmin = auth.isAdmin; isBlocked = auth.isBlocked;
  } catch {
    // Si AuthProvider no está disponible, usar valores por defecto
  }
  // Estado para controlar expansión/colapso del menú en móviles
  const [expanded, setExpanded] = useState(false);

  // Cerrar sesión: llama a logout de AuthContext y cierra el menú
  const handleLogout = () => {
    logout();
    setExpanded(false);
  };

  // Cerrar menú móvil al hacer clic en cualquier enlace
  const handleNavClick = () => {
    setExpanded(false);
  };

  return (
    <Navbar 
      expand="lg" 
      className="navbar-light bg-light shadow-sm fixed-top" 
      expanded={expanded}
      onToggle={setExpanded}
    >
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand onClick={handleNavClick}>
            <img 
              src="/img/logo.jpeg" 
              alt="Logo AmbienteFest" 
              className="logo-navbar"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'inline';
              }}
            />
            <span style={{ display: 'none', fontWeight: 'bold', color: 'var(--fucsia)' }}>
              AmbienteFest
            </span>
          </Navbar.Brand>
        </LinkContainer>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <LinkContainer to="/">
              <Nav.Link onClick={handleNavClick}>Inicio</Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/servicios">
              <Nav.Link onClick={handleNavClick} disabled={isBlocked}>Servicios</Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/blog">
              <Nav.Link onClick={handleNavClick} disabled={isBlocked}>Blog</Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/carrito">
              <Nav.Link onClick={handleNavClick} className="position-relative" disabled={isBlocked}>
                <i className="bi bi-cart-fill"></i> Carrito
                {cartCount > 0 && (
                  <Badge 
                    id="carritoBadge"
                    className="position-absolute top-0 start-100 translate-middle rounded-pill"
                    style={{ 
                      background: 'var(--fucsia-oscuro)',
                      fontSize: '0.8em'
                    }}
                  >
                    {cartCount}
                  </Badge>
                )}
              </Nav.Link>
            </LinkContainer>

            {user ? (
              <>
                <Nav.Link disabled className="text-muted">
                  Hola, {user.nombre} {isAdmin() && <Badge bg="warning" text="dark">Admin</Badge>}
                </Nav.Link>
                
                {isAdmin() && (
                  <LinkContainer to="/admin">
                    <Nav.Link onClick={handleNavClick} className="text-primary fw-bold" disabled={isBlocked}>
                      <i className="bi bi-shield-lock"></i> Panel Admin
                    </Nav.Link>
                  </LinkContainer>
                )}
                
                <Nav.Link onClick={handleLogout} style={{ cursor: 'pointer' }}>
                  <i className="bi bi-box-arrow-right"></i> Cerrar Sesión
                </Nav.Link>
              </>
            ) : (
              <LinkContainer to="/login">
                <Nav.Link onClick={handleNavClick}>
                  <i className="bi bi-person"></i> Iniciar Sesión
                </Nav.Link>
              </LinkContainer>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;
