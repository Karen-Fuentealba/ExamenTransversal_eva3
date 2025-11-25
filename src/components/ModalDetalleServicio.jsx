// ModalDetalleServicio - Modal con información detallada del servicio seleccionado
import React from 'react';
import { Modal, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import AvailableTimeSlots from './AvailableTimeSlots';
import MultiImageDisplay from './MultiImageDisplay';

/**
 * ModalDetalleServicio
 * Muestra un modal con los detalles de un servicio y permite agregarlo al carrito.
 *
 * Props:
 * - show: boolean que controla la visibilidad
 * - onHide: callback para cerrar el modal
 * - servicio: objeto con datos del servicio (nombre, descripcion, imagen, precio, etc.)
 * - onAddToCart: callback(servicio) para añadir el servicio al carrito
 *
 * Notas:
 * - El componente es principalmente presentacional. isAuthenticated se usa para
 *   determinar si el usuario puede añadir al carrito.
 */
const ModalDetalleServicio = ({ show, onHide, servicio, onAddToCart }) => {
  const { isAuthenticated } = useAuth();

  const handleReservationComplete = (reservation, cartData) => {
    // Notificar al componente padre que se añadió al carrito
    if (onAddToCart) {
      const payload = cartData && typeof cartData === 'object' ? { ...servicio, ...cartData } : { ...servicio };
      onAddToCart(payload);
    }
    // Cerrar el modal después de una reserva exitosa
    onHide();
  };

  if (!servicio) return null; // No renderizamos si no hay datos


  // Renderiza estrellas según la puntuación (valoración)
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

  // Formatea precio a CLP
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Detalle del Servicio</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            {servicio.imagenes && servicio.imagenes.length ? (
              <MultiImageDisplay
                imageUrls={servicio.imagenes}
                alt={servicio.nombre}
                layout="carousel"
                height="300px"
              />
            ) : (
              <img
                src={servicio.imagen || servicio.imagen_url}
                className="img-fluid rounded"
                alt={servicio.nombre}
                onError={(e) => {
                  e.target.src = 'https://picsum.photos/400x300?text=Imagen+No+Disponible';
                }}
              />
            )}
          </Col>
          <Col md={6}>
            <h4>{servicio.nombre}</h4>
            <p>{servicio.descripcion}</p>
            
            <ul>
              {servicio.detalles && servicio.detalles.map((detalle, index) => (
                <li key={index}>{detalle}</li>
              ))}
            </ul>
            
            <div className="mb-3">
              <span className="badge bg-success me-2">
                {formatPrice(servicio.precio)}
              </span>
              <span className="text-warning">
                {renderStars(servicio.valoracion)} ({servicio.numValoraciones})
              </span>
            </div>

            {/* Información del proveedor */}
            <div className="proveedor-info">
              <strong>Proveedor:</strong> {servicio.proveedor}<br/>
              <strong>Disponibilidad:</strong> {servicio.disponibilidad}<br/>
              <strong>Categoría:</strong> {servicio.categoria}
            </div>
            
            {/* Mostrar mensaje si no está autenticado */}
            {!isAuthenticated() && (
              <div className="alert alert-info mt-3">
                <small>Inicia sesión para reservar servicios</small>
              </div>
            )}
          </Col>
        </Row>

        {/* Sección de horarios disponibles - siempre visible para usuarios autenticados */}
        {isAuthenticated() && (
          <>
            <hr className="my-4" />
            <AvailableTimeSlots 
              service={servicio} 
              onReservationComplete={handleReservationComplete}
            />
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default ModalDetalleServicio;
