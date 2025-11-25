import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Spinner, Alert, Table, Modal } from 'react-bootstrap';
import { scheduleAPI } from '../services/servicios';
import { useAuth } from '../context/AuthContext';

const AdminScheduleEditor = ({ serviceId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [slots, setSlots] = useState([]);
  
  // Función para obtener fecha local en formato YYYY-MM-DD
  const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [newSlotDate, setNewSlotDate] = useState(getLocalDateString());
  const [newSlotStart, setNewSlotStart] = useState('09:00');
  const [newSlotEnd, setNewSlotEnd] = useState('17:00');
  const [editingSlot, setEditingSlot] = useState(null);

  // Cargar franjas del servicio
  const loadSlots = async () => {
    if (!serviceId) return;
    try {
      setLoading(true);
      const data = await scheduleAPI.getTimeSlots(serviceId);
      // Ordenar por fecha y hora
      const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
      setSlots(sorted);
    } catch (err) {
      console.error('Error loading slots:', err);
      setMessage({ variant: 'danger', text: 'Error al cargar las franjas horarias.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [serviceId]); 

  useEffect(() => {
  
    if (serviceId) {
      setMessage(null);
      setEditingSlot(null);
    }
  }, [serviceId]);

  // Crear nueva franja
  const handleCreateSlot = async () => {
    if (!serviceId || !newSlotDate || !newSlotStart || !newSlotEnd) {
      setMessage({ variant: 'warning', text: 'Completa todos los campos para crear la franja.' });
      return;
    }
    
    if (newSlotStart >= newSlotEnd) {
      setMessage({ variant: 'warning', text: 'La hora de inicio debe ser menor que la hora de fin.' });
      return;
    }
    
    try {
      setLoading(true);
      
      console.log(' Creating slot with date:', newSlotDate, 'Selected date input value:', newSlotDate);
      
      const payload = {
        service_id: parseInt(serviceId),
        date: newSlotDate, // Enviar exactamente como está en el input
        start_time: newSlotStart,
        end_time: newSlotEnd,
        created_by: user?.id || 1
      };
      
      console.log(' Payload being sent:', payload);
      
      await scheduleAPI.createTimeSlot(payload);
      setMessage({ variant: 'success', text: 'Franja creada exitosamente.' });
      
      // Resetear formulario
      setNewSlotStart('09:00');
      setNewSlotEnd('17:00');
      
      // Recargar franjas
      await loadSlots();
    } catch (err) {
      console.error('Error creating slot:', err);
      setMessage({ variant: 'danger', text: err.message || 'Error al crear la franja.' });
    } finally {
      setLoading(false);
    }
  };

  // Eliminar franja
  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta franja?')) return;
    
    try {
      setLoading(true);
      await scheduleAPI.deleteTimeSlot(slotId);
      setMessage({ variant: 'success', text: 'Franja eliminada exitosamente.' });
      await loadSlots();
    } catch (err) {
      console.error('Error deleting slot:', err);
      setMessage({ variant: 'danger', text: 'Error al eliminar la franja.' });
    } finally {
      setLoading(false);
    }
  };

  // Iniciar edición
  const handleEditSlot = (slot) => {
    // Asegurar que la fecha se mantenga en formato YYYY-MM-DD
    let editDate = slot.date;
    if (editDate && editDate.includes('T')) {
      editDate = editDate.split('T')[0]; // Tomar solo la parte de fecha
    }
    
    setEditingSlot({
      ...slot,
      editDate: editDate,
      editStart: slot.start_time,
      editEnd: slot.end_time
    });
  };

  // Cancelar edición
  const handleCancelEdit = () => setEditingSlot(null);

  // Guardar edición
  const handleSaveEdit = async () => {
    if (!editingSlot?.id) return;
    
    if (editingSlot.editStart >= editingSlot.editEnd) {
      setMessage({ variant: 'warning', text: 'La hora de inicio debe ser menor que la hora de fin.' });
      return;
    }
    
    try {
      setLoading(true);
      const payload = {
        date: editingSlot.editDate,
        start_time: editingSlot.editStart,
        end_time: editingSlot.editEnd,
        service_id: parseInt(serviceId)
      };
      
      await scheduleAPI.updateTimeSlot(editingSlot.id, payload);
      setMessage({ variant: 'success', text: 'Franja actualizada exitosamente.' });
      setEditingSlot(null);
      await loadSlots();
    } catch (err) {
      console.error('Error updating slot:', err);
      setMessage({ variant: 'danger', text: err.message || 'Error al actualizar la franja.' });
    } finally {
      setLoading(false);
    }
  };

  if (!serviceId) {
    return (
      <Card>
        <Card.Body>
          <Alert variant="info">
            <div className="d-flex align-items-center">
              <i className="fas fa-info-circle me-2"></i>
              <div>
                <strong>Gestión de Horarios</strong>
                <br />
                <small>Guarda el servicio primero para poder gestionar sus horarios disponibles.</small>
              </div>
            </div>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <h6 className="mb-0">Gestión de Franjas Horarias</h6>
      </Card.Header>
      <Card.Body>
        {message && (
          <Alert variant={message.variant} onClose={() => setMessage(null)} dismissible>
            {message.text}
          </Alert>
        )}

        {/* Formulario para agregar nueva franja */}
        <div className="mb-4">
          <h6 className="mb-3">Agregar Nueva Franja</h6>
          <Row>
            <Col md={4}>
              <div className="mb-3">
                <label className="form-label">Fecha</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={newSlotDate} 
                  onChange={e => setNewSlotDate(e.target.value)} 
                />
              </div>
            </Col>
            <Col md={3}>
              <div className="mb-3">
                <label className="form-label">Hora inicio</label>
                <input 
                  type="time" 
                  className="form-control" 
                  value={newSlotStart} 
                  onChange={e => setNewSlotStart(e.target.value)} 
                />
              </div>
            </Col>
            <Col md={3}>
              <div className="mb-3">
                <label className="form-label">Hora fin</label>
                <input 
                  type="time" 
                  className="form-control" 
                  value={newSlotEnd} 
                  onChange={e => setNewSlotEnd(e.target.value)} 
                />
              </div>
            </Col>
            <Col md={2}>
              <div className="mb-3">
                <label className="form-label">&nbsp;</label>
                <Button 
                  variant="primary" 
                  className="w-100"
                  onClick={handleCreateSlot}
                  disabled={loading}
                >
                  {loading ? 'Creando...' : 'Agregar Franja'}
                </Button>
              </div>
            </Col>
          </Row>
        </div>

        {/* Lista de franjas */}
        <h6>Todas las Franjas ({slots.length})</h6>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" />
            <div className="mt-2">Cargando franjas...</div>
          </div>
        ) : slots.length === 0 ? (
          <Alert variant="info">No hay franjas creadas para este servicio.</Alert>
        ) : (
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {slots.map(slot => {
                const id = slot.id;
                
                // Función para formatear fecha sin problemas de zona horaria
                const formatDateSafe = (dateString) => {
                  if (!dateString) return 'Sin fecha';
                  
                  try {
                    // Si la fecha está en formato YYYY-MM-DD, parsearla directamente
                    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                      const [year, month, day] = dateString.split('-');
                      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('es-ES');
                    }
                    
                    // Si está en otro formato, usar parsing normal
                    return new Date(dateString).toLocaleDateString('es-ES');
                  } catch {
                    return dateString; // Devolver la fecha original si hay error
                  }
                };
                
                const date = formatDateSafe(slot.date);
                
                return (
                  <tr key={id}>
                    <td>{date}</td>
                    <td>{slot.start_time || '--'}</td>
                    <td>{slot.end_time || '--'}</td>
                    <td>
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        className="me-2" 
                        onClick={() => handleEditSlot(slot)}
                        disabled={loading}
                      >
                        Editar
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        onClick={() => handleDeleteSlot(id)}
                        disabled={loading}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card.Body>

      {/* Modal para editar franja */}
      <Modal show={!!editingSlot} onHide={handleCancelEdit}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Franja</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingSlot && (
            <>
              <div className="mb-3">
                <label className="form-label">Fecha</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={editingSlot.editDate || ''} 
                  onChange={e => setEditingSlot(prev => ({ ...prev, editDate: e.target.value }))} 
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Hora inicio</label>
                <input 
                  type="time" 
                  className="form-control" 
                  value={editingSlot.editStart || ''} 
                  onChange={e => setEditingSlot(prev => ({ ...prev, editStart: e.target.value }))} 
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Hora fin</label>
                <input 
                  type="time" 
                  className="form-control" 
                  value={editingSlot.editEnd || ''} 
                  onChange={e => setEditingSlot(prev => ({ ...prev, editEnd: e.target.value }))} 
                />
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelEdit}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSaveEdit} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default AdminScheduleEditor;


