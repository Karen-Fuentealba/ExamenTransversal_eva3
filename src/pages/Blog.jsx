import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Alert, Badge, Spinner } from 'react-bootstrap';
// Convertidos los usos de PlainButton a elementos nativos con clases .af-btn
import { LinkContainer } from 'react-router-bootstrap';
import { blogsAPI, blogCommentsAPI, getBlogCategories } from '../services/blog';
import ModalBlog from '../components/ModalBlog';
import { useAuth } from '../context/AuthContext';
import MultiImageDisplay from '../components/MultiImageDisplay';

const Blog = () => {
  
  const [blogs, setBlogs] = useState([]);
  const [blogsFiltrados, setBlogsFiltrados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blogSeleccionado, setBlogSeleccionado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos');
  const { isAuthenticated, user, isAdmin } = useAuth();

  // Cargar blogs desde la API al iniciar (evitar doble invocación en StrictMode)
  const didLoadRef = useRef(false);
  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    cargarBlogs();
  }, []);

  const cargarBlogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar blogs y categorías en paralelo
      const [blogsResponse, categoriasResponse] = await Promise.all([
        blogsAPI.getAll(false), // Solo blogs aprobados para la vista pública
        getBlogCategories()
      ]);
      
      // Construir un mapa de blog_category id -> name cuando la API devuelve objetos
      const categoryMap = {};
      if (Array.isArray(categoriasResponse)) {
        categoriasResponse.forEach((c, idx) => {
          if (!c && c !== 0) return;
          if (typeof c === 'string') {
            // no hay id disponible, usar fallback basado en índice
            categoryMap[String(idx + 1)] = c;
          } else if (typeof c === 'number') {
            categoryMap[String(c)] = String(c);
          } else if (typeof c === 'object') {
            const id = c.id ?? c.blog_category_id ?? (idx + 1);
            const name = c.name || c.nombre || c.category || String(id);
            categoryMap[String(id)] = name;
          }
        });
      }

      // Función auxiliar para normalizar valores tipo categoría a un nombre a mostrar
      const normalize = (c) => {
        if (c === null || c === undefined) return '';
        if (typeof c === 'string') return c;
        if (typeof c === 'number' || typeof c === 'boolean') return String(c);
          if (typeof c === 'object') {
          if (c.name) return c.name;
          if (c.nombre) return c.nombre;
          if (c.category) return c.category;
          if (c.id !== undefined) return String(c.id);
          try { return JSON.stringify(c); } catch { return String(c); }
        }
        return String(c);
      };

      // Normalizar categorías en strings para la UI de filtros; preferir nombres del categoryMap
      const normalized = Array.isArray(categoriasResponse)
        ? [...new Set(categoriasResponse.map(c => (typeof c === 'object' ? (c.name || c.nombre || c.category || String(c.id || c.blog_category_id || '')) : String(c))).filter(Boolean))]
        : [];

      // Normalizar blogs: si un blog tiene blog_category_id usar categoryMap para obtener su nombre
      const normalizedBlogs = Array.isArray(blogsResponse)
        ? blogsResponse.map(b => {
            const categoriaFromId = b && (b.blog_category_id ?? b.blogCategoryId ?? b.blog_category);
            const resolved = categoriaFromId !== undefined && categoriaFromId !== null
              ? (categoryMap[String(categoriaFromId)] || normalize(b.categoria))
              : normalize(b.categoria);
            return { ...b, categoria: resolved };
          })
        : [];

  // Logging de muestra eliminado

  // Asegurar que 'Todos' esté presente como primera opción
  setCategorias(['Todos', ...normalized.filter(Boolean)]);
  setBlogs(normalizedBlogs);
  setBlogsFiltrados(normalizedBlogs);
    } catch (err) {
      console.error('Error al cargar blogs:', err);
      setError('Error al cargar los blogs. Intenta recargar la página.');
      
      // Fallback a datos locales si la API falla
      try {
        const blogsGuardados = JSON.parse(localStorage.getItem('blogs') || '[]');
        const blogsAprobados = blogsGuardados.filter(blog => blog.estado === 'aprobado');
        setBlogs(blogsAprobados);
        setBlogsFiltrados(blogsAprobados);
        
        // Sin categorías de API, mostrar solo "Todos"
        setCategorias(['Todos']);
      } catch (localError) {
        console.error('Error al cargar datos locales:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = (blog) => {
    setBlogSeleccionado(blog);
    setShowModal(true);
  };

  const handleFiltroCategoria = (categoria) => {
    setCategoriaFiltro(categoria);
    if (categoria === 'Todos') {
      setBlogsFiltrados(blogs);
    } else {
      setBlogsFiltrados(blogs.filter(blog => blog.categoria === categoria));
    }
  };

  const handleAddComment = async (blogId, commentText) => {
    // Solo los clientes (role_id === 1) pueden comentar
    if (!isAuthenticated() || !user) return;
    const roleId = user.role_id || user.rol_id || (user.rol === 'admin' ? 2 : 1);
    if (Number(roleId) !== 1) {
      // No es un cliente
      setError('Solo los clientes pueden comentar.');
      return;
    }

    const payload = {
      content: commentText,
      blog_id: blogId,
      user_id: user.id,
      date: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    try {
      setLoading(true);
      const created = await blogCommentsAPI.create(payload);

      // Normalizar respuesta a forma de comentario local
      const newComment = {
        id: created.id || created.comment_id || Date.now(),
        autor: `${user.nombre || user.name} ${user.apellidos || user.last_name || ''}`,
        comentario: created.content || created.comment || payload.content,
        fecha: created.date || payload.date
      };

      const nuevosBlogs = blogs.map(blog => 
        blog.id === blogId 
          ? { 
              ...blog, 
              comentarios: [...(blog.comentarios || []), newComment] 
            }
          : blog
      );

      setBlogs(nuevosBlogs);
      if (categoriaFiltro === 'Todos') {
        setBlogsFiltrados(nuevosBlogs);
      } else {
        setBlogsFiltrados(nuevosBlogs.filter(blog => blog.categoria === categoriaFiltro));
      }

      if (blogSeleccionado && blogSeleccionado.id === blogId) {
        setBlogSeleccionado(prev => ({
          ...prev,
          comentarios: [...(prev.comentarios || []), newComment]
        }));
      }
    } catch (err) {
      console.error('Error creando comentario:', err);
      setError('No se pudo crear el comentario. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: '120px' }}>
      <Container>
        {/* Mostrar loading */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Cargando blogs...</span>
            </Spinner>
            <p className="mt-2">Cargando blogs...</p>
          </div>
        )}

        {/* Mostrar error */}
        {error && (
            <Alert variant="danger" className="mb-4">
            <Alert.Heading>Error al cargar blogs</Alert.Heading>
            <p>{error}</p>
            <button className="af-btn af-btn-outline-danger" onClick={cargarBlogs}>Reintentar</button>
          </Alert>
        )}

        {/* Contenido principal */}
        {!loading && !error && (
          <>
            {/* Header con título y botón crear blog */}
            <Row className="mb-4">
              <Col md={8}>
                <h2 className="h4 mb-0">Blog Informativo</h2>
                <p className="text-muted">Descubre consejos, tendencias y experiencias de expertos en eventos</p>
              </Col>
              <Col md={4} className="text-end">
                {/* Botón de creación de blog eliminado: la creación se gestiona desde el panel Admin */}
              </Col>
            </Row>

        {/* Filtros por categoría */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="fw-bold me-2">Filtrar por categoría:</span>
              {categorias.map((categoria) => {
                const key = typeof categoria === 'string' ? categoria : String(categoria);
                return (
                  <Badge
                    key={key}
                    pill
                    bg={categoriaFiltro === categoria ? 'primary' : 'outline-secondary'}
                    text={categoriaFiltro === categoria ? 'white' : 'dark'}
                    style={{ 
                      cursor: 'pointer',
                      border: categoriaFiltro !== categoria ? '1px solid #6c757d' : 'none'
                    }}
                    onClick={() => handleFiltroCategoria(categoria)}
                    className={categoriaFiltro !== categoria ? 'text-dark' : ''}
                  >
                    {categoria}
                  </Badge>
                );
              })}
            </div>
          </Col>
        </Row>

        {!isAuthenticated() && (
          <Alert variant="info" className="mb-4">
            <i className="bi bi-info-circle me-2"></i>
            <strong>¡Únete a nuestra comunidad!</strong> Inicia sesión para comentar en los blogs o crear tus propios artículos informativos.
          </Alert>
        )}

        {/* Mostrar resultados del filtro */}
        {categoriaFiltro !== 'Todos' && (
          <Row className="mb-3">
            <Col>
              <Alert variant="light" className="d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-funnel me-2"></i>
                  Mostrando blogs de la categoría: <strong>{categoriaFiltro}</strong>
                  ({blogsFiltrados.length} resultado{blogsFiltrados.length !== 1 ? 's' : ''})
                </span>
                <button className="af-btn af-btn-outline-secondary af-btn-sm" onClick={() => handleFiltroCategoria('Todos')}>
                  <i className="bi bi-x"></i> Limpiar filtro
                </button>
              </Alert>
            </Col>
          </Row>
        )}

        <Row>
          {blogsFiltrados.map((blog) => (
            <Col md={4} key={blog.id} className="mb-4">
              <Card className="h-100">
                <MultiImageDisplay 
                  imageUrls={ (blog.imagenes && blog.imagenes.length) ? blog.imagenes : (blog.imagen_url || blog.imagen) }
                  alt={blog.titulo}
                  layout="carousel"
                  height="250px"
                />
                <Card.Body className="d-flex flex-column">
                  <div className="mb-2">
                    <Badge bg="secondary" className="me-2">
                      {blog.categoria}
                    </Badge>
                    <small className="text-muted">{blog.fecha}</small>
                  </div>
                  <Card.Title>{blog.titulo}</Card.Title>
                  {(blog.subtitulos || blog.subtitle) && (
                    <Card.Subtitle className="mb-2 text-muted">{blog.subtitulos || blog.subtitle}</Card.Subtitle>
                  )}
                  <Card.Text className="flex-grow-1">
                    {blog.resumen}
                  </Card.Text>
                  <p className="mb-1">
                    <small className="text-muted">
                      <i className="bi bi-person me-1"></i>
                      Por: {blog.autor}
                    </small>
                  </p>
                  
                  <button className="af-btn af-btn-outline-primary af-btn-sm mb-2" onClick={() => handleVerDetalle(blog)}>Leer más</button>
                  
                  <div className="mt-2">
                    <Form.Control 
                      type="text" 
                      className="form-control-sm comment-input" 
                      placeholder={isAuthenticated() ? "Escribe un comentario..." : "Inicia sesión para comentar"}
                      disabled={!isAuthenticated() || (user && Number(user.role_id || user.rol_id || (user.rol === 'admin' ? 2 : 1)) !== 1)}
                      onKeyPress={(e) => {
                        const canComment = isAuthenticated() && user && Number(user.role_id || user.rol_id || (user.rol === 'admin' ? 2 : 1)) === 1;
                        if (e.key === 'Enter' && canComment && e.target.value.trim()) {
                          handleAddComment(blog.id, e.target.value.trim());
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="d-flex justify-content-between align-items-center mt-1">
                      <button
                        type="button"
                        className="af-btn af-btn-primary af-btn-sm"
                        disabled={!isAuthenticated() || (user && Number(user.role_id || user.rol_id || (user.rol === 'admin' ? 2 : 1)) !== 1)}
                        onClick={(e) => {
                          const input = e.target.parentElement.parentElement.querySelector('.comment-input');
                          const canComment = isAuthenticated() && user && Number(user.role_id || user.rol_id || (user.rol === 'admin' ? 2 : 1)) === 1;
                          if (input && input.value.trim() && canComment) {
                            handleAddComment(blog.id, input.value.trim());
                            input.value = '';
                          }
                        }}
                      >
                        <i className="bi bi-chat me-1"></i>
                        Comentar
                      </button>
                      
                      {blog.comentarios && blog.comentarios.length > 0 && (
                        <small className="text-muted">
                          <i className="bi bi-chat-dots me-1"></i>
                          {blog.comentarios.length} comentario{blog.comentarios.length !== 1 ? 's' : ''}
                        </small>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {blogsFiltrados.length === 0 && (
          <div className="text-center py-5">
            <i className="bi bi-journal-x display-1 text-muted"></i>
            <h4 className="mt-3">No hay blogs en esta categoría</h4>
            <p className="text-muted">
              {categoriaFiltro !== 'Todos' 
                ? `No se encontraron blogs en la categoría "${categoriaFiltro}"`
                : 'No hay blogs disponibles'
              }
            </p>
            {categoriaFiltro !== 'Todos' && (
              <button className="af-btn af-btn-outline-primary" onClick={() => handleFiltroCategoria('Todos')}>Ver todos los blogs</button>
            )}
            {isAuthenticated() && isAdmin() && (
              <div className="mt-3">
                <LinkContainer to="/blog/crear">
                  <a className="af-btn af-btn-success"><i className="bi bi-plus-circle me-2"></i>¡Sé el primero en crear un blog en esta categoría!</a>
                </LinkContainer>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </Container>

      <ModalBlog
        show={showModal}
        onHide={() => setShowModal(false)}
        blog={blogSeleccionado}
        onAddComment={handleAddComment}
      />
    </div>
  );
};

export default Blog;
