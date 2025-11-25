import React, { useEffect, useState } from 'react';
import { Container, Table, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { pagosAPI } from '../services/pagos';
import { carritoAPI } from '../services/carritoCompra';
import { usuariosAPI } from '../services/usuarios';
import { useAuth } from '../context/AuthContext';

const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  
  let date;
  // Si es un timestamp numérico (como 1763086764524)
  if (typeof dateValue === 'number' || (typeof dateValue === 'string' && /^\d+$/.test(dateValue))) {
    date = new Date(parseInt(dateValue));
  } else {
    // Si es una fecha en string
    date = new Date(dateValue);
  }
  
  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) return dateValue;
  
  // Formatear como DD-MM-YYYY
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

const statusBadge = (status) => {
  if (!status) return <Badge bg="secondary">Desconocido</Badge>;
  const s = String(status).toLowerCase();
  if (s === 'pendiente' || s === 'pending') return <Badge bg="warning" text="dark">Pendiente</Badge>;
  if (s === 'aprobado' || s === 'approved') return <Badge bg="success">Aprobado</Badge>;
  if (s === 'rechazado' || s === 'rejected') return <Badge bg="danger">Rechazado</Badge>;
  return <Badge bg="secondary">{status}</Badge>;
};

const GestionPagos = () => {
  const { isAdmin } = useAuth();
  const amIAdmin = typeof isAdmin === 'function' ? isAdmin() : isAdmin;
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, variant: '', message: '' });

  const cargarPagos = async () => {
    try {
      setLoading(true);

      // Obtener pagos (forma flexible: cachedGet puede devolver objetos con data/result)
      const resp = await pagosAPI.getAll();
      let all = Array.isArray(resp) ? resp : (resp?.data || resp || []);

      // Enriquecer cada pago: resolver usuario (cliente) mediante distintos campos y
      // fallback a cart->user si hace falta. Esto cubre backends que no guardaron
      // user_id directamente en payment.
      const enriched = await Promise.all((all || []).map(async (p) => {
        const pago = { ...p };

        // Si ya viene un objeto usuario, usarlo
        const maybeUser = pago.usuario || pago.user || pago.user_data || pago.user_obj;
        if (maybeUser && (maybeUser.nombre || maybeUser.name || maybeUser.email)) {
          pago.usuario = maybeUser;
          return pago;
        }

        // Intentar resolver por user_id directo
        const userId = pago.user_id || pago.userId || pago.usuario_id || pago.usuarioId;
        if (userId) {
          try {
            const u = await usuariosAPI.getById(userId);
            if (u) pago.usuario = u;
          } catch (e) {
            console.warn('GestionPagos: fallo al resolver usuario por user_id', userId, e);
          }
        }

        // Si aún no hay usuario, intentar via cart -> cart.user_id
        const cartId = pago.cart_id || pago.cartId || pago.carrito_id || pago.carritoId;
        if (!pago.usuario && cartId) {
          try {
            const cart = await carritoAPI.getById(cartId);
            const cartUserId = cart?.user_id || cart?.usuario_id || cart?.userId;
            if (cartUserId) {
              try {
                const u2 = await usuariosAPI.getById(cartUserId);
                if (u2) pago.usuario = u2;
              } catch (e) {
                console.warn('GestionPagos: fallo al resolver usuario desde cart.user_id', e);
              }
            }
          } catch (e) {
            console.warn('GestionPagos: fallo al obtener carrito para pago', cartId, e);
          }
        }

        // Finalmente, mantener/propagar cualquier campo de email disponible
        pago.user_email = pago.user_email || pago.email || pago.customer_email || (pago.user && pago.user.email) || null;

        return pago;
      }));

      setPagos(enriched || []);
    } catch (err) {
      console.error('Error cargando pagos:', err);
      setAlert({ show: true, variant: 'danger', message: 'No se pudieron cargar los pagos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!amIAdmin) return;
    cargarPagos();
  }, [amIAdmin]);

  const actualizarEstado = async (pagoId, estado) => {
    if (!amIAdmin) {
      setAlert({ show: true, variant: 'warning', message: 'No autorizado' });
      return;
    }

    if (!window.confirm(`¿Confirmas ${estado === 'aprobado' ? 'aprobar' : 'rechazar'} el pago ${pagoId}?`)) return;

    try {
      setLoading(true);
      const updated = await pagosAPI.updateStatus(pagoId, estado);

      // Nota: la lógica de limpiar carrito al aprobar un pago se eliminó porque
      // en este despliegue la tabla `cart` está vacía y se gestionará manualmente
      // desde Xano si es necesario. Aprobar un pago sólo actualiza el estado
      // del pago en el sistema.

      setPagos(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      setAlert({ show: true, variant: 'success', message: `Pago ${estado} correctamente.` });
    } catch (err) {
      console.error('Error actualizando estado de pago:', err);
      setAlert({ show: true, variant: 'danger', message: 'Error al actualizar el estado del pago.' });
    } finally {
      setLoading(false);
    }
  };

  // Helper to render a readable client name from various payload shapes
  function renderClientName(p) {
    if (!p) return '—';
    // Prefer already-resolved usuario object
    const u = p.usuario || p.user || p.user_obj || p.user_data;
    if (u && typeof u === 'object') {
      const name = (u.nombre || u.name || u.first_name || '').toString().trim();
      const last = (u.apellidos || u.last_name || u.lastName || '').toString().trim();
      const email = (u.email || u.email_address || u.emailAddress || '').toString().trim();
      const composed = `${name} ${last}`.trim();
      return composed || email || '—';
    }

    // If clientName was set during enrichment
    if (p.clientName) return p.clientName;

    // If user is plain string
    if (typeof p.user === 'string') return p.user;

    // Try common email/name fields directly on payment
    const email = p.user_email || p.email || p.customer_email || (p.user && p.user.email);
    if (email) return email;

    // Try to extract from cart object if present
    const cartObj = p.cart || p.carrito || p.cart_obj;
    if (cartObj && typeof cartObj === 'object') {
      const name = (cartObj.user_name || cartObj.nombre || cartObj.name || '').toString().trim();
      const mail = cartObj.user_email || cartObj.email || '';
      if (name) return name;
      if (mail) return mail;
    }

    return '—';
  }

  if (!amIAdmin) return null;

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h4">Gestión de Pagos</h2>
      </div>

      {alert.show && (
        <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible>
          {alert.message}
        </Alert>
      )}

      {loading && (
        <div className="text-center mb-3"><Spinner animation="border" /></div>
      )}

      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagos && pagos.length > 0 ? pagos.map(pago => (
              <tr key={pago.id}>
                <td>{pago.id}</td>
                <td>{renderClientName(pago)}</td>
                <td>{pago.total_amount ?? pago.total}</td>
                <td>{pago.payment_method || pago.metodo || '-'}</td>
                <td>{statusBadge((pago.estado || pago.status || pago.status_payment) || 'pendiente')}</td>
                <td>{formatDate(pago.fecha_pago || pago.payment_date || pago.created_at)}</td>
                <td>
                  {((pago.estado || pago.status) === 'pendiente' || (pago.estado || pago.status) === 'pending' || !pago.estado) ? (
                    <div className="d-flex gap-2">
                      <Button variant="success" size="sm" onClick={() => actualizarEstado(pago.id, 'aprobado')}>Aprobar</Button>
                      <Button variant="danger" size="sm" onClick={() => actualizarEstado(pago.id, 'rechazado')}>Rechazar</Button>
                    </div>
                  ) : (
                    <small className="text-muted">No disponible</small>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">No hay pagos registrados</td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </Container>
  );
};

export default GestionPagos;
