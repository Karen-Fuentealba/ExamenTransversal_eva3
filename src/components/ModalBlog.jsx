// ModalBlog - modal para ver detalle de un post y agregar comentarios
import React from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

/**
 * ModalBlog
 * Muestra el detalle de un blog post en un modal y permite agregar comentarios
 * si el usuario está autenticado.
 *
 * Props:
 * - show: boolean para mostrar/ocultar el modal
 * - onHide: callback para cerrar el modal
 * - blog: objeto con datos del post (titulo, autor, fecha, contenido, imagenes, comentarios)
 * - onAddComment: callback(idBlog, comentario) para añadir un comentario
 */
const ModalBlog = ({ show, onHide, blog, onAddComment }) => {
  const { isAuthenticated, user } = useAuth();
  const [comentario, setComentario] = React.useState('');

  const canComment = isAuthenticated() && user && Number(user.role_id || user.rol_id || (user.rol === 'admin' ? 2 : 1)) === 1;

  // Imagen por defecto si no hay imagen disponible
  const placeholderImg = 'https://picsum.photos/600x250?text=Imagen+No+Disponible';
  const safeImageSrc = (b) => {
    if (!b) return placeholderImg;

    // Si es array de imágenes (nuevo campo [image])
    if (Array.isArray(b.imagen) && b.imagen.length > 0) {
      const firstImage = b.imagen[0];
      if (firstImage.path) {
        return firstImage.path.startsWith('http') ? firstImage.path : `https://x8ki-letl-twmt.n7.xano.io${firstImage.path}`;
      }
      return firstImage.url || firstImage.path || placeholderImg;
    }

    // Solo usar el campo imagen
    const cand = (b.imagen || '').toString().trim();
    return cand && cand.length ? cand : placeholderImg;
  };

  if (!blog) return null; // Sin datos no renderizamos

  const handleAddComment = () => {
    if (comentario.trim() && canComment) {
      // Pass plain text to the parent handler which will create the payload
      onAddComment(blog.id, comentario.trim());
      setComentario('');
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Detalle del Blog</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <img
          src={safeImageSrc(blog)}
          className="img-fluid mb-3 blog-img-fixed"
          alt={blog.titulo}
          onError={(e) => {
            // Evitar bucles conjuntos y fallback a imagen placeholder
            try { e.target.onerror = null; } catch (err) { void err; }
            e.target.src = placeholderImg;
          }}
        />
        <h4>{blog.titulo}</h4>
        {(blog.subtitulos || blog.subtitle) && (
          <h6 className="text-muted mb-2">{blog.subtitulos || blog.subtitle}</h6>
        )}
        <p className="text-muted">Por: {blog.autor} - {blog.fecha}</p>
        
        <div className="mb-3">
          <strong>Descripción detallada:</strong>
          <p className="mb-0">{blog.contenido}</p>
        </div>
        
        <hr />
        
        <h6>Comentarios ({blog.comentarios ? blog.comentarios.length : 0})</h6>
        
        <ul className="list-group mb-2">
          {blog.comentarios && blog.comentarios.map((comentario) => (
            <li key={comentario.id} className="list-group-item">
              <strong>{comentario.autor}</strong>
              <small className="text-muted ms-2">- {comentario.fecha}</small>
              <p className="mb-0 mt-1">{comentario.comentario}</p>
            </li>
          ))}
          {(!blog.comentarios || blog.comentarios.length === 0) && (
            <li className="list-group-item text-muted">
              No hay comentarios aún. ¡Sé el primero en comentar!
            </li>
          )}
        </ul>
        
        <InputGroup>
          <Form.Control 
            type="text" 
            placeholder={isAuthenticated() ? "Escribe un comentario..." : "Inicia sesión para comentar"}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            disabled={!canComment}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddComment();
              }
            }}
          />
          <Button 
            variant="primary"
            onClick={handleAddComment}
            disabled={!canComment || !comentario.trim()}
          >
            Comentar
          </Button>
        </InputGroup>
        
        {!isAuthenticated() && (
          <small className="text-muted d-block mt-2">
            Inicia sesión para poder comentar en los blogs
          </small>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default ModalBlog;
