import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Alert, Spinner } from 'react-bootstrap';
import { categoriasAPI } from '../services/servicios';
import { serviciosAPI } from '../services/servicios';
import ModalDetalleServicio from '../components/ModalDetalleServicio';
// useAuth removed: not required in this view
import MultiImageDisplay from '../components/MultiImageDisplay';

const Servicios = ({ onAddToCart }) => {
  const [servicios, setServicios] = useState([]);
  const [serviciosOriginales, setServiciosOriginales] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    categoria: '',
    precioMinimo: 0,
    precioMaximo: 1000000,
    valoracion: '',
    orden: '' // posibles: 'rating_desc', 'price_asc', 'price_desc'
  });
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  // isAuthenticated removed because not used in this component

  // Cargar datos iniciales
  const didLoadRef = useRef(false);
  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    cargarDatos();
  }, []);

  // Aplicar filtros cuando cambien (aplicarFiltros está memoizado para estabilidad)
  const aplicarFiltros = useCallback(() => {
    let serviciosFiltrados = [...serviciosOriginales];

    // Filtrar por categoría (comparar por service_category_id cuando exista)
    if (filtros.categoria && filtros.categoria !== 'Todos') {
      // filtros.categoria puede venir como nombre o id
      serviciosFiltrados = serviciosFiltrados.filter(servicio => {
        const serviceCatId = servicio.service_category_id ?? servicio.service_category_id ?? servicio.service_category_id;
        // If filtros.categoria is numeric string, compare by id
        if (!Number.isNaN(Number(filtros.categoria)) && String(filtros.categoria).trim() !== '') {
          return String(serviceCatId) === String(filtros.categoria);
        }
        // else compare by name (existing 'categoria' field)
        return (servicio.categoria || '').toString() === filtros.categoria;
      });
    }

    // Filtrar por rango de precio
    serviciosFiltrados = serviciosFiltrados.filter(servicio => {
      const price = Number(servicio.precio ?? servicio.price ?? 0);
      return price >= Number(filtros.precioMinimo) && price <= Number(filtros.precioMaximo);
    });

    // Filtrar por valoración mínima
    if (filtros.valoracion) {
      serviciosFiltrados = serviciosFiltrados.filter(
        servicio => Number(servicio.valoracion ?? servicio.rating ?? 0) >= parseInt(filtros.valoracion)
      );
    }

    // Ordenar si se solicitó
    if (filtros.orden) {
      if (filtros.orden === 'rating_desc') {
        serviciosFiltrados.sort((a, b) => (Number(b.valoracion ?? b.rating ?? 0) - Number(a.valoracion ?? a.rating ?? 0)));
      } else if (filtros.orden === 'price_asc') {
        serviciosFiltrados.sort((a, b) => (Number(a.precio ?? a.price ?? 0) - Number(b.precio ?? b.price ?? 0)));
      } else if (filtros.orden === 'price_desc') {
        serviciosFiltrados.sort((a, b) => (Number(b.precio ?? b.price ?? 0) - Number(a.precio ?? a.price ?? 0)));
      }
    }

    setServicios(serviciosFiltrados);
  }, [filtros, serviciosOriginales]);

  useEffect(() => {
    aplicarFiltros();
  }, [aplicarFiltros]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar servicios y categorías en paralelo
      const [serviciosResponse, categoriasResponse] = await Promise.all([
        serviciosAPI.getAll({ includeAll: false, ttl: 300000 }),
        categoriasAPI.getServicios()
      ]);
      
  
      const categoriasList = Array.isArray(categoriasResponse)
        ? categoriasResponse.map((c, idx) => {
            if (!c && c !== 0) return null;
            if (typeof c === 'string') return { id: idx + 1, name: c };
            if (typeof c === 'number') return { id: c, name: String(c) };
            if (typeof c === 'object') return { id: c.id ?? (idx + 1), name: c.name || c.nombre || c.category || String(c.id ?? (idx + 1)) };
            return null;
          }).filter(Boolean)
        : [];

      setServiciosOriginales(serviciosResponse);
      setServicios(serviciosResponse);
      setCategorias(categoriasList);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los servicios. Intenta recargar la página.');
      
      // Sin datos de respaldo, mostrar listas vacías
      setServiciosOriginales([]);
      setServicios([]);
      setCategorias(['Todos']); // Solo mostrar "Todos" si no hay categorías de API
    } finally {
      setLoading(false);
    }
  };


  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVerDetalle = (servicio) => {
    setServicioSeleccionado(servicio);
    setShowModal(true);
  };

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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  return (
    <div style={{ paddingTop: '120px' }}>
      <Container>
        {/* Mostrar loading */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Cargando servicios...</span>
            </Spinner>
            <p className="mt-2">Cargando servicios...</p>
          </div>
        )}

        {/* Mostrar error */}
        {error && (
            <Alert variant="danger" className="mb-4">
            <Alert.Heading>Error al cargar servicios</Alert.Heading>
            <p>{error}</p>
            <button className="af-btn af-btn-outline-danger" onClick={cargarDatos}>Reintentar</button>
          </Alert>
        )}

        {/* Contenido principal */}
        {!loading && !error && (
          <>
            <Row className="mb-4">
          {/* Filtros */}
          <Col md={3}>
            <h2 className="h4">Filtrar Servicios</h2>
            <Form>
              <div className="mb-2">
                <Form.Label>Categorías</Form.Label>
                <Form.Select 
                  name="categoria" 
                  value={filtros.categoria}
                  onChange={handleFiltroChange}
                >
                  <option value="Todos">Todos</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Form.Select>
              </div>
              
              <div className="mb-2">
                <Form.Label>Precio Mínimo: {formatPrice(filtros.precioMinimo)}</Form.Label>
                <Form.Range
                  min="0"
                  max="1000000"
                  step="10000"
                  name="precioMinimo"
                  value={filtros.precioMinimo}
                  onChange={handleFiltroChange}
                />
                <Form.Label className="mt-2">Precio Máximo: {formatPrice(filtros.precioMaximo)}</Form.Label>
                <Form.Range
                  min="0"
                  max="1000000"
                  step="10000"
                  name="precioMaximo"
                  value={filtros.precioMaximo}
                  onChange={handleFiltroChange}
                />
              </div>
              
              <div className="mb-2">
                <Form.Label>Valoración</Form.Label>
                <Form.Select 
                  name="valoracion"
                  value={filtros.valoracion}
                  onChange={handleFiltroChange}
                >
                  <option value="">Todas</option>
                  <option value="5">★★★★★</option>
                  <option value="4">★★★★☆ o más</option>
                  <option value="3">★★★☆☆ o más</option>
                </Form.Select>
              </div>

              <div className="mb-2">
                <Form.Label>Ordenar Por</Form.Label>
                <Form.Select name="orden" value={filtros.orden} onChange={handleFiltroChange}>
                  <option value="">Predeterminado</option>
                  <option value="rating_desc">Valoración (mayor a menor)</option>
                  <option value="price_asc">Precio (menor a mayor)</option>
                  <option value="price_desc">Precio (mayor a menor)</option>
                </Form.Select>
              </div>
              
              <button className="af-btn af-btn-outline-primary w-100" onClick={aplicarFiltros}>Aplicar Filtros</button>
            </Form>
          </Col>

          {/* Lista de servicios */}
          <Col md={9}>
            <h2 className="h4 mb-3">Catálogo de Servicios ({servicios.length} encontrados)</h2>
            <Row>
              {servicios.map((servicio) => (
                <Col md={4} key={servicio.id} className="mb-4">
                  <Card className="h-100">
                    <MultiImageDisplay 
                      imageUrls={servicio.imagenes && servicio.imagenes.length ? servicio.imagenes : (servicio.imagen_url || servicio.imagen ? [servicio.imagen_url || servicio.imagen] : [])}
                      alt={servicio.nombre}
                      layout="carousel"
                      height="200px"
                    />
                    <Card.Body className="d-flex flex-column">
                      <Card.Title>{servicio.nombre}</Card.Title>
                      <Card.Text className="flex-grow-1">
                        {servicio.descripcion}
                      </Card.Text>
                      <div className="mb-2">
                        <span className="badge bg-success me-2">
                          {formatPrice(servicio.precio)}
                        </span>
                        <span className="text-warning">
                          {renderStars(servicio.valoracion ?? servicio.rating ?? 0)} ({servicio.numValoraciones ?? servicio.num_valoraciones ?? 0})
                        </span>
                      </div>
                      <div className="d-flex gap-2">
                        <button 
                          type="button"
                          className="af-btn af-btn-primary af-btn-sm"
                          onClick={() => handleVerDetalle(servicio)}
                        >
                          Ver Detalle
                        </button>
                        {/* El botón 'Agregar al Carrito' se muestra sólo en el modal de detalle. */}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
            
            {servicios.length === 0 && (
              <div className="text-center py-5">
                <h4>No se encontraron servicios</h4>
                <p>Intenta ajustar los filtros para ver más resultados.</p>
              </div>
            )}
          </Col>
        </Row>
        </>
        )}
      </Container>

      {/* Modal de detalle */}
      <ModalDetalleServicio
        show={showModal}
        onHide={() => setShowModal(false)}
        servicio={servicioSeleccionado}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};

export default Servicios;
