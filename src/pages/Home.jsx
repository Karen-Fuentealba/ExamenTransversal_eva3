import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Alert, Spinner } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { serviciosAPI } from '../services/servicios';
import { contactoAPI } from '../services/contacto';
import Nosotros from '../components/Nosotros';
import MultiImageDisplay from '../components/MultiImageDisplay';
import ModalDetalleServicio from '../components/ModalDetalleServicio';

const Home = ({ onAddToCart }) => {
  const [serviciosDestacados, setServiciosDestacados] = useState([]);
  const [showDetalle, setShowDetalle] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);

  // Estados para el formulario de contacto
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactAlert, setContactAlert] = useState({ show: false, variant: '', message: '' });

  

  const animatePiece = useCallback((piece) => {
    let top = -20;
    const speed = Math.random() * 2 + 1;

    const fall = () => {
      top += speed;
      piece.style.top = top + 'px';

      if (top < window.innerHeight + 20) {
        requestAnimationFrame(fall);
      } else {
        // Reiniciar desde arriba
        piece.style.top = '-20px';
        piece.style.left = Math.random() * 100 + 'vw';
        setTimeout(() => animatePiece(piece), Math.random() * 1000);
      }
    };

    fall();
  }, []);

  const createCotillon = useCallback(() => {
    const cotillon = document.getElementById('cotillon');
    if (cotillon) {
      cotillon.innerHTML = ''; // Limpiar cotillón existente

      for (let i = 0; i < 30; i++) {
        const piece = document.createElement('div');
        piece.className = 'cotillon-piece';

        // Colores aleatorios del tema
        const colors = ['#e10098', '#ff4fcf', '#b8006e', '#ffe0ef'];
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        // Posición y animación aleatoria
        piece.style.left = Math.random() * 100 + 'vw';
        piece.style.animationDelay = Math.random() * 3 + 's';
        piece.style.animationDuration = (Math.random() * 3 + 2) + 's';

        cotillon.appendChild(piece);

        // Animación de caída
        animatePiece(piece);
      }
    }
  }, [animatePiece]);

  useEffect(() => {
    // Cargar servicios destacados reales (hasta 4)
    const loadDestacados = async () => {
      try {
        const destacados = await serviciosAPI.getAll({ includeAll: false, limit: 4, ttl: 300000 });
        setServiciosDestacados(Array.isArray(destacados) ? destacados.slice(0, 4) : []);
      } catch (error) {
        console.error('Error cargando servicios destacados:', error);
        // Sin datos de respaldo, mostrar lista vacía
        setServiciosDestacados([]);
      }
    };

    loadDestacados();
    // Crear elementos de cotillón animado
    createCotillon();
  }, [createCotillon]);

  // Manejar cambios en el formulario de contacto
  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar envío del formulario de contacto
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      setContactAlert({
        show: true,
        variant: 'danger',
        message: 'Por favor, completa todos los campos.'
      });
      return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactForm.email)) {
      setContactAlert({
        show: true,
        variant: 'danger',
        message: 'Por favor, ingresa un email válido.'
      });
      return;
    }

    try {
      setContactLoading(true);
      setContactAlert({ show: false, variant: '', message: '' });

      await contactoAPI.create({
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        message: contactForm.message.trim()
      });

      // Limpiar formulario después del éxito
      setContactForm({
        name: '',
        email: '',
        message: ''
      });

      setContactAlert({
        show: true,
        variant: 'success',
        message: '¡Mensaje enviado correctamente! Te contactaremos pronto.'
      });

      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => {
        setContactAlert({ show: false, variant: '', message: '' });
      }, 5000);

    } catch (error) {
      console.error('Error enviando mensaje de contacto:', error);
      setContactAlert({
        show: true,
        variant: 'danger',
        message: 'Error al enviar el mensaje. Por favor, inténtalo nuevamente.'
      });
    } finally {
      setContactLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'text-warning' : 'text-muted'}>
          ★
        </span>
      );
    }
    return stars;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  return (
    <div style={{ paddingTop: '120px' }}>
      {/* Cotillón animado */}
      <div className="cotillon" id="cotillon"></div>

      {/* Hero/Banner */}
      <section className="bg-dark text-white text-center py-5 banner-principal">
        <Container>
          <h1 className="display-4 fw-bold">Organiza tu Evento Perfecto</h1>
          <p className="lead">
            Encuentra y cotiza servicios para todo tipo de eventos: matrimonios, cumpleaños, 
            baby showers, graduaciones, fiestas temáticas y más.
          </p>
          <LinkContainer to="/servicios">
            <a className="af-btn af-btn-primary af-btn-lg mt-3">Ver Servicios</a>
          </LinkContainer>
        </Container>
      </section>

      

      {/* Servicios Destacados */}
      <section id="servicios" className="py-5">
        <Container>
          <h2 className="h4 mb-4 text-center">Servicios Destacados</h2>
          <Row>
            {serviciosDestacados.map((servicio) => (
              <Col md={4} key={servicio.id} className="mb-4">
                <Card className="h-100">
                  <MultiImageDisplay 
                    imageUrls={servicio.imagenes && servicio.imagenes.length ? servicio.imagenes : (servicio.imagen_url || servicio.imagen ? [servicio.imagen_url || servicio.imagen] : [])}
                    alt={servicio.nombre}
                    layout="carousel"
                    height="200px"
                  />
                  <Card.Body className="d-flex flex-column">
                    <Card.Title>{servicio.nombre}</Card.Title>
                    <Card.Text className="flex-grow-1">
                      {servicio.descripcion}
                    </Card.Text>
                    <div className="mb-2">
                      <span className="badge bg-success me-2">
                        {formatPrice(servicio.precio)}
                      </span>
                      <span className="text-warning">
                        {renderStars(servicio.valoracion)} ({servicio.numValoraciones})
                      </span>
                    </div>
                    <div className="d-flex gap-2">
                      <a
                        role="button"
                        className="af-btn af-btn-primary af-btn-sm"
                        onClick={() => { setServicioSeleccionado(servicio); setShowDetalle(true); }}
                      >
                        Ver Detalle
                      </a>
                      {/* El botón 'Agregar al Carrito' se muestra sólo dentro del modal, después de reservar fecha y hora. */}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          <Row className="mt-4">
            <Col className="text-center">
                <LinkContainer to="/servicios">
                  <a className="af-btn af-btn-outline-primary af-btn-lg">Ver Todos los Servicios</a>
                </LinkContainer>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Modal único reutilizable para detalle de servicio */}
      <ModalDetalleServicio
        show={showDetalle}
        onHide={() => { setShowDetalle(false); setServicioSeleccionado(null); }}
        servicio={servicioSeleccionado}
        onAddToCart={onAddToCart}
      />

      {/* Sección Nosotros (componente reutilizable) */}
      <Nosotros />

  {/* Formulario de Contacto */}
  <section id="contactanos" className="py-5">
        <Container>
          <h2 className="h4 mb-4">Contáctanos</h2>
          
          {/* Mensaje de alerta */}
          {contactAlert.show && (
            <Alert 
              variant={contactAlert.variant}
              onClose={() => setContactAlert({ show: false, variant: '', message: '' })}
              dismissible
              className="mb-4"
            >
              {contactAlert.message}
            </Alert>
          )}

          <Form onSubmit={handleContactSubmit}>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Control 
                  type="text" 
                  name="name"
                  placeholder="Nombre" 
                  value={contactForm.name}
                  onChange={handleContactChange}
                  required 
                  disabled={contactLoading}
                />
              </Col>
              <Col md={6}>
                <Form.Control 
                  type="email" 
                  name="email"
                  placeholder="Correo electrónico" 
                  value={contactForm.email}
                  onChange={handleContactChange}
                  required 
                  disabled={contactLoading}
                />
              </Col>
            </Row>
            <div className="mb-3">
              <Form.Control 
                as="textarea" 
                rows={4} 
                name="message"
                placeholder="Mensaje" 
                value={contactForm.message}
                onChange={handleContactChange}
                required 
                disabled={contactLoading}
              />
            </div>
            <button 
              type="submit" 
              className="af-btn af-btn-outline-primary af-btn-sm"
              disabled={contactLoading}
            >
              {contactLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Enviando...
                </>
              ) : (
                'Enviar Mensaje'
              )}
            </button>
          </Form>
        </Container>
      </section>
    </div>
  );
};

export default Home;
