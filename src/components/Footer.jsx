// Footer - pie de página con enlaces y datos de contacto
import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import UserProfileView from './VerPerfilUsuario';
import UserProfileEdit from './EditarPerfil';

/**
 * Footer
 * Componente presentacional que muestra enlaces a secciones del sitio,
 * información de contacto y un bloque FAQ colapsable.
 *
 * Notas:
 * - Utiliza clases Bootstrap y <Link> de react-router para navegación interna.
 * - Es un componente sin estado; para personalizar textos o enlaces extraer a props.
 */
const Footer = () => {
  // useAuth not required here; Footer is presentational

  return (
    <footer className="footer-ambiente bg-dark text-white pt-5 pb-3 mt-5">
      <Container>
          {/* Servicios: enlaces principales */}
          <Row className="align-items-start">
            <Col xs={12} md={3} className="mb-4 mb-md-0 px-2">
              <h5 className="fw-bold mb-3">
                <i className="bi bi-briefcase-fill"></i> Servicios
              </h5>
              <ul className="list-unstyled">
                <li>
                  <Link to="/servicios" className="text-white-50 text-decoration-none">
                    Catálogo de Servicios
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="text-white-50 text-decoration-none">
                    Blog y Tendencias
                  </Link>
                </li>
              </ul>
            </Col>

            <Col xs={12} md={3} className="mb-4 mb-md-0 px-2">
              <h5 className="fw-bold mb-3">
                <i className="bi bi-building"></i> Empresa
              </h5>
              <ul className="list-unstyled">
                <li>
                  <Link to="/nosotros" className="text-white-50 text-decoration-none">
                    Sobre Nosotros
                  </Link>
                </li>
                <li>
                  <a
                    className="text-white-50 text-decoration-none"
                    data-bs-toggle="collapse"
                    href="#faqFooter"
                    role="button"
                    aria-expanded="false"
                    aria-controls="faqFooter"
                  >
                    FAQ
                  </a>
                </li>
                <li>
                  <Link to="/terminos" className="text-white-50 text-decoration-none">
                    Términos y Condiciones
                  </Link>
                </li>
                <li>
                  <Link to="/politicas" className="text-white-50 text-decoration-none">
                    Política de Privacidad
                  </Link>
                </li>
              </ul>
            </Col>

            <Col xs={12} md={3} className="mb-4 mb-md-0 px-2">
              <h5 className="fw-bold mb-3">
                <i className="bi bi-envelope-fill"></i> Contacto
              </h5>
              <ul className="list-unstyled">
                <li>
                  <i className="bi bi-geo-alt-fill"></i> Santiago, Chile
                </li>
                <li>
                  <i className="bi bi-envelope-open-fill"></i>{' '}
                  <span className="text-white">contacto@ambientefest.cl</span>
                </li>
                <li>
                  <i className="bi bi-phone-fill"></i> +56 9 1234 5678
                </li>
                <li className="mt-2">
                  <Link to="/#contactanos" className="btn btn-outline-primary btn-sm btn-contacto">
                    Formulario de Contacto
                  </Link>
                </li>
              </ul>
            </Col>

            <Col xs={12} md={3} className="mb-4 mb-md-0 px-2 text-md-end">
              <h5 className="fw-bold mb-3">
                <i className="bi bi-person-circle"></i> Perfil
              </h5>
              <ul className="list-unstyled d-inline-block">
                <li>
                  <UserProfileView className="text-white-50" />
                </li>
                <li>
                  <UserProfileEdit className="text-white-50" />
                </li>
              </ul>
            </Col>
          </Row>
        <hr className="border-secondary my-4" />
        
        <Row>
          <Col className="text-center">
            <small className="text-white-50">
              &copy; 2025 AmbienteFest. Todos los derechos reservados.
            </small>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
