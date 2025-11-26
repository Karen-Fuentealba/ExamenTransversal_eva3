import React, { useState, useEffect } from 'react';
import { Table, Spinner } from 'react-bootstrap';

const AdminServices = ({
  filteredServicios = [],
  searchServicios = '',
  setSearchServicios = () => {},
  handleCreateService = () => {},
  handleEditService = () => {},
  handleDeleteService = () => {},
  categoriasServicios = [],
  formatPrice = (p) => p,
  loading = false
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <section className="admin-section">
      {loading && (
        <div className="text-center mb-3"><Spinner animation="border" /></div>
      )}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <h2 className="h4 mb-0">Gestión de Servicios</h2>
          <div>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Buscar servicio por nombre..."
              value={searchServicios}
              onChange={(e) => setSearchServicios(e.target.value)}
              style={{ minWidth: '220px' }}
            />
          </div>
        </div>
        <button type="button" className="af-btn af-btn-primary btn-admin" onClick={handleCreateService}>
          <i className="bi bi-plus-circle"></i> Nuevo Servicio
        </button>
      </div>

      {/* Card list for mobile */}
      {isMobile ? (
        <div className="admin-card-list">
          {filteredServicios.length > 0 ? filteredServicios.map((servicio, sidx) => (
            <div className="admin-card" key={servicio.id ?? `serv-${sidx}`}>
              <div className="card-row">
                <div className="card-left">
                  <strong>{servicio.nombre || servicio.name}</strong>
                  <div className="meta">{(servicio.descripcion || servicio.description || '').substring(0, 120)}</div>
                  <div className="meta">{servicio.categoria || 'Sin categoría'}</div>
                </div>
                <div className="card-right">
                  <div>{formatPrice(servicio.precio ?? servicio.price ?? servicio.precio)}</div>
                  <div className="d-flex gap-1">
                    <button
                      type="button"
                      className="af-btn af-btn-outline-primary af-btn-sm"
                      onClick={() => handleEditService(servicio)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button
                      type="button"
                      className="af-btn af-btn-outline-danger af-btn-sm"
                      onClick={() => handleDeleteService(servicio.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center text-muted py-4">No hay servicios registrados</div>
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Disponibilidad</th>
                <th className="hide-mobile-col">Proveedor</th>
                <th className="hide-mobile-col">Descripción</th>
                <th className="hide-mobile-col">Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredServicios.length > 0 ? filteredServicios.map((servicio, sidx) => {
              const catId = servicio.service_category_id ?? servicio.service_category_id;
              const resolvedCat = categoriasServicios && categoriasServicios.length
                ? (categoriasServicios.find(c => String(c.id) === String(catId)) || categoriasServicios.find(c => (c.name || c.nombre) === servicio.categoria))
                : null;
              const categoriaName = resolvedCat ? (resolvedCat.name || resolvedCat.nombre || resolvedCat.category) : (servicio.categoria || 'Sin categoría');

              return (
                <tr key={servicio.id ?? `serv-${sidx}`}>
                  <td>
                    <div>
                      <strong>{servicio.nombre || servicio.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-secondary">{categoriaName}</span>
                  </td>
                  <td>{formatPrice(servicio.precio ?? servicio.price ?? servicio.precio)}</td>
                  <td>{servicio.disponibilidad ?? servicio.availability}</td>
                  <td className="hide-mobile-col">{servicio.proveedor ?? servicio.provider}</td>
                  <td className="hide-mobile-col">
                    <small className="text-muted">{(servicio.descripcion || servicio.description || '').substring(0, 120)}</small>
                  </td>
                  <td className="hide-mobile-col">
                    <span className="badge badge-aprobado">Activo</span>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        className="af-btn af-btn-outline-primary af-btn-sm"
                        onClick={() => handleEditService(servicio)}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        type="button"
                        className="af-btn af-btn-outline-danger af-btn-sm"
                        onClick={() => handleDeleteService(servicio.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="8" className="text-center text-muted py-4">
                  No hay servicios registrados
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
      )}
    </section>
  );
};

export default AdminServices;
