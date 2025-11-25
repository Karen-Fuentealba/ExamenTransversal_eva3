import React, { useState, useEffect } from 'react';
import { Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { scheduleAPI } from '../services/servicios';
import { carritoAPI } from '../services/carritoCompra';
import { useAuth } from '../context/AuthContext';

const AvailableTimeSlots = ({ service, onReservationComplete }) => {
  const { user, isBlocked, canInteract } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [reservingSlotId, setReservingSlotId] = useState(null);
  const [addingToCartSlotId, setAddingToCartSlotId] = useState(null);
  const [reservedSlots, setReservedSlots] = useState([]); // Slots reservados pero no agregados al carrito

  // Cargar horarios disponibles
  useEffect(() => {
    if (service?.id) {
      loadAvailableSlots();
    }
  }, [service?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAvailableSlots = async () => {
    if (!service?.id) return;
    
    try {
      setLoading(true);
      const slots = await scheduleAPI.getAvailableTimeSlots(service.id);
      setAvailableSlots(slots || []);
    } catch (err) {
      console.error('Error loading available slots:', err);
      setMessage({ variant: 'danger', text: 'Error al cargar los horarios disponibles.' });
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar horarios por fecha
  const groupSlotsByDate = (slots) => {
    const grouped = {};
    slots.forEach(slot => {
      const date = slot.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(slot);
    });
    
    // Ordenar fechas y horarios dentro de cada fecha
    const sortedDates = Object.keys(grouped).sort();
    const result = {};
    sortedDates.forEach(date => {
      result[date] = grouped[date].sort((a, b) => 
        (a.start_time || '').localeCompare(b.start_time || '')
      );
    });
    
    return result;
  };

  // Reservar horario (sin agregar al carrito)
  const handleReserveSlot = async (slot) => {
    if (!user?.id) {
      setMessage({ variant: 'warning', text: 'Debes iniciar sesión para reservar un horario.' });
      return;
    }

    // Evitar que usuarios bloqueados realicen reservas
    if (isBlocked || (canInteract && !canInteract())) {
      setMessage({ variant: 'warning', text: 'No puedes realizar esta acción. Contacta al administrador.' });
      return;
    }

    try {
      setReservingSlotId(slot.id);
      setMessage(null);
      
      // Crear la reserva
      const reservationData = {
        service_id: service.id,
        user_id: user.id,
        time_slot_id: slot.id,
        status: 'pendiente',
        notes: ''
      };
      
      const reservation = await scheduleAPI.createReservation(reservationData);
      
      setMessage({ 
        variant: 'success', 
        text: `Horario reservado exitosamente para el ${new Date(slot.date).toLocaleDateString('es-ES')} de ${slot.start_time} a ${slot.end_time}` 
      });
      
      // Agregar a slots reservados y quitar de disponibles
      setReservedSlots(prev => [...prev, { ...slot, reservation }]);
      setAvailableSlots(prev => prev.filter(s => s.id !== slot.id));
      
      // Notificar al componente padre
      if (onReservationComplete) {
        onReservationComplete(reservation, null);
      }
      
    } catch (err) {
      console.error('Error reserving slot:', err);
      setMessage({ 
        variant: 'danger', 
        text: err.message || 'Error al reservar el horario. Inténtalo de nuevo.' 
      });
    } finally {
      setReservingSlotId(null);
    }
  };

  // Agregar horario reservado al carrito
  const handleAddToCart = async (slot) => {
    try {
      setAddingToCartSlotId(slot.id);
      setMessage(null);
      // Evitar que usuarios bloqueados agreguen al carrito
      if (!user?.id) {
        setMessage({ variant: 'warning', text: 'Debes iniciar sesión para agregar al carrito.' });
        setAddingToCartSlotId(null);
        return;
      }

      if (isBlocked || (canInteract && !canInteract())) {
        setMessage({ variant: 'warning', text: 'No puedes realizar esta acción. Contacta al administrador.' });
        setAddingToCartSlotId(null);
        return;
      }
      
      // Añadir al carrito
      const cartData = {
        user_id: user.id,
        service_id: service.id,
        service_name: service.nombre || service.name || 'Servicio',
        time_slot_id: slot.id,
        reservation_date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        quantity: 1,
        unit_price: service.precio || service.price || 0,
        provider: service.proveedor || service.provider || 'Proveedor'
      };
      
      await carritoAPI.addToCart(cartData);
      
      setMessage({ 
        variant: 'success', 
        text: `Servicio agregado al carrito para el ${new Date(slot.date).toLocaleDateString('es-ES')} de ${slot.start_time} a ${slot.end_time}` 
      });
      
      // Quitar de slots reservados (ya está en el carrito)
      setReservedSlots(prev => prev.filter(s => s.id !== slot.id));
      
    } catch (err) {
      console.error('Error adding to cart:', err);
      setMessage({ 
        variant: 'danger', 
        text: err.message || 'Error al agregar al carrito. Inténtalo de nuevo.' 
      });
    } finally {
      setAddingToCartSlotId(null);
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (!service) {
    return (
      <Alert variant="info">
        Selecciona un servicio para ver los horarios disponibles.
      </Alert>
    );
  }

  const groupedSlots = groupSlotsByDate(availableSlots);
  const groupedReservedSlots = groupSlotsByDate(reservedSlots);

  return (
    <div>
      <h5 className="mb-3">Horarios Disponibles</h5>
        {message && (
          <Alert variant={message.variant} onClose={() => setMessage(null)} dismissible>
            {message.text}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" />
            <div className="mt-2">Cargando horarios disponibles...</div>
          </div>
        ) : (
          <div>
            {/* Horarios Disponibles */}
            {Object.keys(groupedSlots).length > 0 && (
              <div>
                <h6 className="text-success mb-3">Disponibles para Reservar</h6>
                {Object.entries(groupedSlots).map(([date, slots]) => (
                  <div key={date} className="mb-4">
                    <h6 className="mb-3 text-primary border-bottom pb-2">{formatDate(date)}</h6>
                    <Row>
                      {slots.map((slot) => (
                        <Col md={6} lg={4} key={slot.id} className="mb-3">
                          <div className="border rounded p-3 h-100 d-flex flex-column">
                            <div className="mb-3">
                              <strong>{slot.start_time} - {slot.end_time}</strong>
                            </div>
                            <div className="mt-auto">
                              <Button
                                variant="primary"
                                size="sm"
                                className="w-100"
                                onClick={() => handleReserveSlot(slot)}
                                disabled={isBlocked || reservingSlotId === slot.id}
                              >
                                {reservingSlotId === slot.id ? (
                                  <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Reservando...
                                  </>
                                ) : (
                                  'Reservar'
                                )}
                              </Button>
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))}
              </div>
            )}

            {/* Horarios Reservados */}
            {Object.keys(groupedReservedSlots).length > 0 && (
              <div>
                <h6 className="text-warning mb-3">🛒 Reservados - Listos para Agregar al Carrito</h6>
                {Object.entries(groupedReservedSlots).map(([date, slots]) => (
                  <div key={date} className="mb-4">
                    <h6 className="mb-3 text-primary border-bottom pb-2">{formatDate(date)}</h6>
                    <Row>
                      {slots.map((slot) => (
                        <Col md={6} lg={4} key={slot.id} className="mb-3">
                          <div className="border rounded p-3 h-100 d-flex flex-column bg-light">
                            <div className="mb-3">
                              <strong>{slot.start_time} - {slot.end_time}</strong>
                              <br />
                              <small className="text-success">✅ Reservado</small>
                            </div>
                            <div className="mt-auto">
                              <Button
                                variant="success"
                                size="sm"
                                className="w-100"
                                onClick={() => handleAddToCart(slot)}
                                disabled={isBlocked || addingToCartSlotId === slot.id}
                              >
                                {addingToCartSlotId === slot.id ? (
                                  <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Agregando...
                                  </>
                                ) : (
                                  'Agregar al Carrito'
                                )}
                              </Button>
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))}
              </div>
            )}

            {/* Mensaje cuando no hay horarios */}
            {Object.keys(groupedSlots).length === 0 && Object.keys(groupedReservedSlots).length === 0 && (
              <Alert variant="info">
                No hay horarios disponibles para este servicio en este momento.
              </Alert>
            )}
          </div>
        )}
    </div>
  );
};

export default AvailableTimeSlots;