import React, { useState } from 'react';
import { Container, Row, Col, Table, Button, Alert, Card, Form, Spinner } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../context/AuthContext';
import { pagosAPI } from '../services/pagos';
import { carritoAPI } from '../services/carritoCompra';

const Carrito = ({ carrito, onRemoveFromCart, onClearCart }) => {
  const { isAuthenticated, user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [isPaying, setIsPaying] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const calcularSubtotal = () => {
    return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  };

  const calcularImpuestos = () => {
    const subtotal = calcularSubtotal();
    return subtotal * 0.19; // IVA 19%
  };

  const calcularTotal = () => {
    return calcularSubtotal() + calcularImpuestos();
  };

  if (!isAuthenticated()) {
    return (
      <div style={{ paddingTop: '120px' }}>
        <Container>
          <Alert variant="warning" className="text-center">
            <h4><i className="bi bi-exclamation-triangle"></i> Acceso Restringido</h4>
            <p>Debes iniciar sesión para ver tu carrito de compras.</p>
            <LinkContainer to="/login">
              <Button variant="primary">Iniciar Sesión</Button>
            </LinkContainer>
          </Alert>
        </Container>
      </div>
    );
  }

  // Helper para extraer un id de carrito de distintas formas de respuesta de Xano
  const resolveCartId = (cartObj) => {
    if (!cartObj) return null;
    if (typeof cartObj === 'number') return cartObj;
    if (cartObj.id) return cartObj.id;
    if (cartObj.cart_id) return cartObj.cart_id;
    if (cartObj.data && cartObj.data.id) return cartObj.data.id;
    if (Array.isArray(cartObj) && cartObj.length > 0) {
      const first = cartObj[0];
      if (first && (first.id || first.cart_id)) return first.id || first.cart_id;
    }
    return null;
  };

  return (
    <div style={{ paddingTop: '120px' }}>
      <Container>
        <Row>
          <Col>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4">
                <i className="bi bi-cart-fill"></i> Carrito de Compras
              </h2>
              {carrito.length > 0 && (
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={onClearCart}
                >
                  <i className="bi bi-trash"></i> Vaciar Carrito
                </Button>
              )}
            </div>

            {carrito.length === 0 ? (
              <Card className="text-center py-5">
                <Card.Body>
                  <i className="bi bi-cart-x display-1 text-muted"></i>
                  <h4 className="mt-3">Tu carrito está vacío</h4>
                  <p className="text-muted">
                    Explora nuestros servicios y agrega los que más te gusten
                  </p>
                  <LinkContainer to="/servicios">
                    <Button variant="primary" size="lg">
                      Ver Servicios
                    </Button>
                  </LinkContainer>
                </Card.Body>
              </Card>
            ) : (
              <>
                {/* Lista de servicios en el carrito */}
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th>Proveedor</th>
                        <th>Precio Unitario</th>
                        <th>Cantidad</th>
                        <th>Subtotal</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carrito.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <img 
                                src={item.imagen} 
                                alt={item.nombre}
                                style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                className="rounded me-3"
                                onError={(e) => {
                                  e.target.src = 'https://picsum.photos/50x50?text=Sin+Img';
                                }}
                              />
                              <div>
                                <strong>{item.nombre}</strong>
                                <br />
                                <small className="text-muted">{item.categoria}</small>
                              </div>
                            </div>
                          </td>
                          <td>{item.proveedor}</td>
                          <td>{formatPrice(item.precio)}</td>
                          <td>
                            <span className="badge bg-primary">{item.cantidad}</span>
                          </td>
                          <td>
                            <strong>{formatPrice(item.precio * item.cantidad)}</strong>
                          </td>
                          <td>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => onRemoveFromCart(item.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Resumen de compra */}
                <Row className="mt-4">
                  <Col lg={8}>
                    <Alert variant="info">
                      <h6><i className="bi bi-info-circle"></i> Información importante:</h6>
                      <ul className="mb-0">
                        <li>Los precios incluyen IVA (19%)</li>
                        <li>Una vez realizado el pago, recibirás los datos de contacto del proveedor</li>
                        <li>La coordinación de fecha y horario es directamente con el proveedor</li>
                      </ul>
                    </Alert>
                  </Col>
                  <Col lg={4}>
                    <Card>
                      <Card.Header>
                        <h5 className="mb-0">Resumen de Compra</h5>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-flex justify-content-between mb-2">
                          <span>Subtotal:</span>
                          <span>{formatPrice(calcularSubtotal())}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span>IVA (19%):</span>
                          <span>{formatPrice(calcularImpuestos())}</span>
                        </div>
                        <hr />
                        <div className="d-flex justify-content-between mb-3">
                          <strong>Total:</strong>
                          <strong className="text-success">
                            {formatPrice(calcularTotal())}
                          </strong>
                        </div>
                        <Form.Group className="mb-2">
                          <Form.Label>Método de pago</Form.Label>
                          <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                            <option value="transferencia">Transferencia</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="efectivo">Efectivo</option>
                          </Form.Select>
                        </Form.Group>

                        <Button 
                          variant="success" 
                          size="lg" 
                          className="w-100"
                          disabled={isPaying}
                          onClick={async () => {
                            try {
                              setIsPaying(true);
                              const total = calcularTotal();

                              // Obtener usuario autenticado desde el context
                              const currentUser = user || null;

                              // 1) Obtener o crear carrito en servidor vinculado al usuario
                              let serverCart = null;
                              if (currentUser && currentUser.id) {
                                try {
                                  const c = await carritoAPI.getByUserId(currentUser.id);
                                  // Algunos endpoints devuelven array o objeto
                                  if (Array.isArray(c) && c.length > 0) serverCart = c[0];
                                  else serverCart = c;
                                  console.debug('Carrito obtenido de server (getByUserId):', serverCart);
                                  // Si no encontramos id, intentar crear
                                  if (!resolveCartId(serverCart)) {
                                    console.debug('No active cart found, creando uno nuevo...');
                                    serverCart = await carritoAPI.create(currentUser.id);
                                    console.debug('Carrito creado en server:', serverCart);
                                  }
                                } catch (e) {
                                  // intentar crear si get falla
                                  console.warn('getByUserId fallo, intentando crear carrito:', e?.response?.data || e.message || e);
                                  try {
                                    serverCart = await carritoAPI.create(currentUser.id);
                                    console.debug('Carrito creado en servidor tras fallo:', serverCart);
                                  } catch (ce) {
                                    console.warn('No se pudo crear carrito en servidor:', ce?.response?.data || ce.message || ce);
                                  }
                                }
                              }

                              // 2) Si tenemos serverCart, enviar detalles (cart_detail) para cada item
                              const serverCartId = resolveCartId(serverCart);
                              if (serverCartId) {
                                await Promise.all(carrito.map(async (item) => {
                                  const unitPrice = item.precio ?? item.price ?? item.unit_price ?? 0;
                                  const quantity = item.cantidad ?? item.quantity ?? 1;
                                  const subtotal = (unitPrice * quantity) || item.subtotal || null;
                                  const detailPayload = {
                                    cart_id: serverCartId,
                                    service_id: item.id,
                                    service_name: item.nombre || item.name,
                                    service_provider: item.proveedor || item.provider,
                                    unit_price: unitPrice,
                                    quantity,
                                    subtotal
                                  };
                                  try {
                                    const detailResp = await carritoAPI.addDetail(serverCartId, detailPayload);
                                    console.debug('cart_detail creado:', detailResp);
                                    // Si el endpoint devuelve estructura inesperada, registrar
                                    if (!detailResp || (!detailResp.id && !detailResp.cart_id)) {
                                      console.warn('Respuesta inesperada al crear cart_detail:', detailResp);
                                    }
                                  } catch (errDetail) {
                                    console.warn('No se pudo crear cart_detail para item:', item.id, errDetail?.response?.data || errDetail?.message || errDetail);
                                  }
                                }));
                              }

                              // 3) Crear pago en backend con cart_id si disponible
                              const paymentPayload = {
                                total_amount: total,
                                payment_method: paymentMethod,
                                cart_id: serverCartId || null,
                                // Asociar el pago al usuario que está comprando
                                user_id: currentUser && currentUser.id ? currentUser.id : null,
                                status: 'pendiente'
                              };

                              await pagosAPI.create(paymentPayload);

                              // Aviso al usuario
                              alert('🕒 Tu pago fue enviado. Está pendiente de aprobación por parte del administrador.');

                              // Limpiar carrito local
                              onClearCart();
                            } catch (err) {
                              console.error('Error creando pago:', err);
                              alert('Error al procesar el pago. Intenta nuevamente.');
                            } finally {
                              setIsPaying(false);
                            }
                          }}
                        >
                          {isPaying ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />Procesando...
                            </>
                          ) : (
                            <><i className="bi bi-credit-card"></i> Proceder al Pago</>
                          )}
                        </Button>
                        <small className="text-muted d-block text-center mt-2">
                          Pago seguro con múltiples métodos
                        </small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Carrito;
