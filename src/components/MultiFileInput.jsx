import React, { useState, useRef } from 'react';
import { Form, Card } from 'react-bootstrap';

// Componente: MultiFileInput
// Proporciona un input de archivos con soporte drag & drop para seleccionar múltiples imágenes.

/**
 * Componente de input de archivos con drag & drop para múltiples imágenes
 */
/**
 * MultiFileInput
 * @param {Object} props
 * @param {string} props.name - Nombre del input
 * @param {string} props.accept - Tipos MIME aceptados
 * @param {boolean} props.multiple - Permite múltiples archivos
 * @param {Function} props.onChange - Callback cuando cambia la selección (recibe evento con target.files)
 * @param {Array} props.files - Lista de archivos actualmente seleccionados
 * @param {string} props.placeholder - Texto mostrado en el área drag & drop
 * @returns {JSX.Element}
 */
const MultiFileInput = ({ 
  name = 'files',
  accept = 'image/*',
  multiple = true,
  onChange,
  files = [],
  placeholder = 'Arrastra y suelta archivos aquí o haz clic para seleccionar'
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Maneja evento dragOver: evita comportamiento por defecto y marca estado visual
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Maneja evento drop: normaliza FileList a array y llama al callback onChange
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // Extraer archivos del dataTransfer y convertir a array
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      // Construir un objeto similar a un evento para compatibilidad con handlers existentes
      const event = {
        target: {
          name: name,
          files: droppedFiles,
          type: 'file'
        }
      };
      // Llamar al callback del padre si está disponible
      onChange && onChange(event);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    onChange && onChange(e);
  };

  // Render del componente: input oculto + área visual drag & drop
  return (
    <div>
      {/* Input oculto */}
      <Form.Control
        ref={fileInputRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      {/* Área de drag & drop */}
      <Card 
        className={`text-center p-4 ${isDragOver ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'}`}
        style={{ 
          cursor: 'pointer',
          borderStyle: 'dashed',
          borderWidth: '2px',
          transition: 'all 0.3s ease'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div>
          <i 
            className={`bi ${isDragOver ? 'bi-cloud-arrow-down' : 'bi-cloud-upload'} mb-3`}
            style={{ 
              fontSize: '3rem',
              color: isDragOver ? '#0d6efd' : '#6c757d'
            }}
          />
          <h6 className={isDragOver ? 'text-primary' : 'text-muted'}>
            {isDragOver ? 'Suelta los archivos aquí' : placeholder}
          </h6>
          <p className="text-muted mb-2">
            {multiple ? 'Selecciona múltiples archivos' : 'Selecciona un archivo'}
          </p>
          <small className="text-muted">
            {multiple && 'Mantén Ctrl presionado para seleccionar varios archivos, o '}
            arrastra y suelta archivos aquí
          </small>
          
          {files.length > 0 && (
            <div className="mt-3">
              <small className="text-success">
                <i className="bi bi-check-circle"></i> {files.length} archivo{files.length > 1 ? 's' : ''} seleccionado{files.length > 1 ? 's' : ''}
              </small>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MultiFileInput;