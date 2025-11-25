
// Componente BlogCategorySelect - selector de categorías para crear/editar posts
import React, { useEffect, useState } from 'react';
import { getBlogCategories } from '../services/blog';

/**
 * BlogCategorySelect
 * Selector controlado que carga categorías desde el API y permite elegir una.
 *
 * Props:
 * - value: valor actual (id de categoría)
 * - onChange: handler para cambios del select
 *
 * Notas:
 * - Hace una llamada a getBlogCategories() al montarse. Maneja estados de carga y error.
 */
const BlogCategorySelect = ({ value, onChange }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Cargar categorías al montar el componente
    getBlogCategories()
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Error al cargar categorías');
        setLoading(false);
      });
  }, []);

  if (loading) return <span>Cargando categorías...</span>;
  if (error) return <span>{error}</span>;

  return (
    <select value={value} onChange={onChange}>
      <option value="">Selecciona una categoría</option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </select>
  );
};

export default BlogCategorySelect;
