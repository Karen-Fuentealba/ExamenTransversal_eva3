import React from 'react';
import { Table, Form, Badge, Spinner } from 'react-bootstrap';

const AdminUsers = ({
  filteredUsuarios = [],
  searchUsuarios = '',
  setSearchUsuarios = () => {},
  amIAdmin = false,
  user = null,
  toggleUserState = async () => {},
  handleDeleteUser = async () => {},
  setShowModalUsuario = () => {},
  setFormUsuario = () => {},
  handleChangeUserRole = async () => {},
  loading = false
}) => {
  return (
    <section className="admin-section">
      {loading && (
        <div className="text-center mb-3"><Spinner animation="border" /></div>
      )}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <h2 className="h4 mb-0">Gestión de Usuarios</h2>
          <div>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Buscar usuario por nombre..."
              value={searchUsuarios}
              onChange={(e) => setSearchUsuarios(e.target.value)}
              style={{ minWidth: '220px' }}
            />
          </div>
        </div>
        <button type="button" className="af-btn af-btn-primary btn-admin" onClick={() => { setShowModalUsuario(true); setFormUsuario({ nombre:'', apellidos:'', email:'', password:'', rol:'cliente' }); }}>
          <i className="bi bi-plus-circle"></i> Nuevo Usuario
        </button>
      </div>

      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Fecha Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.length > 0 ? filteredUsuarios.map((usuario, uidx) => (
              <tr key={usuario.id ?? `user-${uidx}`}>
                <td>{usuario.id}</td>
                <td>
                  <strong>{usuario.nombre || usuario.name} {usuario.apellidos || usuario.last_name}</strong>
                </td>
                <td>{usuario.email}</td>
                <td>
                  {amIAdmin ? (
                    <Form.Select
                      value={(usuario.role_id ?? usuario.rol_id ?? (usuario.rol === 'admin' ? 2 : 1))}
                      onChange={async (e) => {
                        const newRole = Number(e.target.value);
                        if (!amIAdmin) return;
                        // Delegate actual role change to parent handler
                        await handleChangeUserRole(usuario, newRole);
                      }}
                    >
                      <option value={1}>Cliente</option>
                      <option value={2}>Administrador</option>
                    </Form.Select>
                  ) : (
                    <Badge bg={(usuario.role_id === 2 || usuario.rol_id === 2 || usuario.rol === 'admin') ? 'danger' : 'primary'}>
                      {(usuario.role_id === 2 || usuario.rol_id === 2 || usuario.rol === 'admin') ? 'Administrador' : 'Cliente'}
                    </Badge>
                  )}
                </td>
                <td>
                  { (usuario.state === false || String(usuario.state) === 'false') ? (
                    <Badge bg="danger">Inactivo</Badge>
                  ) : (
                    <Badge bg="success">Activo</Badge>
                  ) }
                </td>

                <td>{usuario.creado_en || usuario.fechaRegistro}</td>
                <td>
                  {amIAdmin && (
                    <div className="d-flex gap-2 align-items-center">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id={`user-state-${usuario.id}`}
                          checked={!(usuario.state === false || String(usuario.state) === 'false')}
                          disabled={user && user.id === usuario.id}
                          onChange={async (e) => {
                            const newState = e.target.checked;
                            await toggleUserState(usuario.id, newState);
                          }}
                          title={user && user.id === usuario.id ? 'No puedes cambiar el estado de tu propia cuenta desde aquí' : (usuario.state === false || String(usuario.state) === 'false' ? 'Desbloquear usuario' : 'Bloquear usuario')}
                        />
                        <label className="form-check-label" htmlFor={`user-state-${usuario.id}`}>{(usuario.state === false || String(usuario.state) === 'false') ? 'Inactivo' : 'Activo'}</label>
                      </div>

                      {usuario.id !== user.id && (
                        <button
                          type="button"
                          className="af-btn af-btn-outline-danger af-btn-sm"
                          onClick={() => handleDeleteUser(usuario.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">
                  No hay usuarios registrados
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

export default AdminUsers;
