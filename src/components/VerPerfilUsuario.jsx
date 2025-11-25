import React, { useState } from 'react';
import { Modal, Button, ListGroup } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const UserProfileView = ({ triggerLabel = 'Ver datos personales', className = '' }) => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  if (!user) return null;

  return (
    <>
      <button type="button" className={`text-white-50 text-decoration-none btn btn-link p-0 ${className}`} onClick={handleShow}>
        {triggerLabel}
      </button>

      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Mis datos personales</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup variant="flush">
            <ListGroup.Item><strong>ID:</strong> {user.id}</ListGroup.Item>
            <ListGroup.Item><strong>Nombre:</strong> {user.nombre || user.name}</ListGroup.Item>
            <ListGroup.Item><strong>Apellidos:</strong> {user.apellidos || user.last_name}</ListGroup.Item>
            <ListGroup.Item><strong>Email:</strong> {user.email}</ListGroup.Item>
            <ListGroup.Item><strong>Rol:</strong> {(user.role_id === 2 || user.rol_id === 2 || user.rol === 'admin') ? 'Administrador' : 'Cliente'}</ListGroup.Item>
            <ListGroup.Item><strong>Estado:</strong> {(user.state === false || String(user.state) === 'false') ? 'Inactivo' : 'Activo'}</ListGroup.Item>
            <ListGroup.Item><strong>Registrado:</strong> {user.creado_en || user.fechaRegistro}</ListGroup.Item>
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default UserProfileView;
