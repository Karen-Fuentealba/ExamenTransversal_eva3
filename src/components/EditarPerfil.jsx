import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const UserProfileEdit = ({ triggerLabel = 'Editar datos personales', className = '', disabled = false }) => {
  const { user, updateProfile } = useAuth();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        nombre: user.nombre || user.name || '',
        apellidos: user.apellidos || user.last_name || '',
        email: user.email || ''
      });
    }
  }, [user, show]);

  if (!user) return null;

  const handleClose = () => {
    setShow(false);
    setMsg(null);
  };
  const handleShow = () => { if (!disabled) setShow(true); };

  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      
      const payload = {
        name: form.nombre,
        last_name: form.apellidos,
        email: form.email,
      };

      const res = await updateProfile(payload);
      if (res.success) {
        setMsg({ variant: 'success', text: 'Perfil actualizado correctamente' });
        
        setTimeout(() => {
          setLoading(false);
          setShow(false);
        }, 900);
      } else {
        setMsg({ variant: 'danger', text: res.error || 'Error al actualizar el perfil' });
        setLoading(false);
      }
    } catch (err) {
      console.error('Error actualizando perfil desde UI:', err);
      setMsg({ variant: 'danger', text: 'Error de conexión' });
      setLoading(false);
    }
  };

  return (
    <>
      {disabled ? (
        <button type="button" className={`text-white-50 text-decoration-none btn btn-link p-0 ${className}`} disabled title="Usuario bloqueado">
          {triggerLabel}
        </button>
      ) : (
        <button type="button" className={`text-white-50 text-decoration-none btn btn-link p-0 ${className}`} onClick={handleShow}>
          {triggerLabel}
        </button>
      )}

      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar mis datos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {msg && <Alert variant={msg.variant}>{msg.text}</Alert>}
          <Form onSubmit={onSubmit}>
            <Form.Group className="mb-2">
              <Form.Label>Nombre</Form.Label>
              <Form.Control name="nombre" value={form.nombre} onChange={onChange} required disabled={disabled} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Apellidos</Form.Label>
              <Form.Control name="apellidos" value={form.apellidos} onChange={onChange} required disabled={disabled} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Email</Form.Label>
              <Form.Control name="email" type="email" value={form.email} onChange={onChange} required disabled={disabled} />
            </Form.Group>
            {/* Teléfono eliminado: no existe campo en la base de datos */}

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={handleClose} className="me-2" disabled={disabled}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={loading || disabled}>{loading ? 'Guardando...' : 'Guardar cambios'}</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default UserProfileEdit;
