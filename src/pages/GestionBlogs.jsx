import React from 'react';
import { Table, Badge } from 'react-bootstrap';

const AdminBlogs = ({
  filteredBlogs = [],
  searchBlogs = '',
  setSearchBlogs = () => {},
  handleCreateBlog = () => {},
  handleEditBlog = () => {},
  handleDeleteBlog = () => {},
  categoriasBlog = [],
  isAdmin = false
}) => {
  return (
    <section className="admin-section">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <h2 className="h4 mb-0">Gestión de Blogs</h2>
          <div>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Buscar blog por título..."
              value={searchBlogs}
              onChange={(e) => setSearchBlogs(e.target.value)}
              style={{ minWidth: '220px' }}
            />
          </div>
        </div>
        {isAdmin && (
          <button type="button" className="af-btn af-btn-primary btn-admin" onClick={handleCreateBlog}>
            <i className="bi bi-plus-circle"></i> Nuevo Blog
          </button>
        )}
      </div>

      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Título</th>
              <th>Subtítulo</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th>Fecha de Publicación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredBlogs.length > 0 ? filteredBlogs.map((blog, bidx) => (
              <tr key={blog.id ?? `blog-${bidx}`}>
                <td>
                  <strong>{blog.titulo || blog.title}</strong>
                </td>
                <td>
                  <small className="text-muted">{blog.subtitulos || ''}</small>
                </td>
                <td>
                  <small className="text-muted">{blog.contenido ? `${String(blog.contenido).substring(0, 200)}` : ''}</small>
                </td>
                <td>
                  {(() => {
                    const catId = blog.blog_category_id ?? blog.blogCategoryId ?? null;
                    const catObj = categoriasBlog && categoriasBlog.find(c => Number(c.id) === Number(catId));
                    return <Badge bg="info">{catObj ? catObj.name : (blog.categoria || 'Sin categoría')}</Badge>;
                  })()}
                </td>
                <td>{blog.publication_date || blog.fecha_publicacion || blog.fecha}</td>
                <td>
                  <span className="badge badge-aprobado" style={{ backgroundColor: ((blog.estado || blog.status || '') + '').toLowerCase().includes('active') || ((blog.estado || '') + '').toLowerCase().includes('public') ? '#198754' : undefined }}>
                    {(blog.estado || blog.status || 'Activo')}
                  </span>
                </td>
                <td>
                  {isAdmin ? (
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        className="af-btn af-btn-outline-primary af-btn-sm"
                        onClick={() => handleEditBlog(blog)}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        type="button"
                        className="af-btn af-btn-outline-danger af-btn-sm"
                        onClick={() => handleDeleteBlog(blog.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  ) : (
                    <small className="text-muted">No permitido</small>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">
                  No hay blogs registrados
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

export default AdminBlogs;
