import React from 'react';
import { Card, Button, Row, Col } from 'react-bootstrap';

// Componente: ImagePreview
// Muestra previews de imágenes (URLs o File objects) y permite eliminarlas antes de subir.

/**
 * Componente para mostrar preview de múltiples imágenes con opción de eliminar
 */
/**
 * ImagePreview
 * @param {Object} props
 * @param {Array<string|File>} props.images - Array de URLs o File objects
 * @param {Function|null} props.onRemove - Callback para remover imagen por índice
 * @param {string} props.maxHeight - Altura máxima para las miniaturas
 * @param {boolean} props.showRemoveButton - Mostrar botón de eliminar
 * @returns {JSX.Element|null}
 */
const ImagePreview = ({ 
  images = [], 
  onRemove = null, 
  maxHeight = '150px',
  showRemoveButton = true 
}) => {
  // Si no hay imágenes, no renderizar nada
  if (!images || images.length === 0) return null;

  // Normalizar imágenes: convertir File a objectURL y estandarizar campos
  const normalizedImages = images.map((img, index) => {
    if (typeof img === 'string') {
      // Caso URL ya publicada
      return { id: index, url: img, type: 'url' };
    } else if (img instanceof File) {
      // Crear un objectURL temporal para preview del File
      return { 
        id: index, 
        url: URL.createObjectURL(img), 
        type: 'file',
        name: img.name 
      };
    }
    return null;
  }).filter(Boolean);

  const handleRemoveImage = (imageIndex) => {
    if (onRemove && typeof onRemove === 'function') {
      onRemove(imageIndex);
    }
  };

  return (
    <Row className="g-2 mt-2">
      {normalizedImages.map((image, index) => (
        <Col xs={6} md={4} lg={3} key={image.id}>
          <Card className="position-relative">
            <Card.Img 
              variant="top" 
              src={image.url}
              style={{ 
                height: maxHeight, 
                objectFit: 'cover',
                cursor: 'pointer'
              }}
              alt={image.name || `Imagen ${index + 1}`}
            />
            {showRemoveButton && onRemove && (
              <Button
                variant="danger"
                size="sm"
                className="position-absolute top-0 end-0 m-1"
                style={{ 
                  width: '30px', 
                  height: '30px',
                  padding: 0,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => handleRemoveImage(index)}
                title="Eliminar imagen"
              >
                ×
              </Button>
            )}
            {image.name && (
              <Card.Body className="p-1">
                <small className="text-muted text-truncate d-block">
                  {image.name}
                </small>
              </Card.Body>
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default ImagePreview;