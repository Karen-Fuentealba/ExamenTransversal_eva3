import React, { useState } from 'react';
import { Carousel, Card, Row, Col, Modal } from 'react-bootstrap';
import api from '../services/api';

// Componente: MultiImageDisplay
// Muestra una o varias imágenes en diferentes layouts (carousel, grid, single).

/**
 * Componente para mostrar múltiples imágenes en diferentes layouts
 */
/**
 * MultiImageDisplay
 * @param {Object} props
 * @param {Array|string} props.imageUrls - URLs o array de objetos devueltos por Xano
 * @param {string} props.alt - Texto alternativo
 * @param {string} props.layout - 'carousel' | 'grid' | 'single'
 * @param {string} props.height - Altura de las imágenes
 * @param {boolean} props.showModal - Permitir modal de ampliación
 */
const MultiImageDisplay = ({ 
  imageUrls = [], 
  alt = 'Imagen',
  layout = 'carousel', // 'carousel', 'grid', 'single'
  height = '300px',
  showModal = true
}) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  // Normalizar imageUrls: soporta
  // - array de strings (URLs)
  // - array de objetos [{ path, name, ... }]
  // - string JSON (por compatibilidad)
  // Normalizar distintas formas de entrada a un array de URLs completas
  const normalizeImageUrls = (input) => {
    if (!input) return [];
    // Si es string, intentar parsear JSON (compatibilidad con strings JSON)
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed : [input];
      } catch {
        // No es JSON: devolver la cadena como URL
        return [input];
      }
    }

    if (!Array.isArray(input)) return [];

    // Mapear cada elemento a una URL válida (soporta objetos Xano con `path`)
    // Helper: buscar recursivamente una URL dentro de un objeto
    const findUrlInObject = (obj) => {
      if (!obj) return null;
      if (typeof obj === 'string') return obj;
      const candidates = ['url','public_url','full_url','path','file_path','src','file_url','publicPath','publicPathUrl'];
      for (const k of candidates) {
        const v = obj[k];
        if (v && typeof v === 'string') return v;
      }
      if (obj.file && typeof obj.file === 'object') {
        const r = findUrlInObject(obj.file);
        if (r) return r;
      }
      if (Array.isArray(obj.data) && obj.data.length > 0) {
        const r = findUrlInObject(obj.data[0]);
        if (r) return r;
      }
      if (Array.isArray(obj.files) && obj.files.length > 0) {
        const r = findUrlInObject(obj.files[0]);
        if (r) return r;
      }
      try {
        const keys = Object.keys(obj).slice(0, 6);
        for (const k of keys) {
          const v = obj[k];
          if (v && typeof v === 'object') {
            const r = findUrlInObject(v);
            if (r) return r;
          }
        }
      } catch { void 0; }
      return null;
    };

    return input.map((it) => {
      if (!it) return null;
      // Si es string, puede ser una URL o un JSON serializado (['...'] o {...})
      if (typeof it === 'string') {
        const sRaw = it.trim();
        if (!sRaw) return null;
        // Intentar parsear JSON si parece un array/objeto
        if ((sRaw.startsWith('[') && sRaw.endsWith(']')) || (sRaw.startsWith('{') && sRaw.endsWith('}'))) {
          try {
            const parsed = JSON.parse(sRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              for (const p of parsed) {
                const found = (typeof p === 'string') ? p : (findUrlInObject(p) || null);
                if (found) return (found.startsWith('http') ? found : `${(api.defaults.baseURL || 'https://x8ki-letl-twmt.n7.xano.io').replace(/\/$/, '')}${found.startsWith('/') ? '' : '/'}${found}`);
              }
            }
            if (parsed && typeof parsed === 'object') {
              const found = findUrlInObject(parsed);
              if (found) return (found.startsWith('http') ? found : `${(api.defaults.baseURL || 'https://x8ki-letl-twmt.n7.xano.io').replace(/\/$/, '')}${found.startsWith('/') ? '' : '/'}${found}`);
            }
          } catch { void 0; }
        }
        if (sRaw.startsWith('http')) return sRaw;
        const base = (api.defaults.baseURL || 'https://x8ki-letl-twmt.n7.xano.io').replace(/\/$/, '');
        const sep = sRaw.startsWith('/') ? '' : '/';
        return `${base}${sep}${sRaw}`;
      }

      const found = findUrlInObject(it);
      if (found && typeof found === 'string') {
        const s = found.trim();
        if (s.startsWith('http')) return s;
        const base = (api.defaults.baseURL || 'https://x8ki-letl-twmt.n7.xano.io').replace(/\/$/, '');
        const sep = s.startsWith('/') ? '' : '/';
        return `${base}${sep}${s}`;
      }

      return null;
    }).filter(Boolean);
  };

  const images = normalizeImageUrls(imageUrls);
  
  if (!images || images.length === 0) return null;

  const handleImageClick = (imageUrl) => {
    if (showModal) {
      setSelectedImage(imageUrl);
      setShowImageModal(true);
    }
  };

  // Layout: Una sola imagen (primera del array)
  if (layout === 'single') {
    return (
      <>
        <Card.Img 
          variant="top" 
          src={images[0]}
          alt={alt}
          style={{ 
            height: height, 
            objectFit: 'cover',
            cursor: showModal ? 'pointer' : 'default'
          }}
          onClick={() => handleImageClick(images[0])}
        />
        
        {/* Modal para imagen ampliada */}
        {showModal && (
          <Modal 
            show={showImageModal} 
            onHide={() => setShowImageModal(false)}
            size="lg"
            centered
          >
            <Modal.Body className="p-0">
              <img 
                src={selectedImage}
                alt={alt}
                style={{ width: '100%', height: 'auto' }}
              />
            </Modal.Body>
          </Modal>
        )}
      </>
    );
  }

  // Layout: Grid para múltiples imágenes
  if (layout === 'grid') {
    return (
      <>
        <Row className="g-2">
          {images.slice(0, 6).map((imageUrl, index) => (
            <Col xs={6} md={4} key={index}>
              <Card.Img 
                src={imageUrl}
                alt={`${alt} ${index + 1}`}
                style={{ 
                  height: '120px', 
                  objectFit: 'cover',
                  borderRadius: '8px',
                  cursor: showModal ? 'pointer' : 'default'
                }}
                onClick={() => handleImageClick(imageUrl)}
              />
            </Col>
          ))}
          {images.length > 6 && (
            <Col xs={6} md={4}>
              <div 
                className="d-flex align-items-center justify-content-center"
                style={{ 
                  height: '120px', 
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '2px dashed #dee2e6'
                }}
              >
                <small className="text-muted">
                  +{images.length - 6} más
                </small>
              </div>
            </Col>
          )}
        </Row>

        {/* Modal para imagen ampliada */}
        {showModal && (
          <Modal 
            show={showImageModal} 
            onHide={() => setShowImageModal(false)}
            size="lg"
            centered
          >
            <Modal.Body className="p-0">
              <img 
                src={selectedImage}
                alt={alt}
                style={{ width: '100%', height: 'auto' }}
              />
            </Modal.Body>
          </Modal>
        )}
      </>
    );
  }

  // Layout: Carousel (default)
  if (images.length === 1) {
    // Si solo hay una imagen, mostrarla sin carousel
    return (
      <>
        <Card.Img 
          variant="top" 
          src={images[0]}
          alt={alt}
          style={{ 
            height: height, 
            objectFit: 'cover',
            cursor: showModal ? 'pointer' : 'default'
          }}
          onClick={() => handleImageClick(images[0])}
        />
        
        {/* Modal para imagen ampliada */}
        {showModal && (
          <Modal 
            show={showImageModal} 
            onHide={() => setShowImageModal(false)}
            size="lg"
            centered
          >
            <Modal.Body className="p-0">
              <img 
                src={selectedImage}
                alt={alt}
                style={{ width: '100%', height: 'auto' }}
              />
            </Modal.Body>
          </Modal>
        )}
      </>
    );
  }

  return (
    <>
      <Carousel interval={null} indicators={images.length > 1}>
        {images.map((imageUrl, index) => (
          <Carousel.Item key={index}>
            <img
              className="d-block w-100"
              src={imageUrl}
              alt={`${alt} ${index + 1}`}
              style={{ 
                height: height, 
                objectFit: 'cover',
                cursor: showModal ? 'pointer' : 'default'
              }}
              onClick={() => handleImageClick(imageUrl)}
            />
          </Carousel.Item>
        ))}
      </Carousel>

      {/* Modal para imagen ampliada */}
      {showModal && (
        <Modal 
          show={showImageModal} 
          onHide={() => setShowImageModal(false)}
          size="lg"
          centered
        >
          <Modal.Body className="p-0">
            <img 
              src={selectedImage}
              alt={alt}
              style={{ width: '100%', height: 'auto' }}
            />
          </Modal.Body>
        </Modal>
      )}
    </>
  );
};

export default MultiImageDisplay;