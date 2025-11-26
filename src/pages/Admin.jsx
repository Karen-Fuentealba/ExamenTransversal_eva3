import React, { useState, useEffect } from 'react';
import { Container, Modal, Form, Alert, Nav, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usuariosAPI } from '../services/usuarios';
import { categoriasAPI } from '../services/servicios';
import { uploadImages as xanoUploadImages} from '../services/imagenes';
import { serviciosAPI } from '../services/servicios';
import { blogsAPI, attachImagesToBlog, getBlogCategories } from '../services/blog';
import ImagePreview from '../components/ImagePreview';
import MultiFileInput from '../components/MultiFileInput';
import AdminServices from './GestionServicios';
import AdminUsers from './GestionUsuarios';
import AdminBlogs from './GestionBlogs';
import GestionPagos from './GestionPagos';
import AdminScheduleEditor from '../components/AdminScheduleEditor';

const Admin = () => {
  const { user, isAdmin, logout } = useAuth();
  const amIAdmin = typeof isAdmin === 'function' ? isAdmin() : isAdmin;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('servicios');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAlert, setShowAlert] = useState({ show: false, variant: '', message: '' });
  
  // Estados para servicios
  const [servicios, setServicios] = useState([]);
  const [searchServicios, setSearchServicios] = useState('');
  const [categoriasServicios, setCategoriasServicios] = useState([]);
  const [showModalServicio, setShowModalServicio] = useState(false);
  const [servicioEditando, setServicioEditando] = useState(null);
  const [formServicio, setFormServicio] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoria: 'Animación y Entretenimiento',
    service_category_id: '',
    imagen: '',
    imageFiles: [], // Archivos de imagen nuevos seleccionados
    currentImages: [], // URLs de imágenes actuales (para edición)
    disponibilidad: '',
    proveedor: '',
    
  });

  
  
  // Estados para usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [searchUsuarios, setSearchUsuarios] = useState('');
  const [showModalUsuario, setShowModalUsuario] = useState(false);
  const [searchBlogs, setSearchBlogs] = useState('');
  const [formUsuario, setFormUsuario] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    password: '',
    rol: 'cliente' // 'cliente' or 'admin'
  });
  
  // Estados para blogs
  const [blogs, setBlogs] = useState([]);
  const [categoriasBlog, setCategoriasBlog] = useState([]);
  const [showModalBlog, setShowModalBlog] = useState(false);
  const [blogEditando, setBlogEditando] = useState(null);
  const [formBlog, setFormBlog] = useState({
    titulo: '',
    categoria: 'Tendencias',
    blog_category_id: '',
    imagen: '',
    imageFiles: [], // Archivos de imagen nuevos seleccionados
    currentImages: [], // URLs de imágenes actuales (para edición)
    contenido: '',
    subtitulos: '',
    fecha_publicacion: new Date().toISOString().split('T')[0]
  });

  // Categorías estáticas por defecto (fallback si Xano no devuelve categorías útiles)
  const STATIC_CATEGORIES = [
    { id: 1, name: 'Tendencias' },
    { id: 2, name: 'Consejos' },
    { id: 3, name: 'Experiencias' }
  ];

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar todos los datos en paralelo
      const [
        serviciosResponse,
        usuariosResponse,
        blogsResponse,
        categoriasServiciosResponse,
        categoriasBlogResponse
      ] = await Promise.all([
  serviciosAPI.getAll({ includeAll: true }),
        usuariosAPI.getAll(),
        blogsAPI.getAll(true), // Incluir todos los blogs para admin
        categoriasAPI.getServicios(),
        getBlogCategories()
      ]);
      
      setServicios(serviciosResponse);
      setUsuarios(usuariosResponse);
      setBlogs(blogsResponse);
      // Normalizar: si la API devuelve strings convertir a objetos {id,name}
      setCategoriasServicios(categoriasServiciosResponse.map((c, idx) => (typeof c === 'string' ? { id: idx + 1, name: c } : c)));


      // Normalize blog categories into objects { id, name } so the admin UI can
      // render option labels and submit numeric ids (blog_category_id).
      // Also protect against empty/placeholder responses like { blog_category_id: 0, name: '' }

      let categoriasBlogList = [];
      if (Array.isArray(categoriasBlogResponse) && categoriasBlogResponse.length > 0) {
        categoriasBlogList = categoriasBlogResponse.map((c, idx) => {
          if (!c && c !== 0) return null;
          if (typeof c === 'string') {
            const name = c;
            // try map to known ids if name matches
            const lower = String(name).toLowerCase();
            const foundStatic = STATIC_CATEGORIES.find(sc => sc.name.toLowerCase() === lower);
            const id = foundStatic ? foundStatic.id : (idx + 1);
            return { id, name };
          }
          if (typeof c === 'number') {
            return { id: c, name: String(c) };
          }
          if (typeof c === 'object') {
            // Accept fields like blog_category_id or id, and name or nombre
            const id = c.blog_category_id ?? c.id ?? c.ID ?? (idx + 1);
            const name = c.name || c.nombre || c.category || (id === 0 ? '' : String(id));
            return { id, name };
          }
          return null;
        }).filter(Boolean);
      }

      // If API returned nothing useful (empty names or a placeholder with id 0),
      // fallback to static categories so the admin always has the expected options.
      const hasUseful = categoriasBlogList.some(c => c && c.name && String(c.name).trim() !== '' && Number(c.id) > 0);
      if (!hasUseful) {
        categoriasBlogList = STATIC_CATEGORIES;
      } else {
        // Ensure static categories exist also when API returned a partial list
        for (const sc of STATIC_CATEGORIES) {
          if (!categoriasBlogList.find(x => Number(x.id) === sc.id)) {
            categoriasBlogList.push(sc);
          }
        }
        // Deduplicate by id, keep first occurrence
        const seen = new Set();
        categoriasBlogList = categoriasBlogList.filter(c => {
          if (seen.has(Number(c.id))) return false;
          seen.add(Number(c.id));
          return true;
        });
      }

      setCategoriasBlog(categoriasBlogList);
      
    } catch (err) {
      console.error('Error al cargar datos del admin:', err);
      setError('Error al cargar los datos. Algunos datos pueden no estar actualizados.');
      
      // Fallback a datos locales mínimos
      try {
        const usuariosGuardados = JSON.parse(localStorage.getItem('ambienteFestUsers') || '[]');
        setUsuarios(usuariosGuardados);
        
        const blogsGuardados = JSON.parse(localStorage.getItem('blogs') || '[]');
        setBlogs(blogsGuardados);
        
        // Sin datos de API, mostrar listas vacías
        setServicios([]);
        setCategoriasServicios([]);
        // En caso de error de red o backend, mantener categorías por defecto para evitar
        // que el select del admin quede vacío y muestre "No hay categorías disponibles".
        setCategoriasBlog(STATIC_CATEGORIES);
      } catch (localError) {
        console.error('Error al cargar datos locales:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

    // Cargar datos al montar el componente (una sola vez)
    useEffect(() => {
      cargarDatos();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Filtrados derivados (búsqueda en tiempo real)
    const filteredServicios = (servicios || []).filter(s => {
      const q = (searchServicios || '').trim().toLowerCase();
      if (!q) return true;
      const nombre = String(s.nombre || s.name || '').toLowerCase();
      const descripcion = String(s.descripcion || s.description || '').toLowerCase();
      const proveedor = String(s.proveedor || s.provider || '').toLowerCase();
      return nombre.includes(q) || descripcion.includes(q) || proveedor.includes(q) || String(s.id || '').includes(q);
    });

    const filteredUsuarios = (usuarios || []).filter(u => {
      const q = (searchUsuarios || '').trim().toLowerCase();
      if (!q) return true;
      const nombre = `${u.nombre || u.name || ''} ${u.apellidos || u.last_name || ''}`.toLowerCase();
      const email = String(u.email || '').toLowerCase();
      return nombre.includes(q) || email.includes(q) || String(u.id || '').includes(q);
    });

    const filteredBlogs = (blogs || []).filter(b => {
      const q = (searchBlogs || '').trim().toLowerCase();
      if (!q) return true;
      const titulo = String(b.titulo || b.title || '').toLowerCase();
      const contenido = String(b.contenido || b.content || '').toLowerCase();
      return titulo.includes(q) || contenido.includes(q) || String(b.id || '').includes(q);
    });

  // Nota: eliminada función de diagnóstico de subida de imágenes para producción.

  const handleServiceChange = (e) => {
    const { name, value, files, type } = e.target;
    
    // Manejar archivos de imagen - AGREGAR a los existentes, no reemplazar
    if (type === 'file' && name === 'imageFiles') {
      const newFiles = Array.from(files || []);
      
      // Validar que solo sean archivos JPEG
      const invalidFiles = newFiles.filter(file => 
        !file.type.includes('jpeg') && !file.type.includes('jpg')
      );
      
      if (invalidFiles.length > 0) {
        setShowAlert({
          show: true,
          variant: 'danger',
          message: `Solo se permiten imágenes JPEG. Archivos rechazados: ${invalidFiles.map(f => f.name).join(', ')}`
        });
        return;
      }
      
      // Agregar solo archivos JPEG válidos
      const validFiles = newFiles.filter(file => 
        file.type.includes('jpeg') || file.type.includes('jpg')
      );
      
      
      setFormServicio(prev => ({ 
        ...prev, 
        imageFiles: [...prev.imageFiles, ...validFiles] // Agregar nuevos archivos válidos a los existentes
      }));
      return;
    }
    
    // Si el campo es service_category_id, guardar también el nombre de la categoría
    if (name === 'service_category_id') {
      const selected = categoriasServicios.find(cat => String(cat.id) === String(value));
      setFormServicio(prev => ({ ...prev, service_category_id: value, categoria: selected ? selected.name : prev.categoria }));
    } else {
      setFormServicio(prev => ({ ...prev, [name]: value }));
    }
  };

  // Función para remover imagen actual (URLs existentes)
  const removeCurrentServiceImage = (imageIndex) => {
    // Optimistic UI: calcular el arreglo restante y actualizar localmente
    const remaining = (formServicio.currentImages || []).filter((_, index) => index !== imageIndex);
    setFormServicio(prev => ({ ...prev, currentImages: remaining }));

    // Si estamos editando un servicio existente, persistir la eliminación en el servidor
    if (servicioEditando && servicioEditando.id) {
      (async () => {
        try {
          setLoading(true);
          // Preparar payload usando el arreglo `remaining` calculado arriba
          let imageForXano = null;
          if (remaining.length > 0) {
            const objs = remaining.map(url => ({
              path: url.replace('https://x8ki-letl-twmt.n7.xano.io', ''),
              name: url.split('/').pop(),
              type: 'image',
              access: 'public',
              size: 0,
              mime: 'image/jpeg',
              meta: { filename: url.split('/').pop() }
            }));
            imageForXano = objs.length === 1 ? objs[0] : objs;
          }

          const payload = { imagen: imageForXano };
          await serviciosAPI.update(servicioEditando.id, payload);
          setShowAlert({ show: true, variant: 'success', message: 'Imagen eliminada.' });
        } catch (err) {
          console.error('Error al eliminar imagen en el servidor:', err);
          // Revertir cambio local si falla
          setFormServicio(prev => ({ ...prev, currentImages: servicioEditando.imagenes || (servicioEditando.imagen_url ? [servicioEditando.imagen_url] : []) }));
          setShowAlert({ show: true, variant: 'danger', message: 'No se pudo eliminar la imagen en el servidor.' });
        } finally {
          setLoading(false);
        }
      })();
    }
  };

  // Función para remover archivo nuevo seleccionado
  const removeNewServiceImage = (fileIndex) => {
    setFormServicio(prev => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, index) => index !== fileIndex)
    }));
  };

  // Función para limpiar todas las imágenes nuevas seleccionadas
  const clearNewServiceImages = () => {
    setFormServicio(prev => ({
      ...prev,
      imageFiles: []
    }));
  };

  const handleCreateService = () => {
    setServicioEditando(null);
    const firstCategory = categoriasServicios.filter(cat => cat && (cat.name || cat))[0];
    setFormServicio({
      nombre: '',
      descripcion: '',
      precio: '',
      categoria: firstCategory?.name || '',
      service_category_id: firstCategory?.id || '',
      imagen: '',
      imageFiles: [],
      currentImages: [],
      disponibilidad: '',
      proveedor: '',
      // schedules omitted; Admin uses AdminScheduleEditor to create concrete slots
    });
    setShowModalServicio(true);
  };

  const handleEditService = (servicio) => {
    setServicioEditando(servicio);
    const matched = categoriasServicios.find(cat => String(cat.name) === String(servicio.categoria) || String(cat.id) === String(servicio.service_category_id));
    
    // Usar las múltiples URLs si están disponibles, sino usar la URL principal
    const currentImages = servicio.imagenes && servicio.imagenes.length > 0 
      ? servicio.imagenes 
      : (servicio.imagen_url ? [servicio.imagen_url] : []);
    
    setFormServicio({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      precio: servicio.precio.toString(),
      categoria: servicio.categoria,
      service_category_id: matched ? String(matched.id) : (servicio.service_category_id || ''),
      imagen: servicio.imagen_url || servicio.imagen || '',
      imagen_data: servicio.imagen_data || servicio.imagen_url || servicio.imagen || '', // Mantener datos originales para re-envío
      imageFiles: [], // Al editar, no hay archivos seleccionados inicialmente
      currentImages: currentImages, // Múltiples imágenes actuales del servicio
      disponibilidad: servicio.disponibilidad,
      proveedor: servicio.proveedor,
      // schedules omitted; concrete time slots managed in AdminScheduleEditor
    });
    setShowModalServicio(true);
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
      try {
        setLoading(true);
        await serviciosAPI.delete(id);
        
        // Actualizar la lista local
        setServicios(prev => prev.filter(s => s.id !== id));
        
        setShowAlert({
          show: true,
          variant: 'success',
          message: 'Servicio eliminado exitosamente'
        });
      } catch (error) {
        console.error('Error al eliminar servicio:', error);
        setShowAlert({
          show: true,
          variant: 'danger',
          message: 'Error al eliminar el servicio'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();

    

    if (!formServicio.nombre || !formServicio.descripcion || !formServicio.precio) {
      setShowAlert({ show: true, variant: 'danger', message: 'Por favor completa todos los campos obligatorios' });
      return;
    }

    try {
      setLoading(true);
      
      // Combinar imágenes actuales con nuevas imágenes subidas
      let allImageUrls = [...formServicio.currentImages]; // Empezar con las imágenes actuales
      
      // Subir nuevas imágenes si hay archivos seleccionados
      let xanoImageObjects = []; // Objetos completos de Xano para la API
      
      if (formServicio.imageFiles && formServicio.imageFiles.length > 0) {
        try {
          const uploadResult = await xanoUploadImages(formServicio.imageFiles);
          // uploadResult es un objeto con { urls, xanoObjects }
          xanoImageObjects = uploadResult.xanoObjects || [];
          const uploadedUrls = uploadResult.urls || [];
          
          allImageUrls = [...allImageUrls, ...uploadedUrls]; // Agregar nuevas URLs para UI
          
          setShowAlert({
            show: true,
            variant: 'success',
            message: ` ${uploadedUrls.length} imagen${uploadedUrls.length > 1 ? 'es' : ''} subida${uploadedUrls.length > 1 ? 's' : ''} exitosamente`
          });
          
        } catch (uploadError) {
          console.error('Error al subir imágenes:', uploadError);
          
          // Mensaje más específico según el tipo de error
          let errorMessage = 'Error al subir imágenes. ';
          if (uploadError.message.includes('Xano no procesó')) {
            errorMessage += 'Intenta renombrar los archivos sin caracteres especiales o usando nombres más cortos.';
          } else if (uploadError.message.includes('Solo se permiten')) {
            errorMessage += 'Solo se permiten archivos JPEG.';
          } else {
            errorMessage += 'Verifica que los archivos sean válidos e intenta nuevamente.';
          }
          
          setShowAlert({
            show: true,
            variant: 'warning',
            message: errorMessage
          });
          
          // No parar el proceso, continuar con las imágenes que ya estaban
        }
      }
      
      // Preparar el campo imagen para Xano como array de objetos completos
      let imageForXano = null;
      
  if (xanoImageObjects.length > 0) {
        // Enviar los objetos completos de Xano (con path, name, type, meta, etc.)
        // Pero antes, conservar las imágenes actuales del servicio y fusionarlas
        const existingFromCurrent = (formServicio.currentImages || []).map(url => ({
          path: url.replace('https://x8ki-letl-twmt.n7.xano.io', ''),
          name: url.split('/').pop(),
          type: 'image',
          access: 'public',
          size: 0,
          mime: 'image/jpeg',
          meta: { filename: url.split('/').pop() }
        }));

        // Combinar objetos existentes con los recién subidos
        const combined = [...existingFromCurrent, ...xanoImageObjects];

        // Deduplicar por 'path' para evitar duplicados accidentales
        const seen = new Set();
        const dedup = combined.filter(item => {
          const p = (item.path || item.file?.path || item.url || item.file?.url || '').toString();
          if (!p) {
            // Si no hay path, usar el nombre como fallback
            const k = item.name || JSON.stringify(item);
            if (seen.has(k)) return false; seen.add(k); return true;
          }
          if (seen.has(p)) return false; seen.add(p); return true;
        });

        imageForXano = dedup.length === 1 ? dedup[0] : dedup;
        
      } else if (allImageUrls.length > 0) {
        // Convertir URLs existentes a objetos esperados por Xano (agregar size y mime para validación)
        const imageObjects = allImageUrls.map(url => ({
          path: url.replace('https://x8ki-letl-twmt.n7.xano.io', ''),
          name: url.split('/').pop(),
          type: 'image',
          access: 'public',
          size: 0,
          mime: 'image/jpeg',
          meta: { filename: url.split('/').pop() }
        }));

        imageForXano = imageObjects.length === 1 ? imageObjects[0] : imageObjects;
      }

      const servicioData = {
        nombre: formServicio.nombre,
        descripcion: formServicio.descripcion,
        precio: parseFloat(formServicio.precio),
        categoria: formServicio.categoria,
        service_category_id: formServicio.service_category_id || null,
        imagen: imageForXano,
        disponibilidad: formServicio.disponibilidad,
        proveedor: formServicio.proveedor,
        // schedules template removed: concrete time slots are created via AdminScheduleEditor
        creado_por: user.id
      };

      

      let response;
      if (servicioEditando) {
        response = await serviciosAPI.update(servicioEditando.id, servicioData);

        // Las imágenes ya están incluidas en servicioData.imagen, no necesitamos adjuntarlas por separado

        // Actualizar en la lista local
        setServicios(prev => prev.map(s => 
          s.id === servicioEditando.id ? { ...response, id: servicioEditando.id } : s
        ));

        setShowAlert({
          show: true,
          variant: 'success',
          message: ` Servicio actualizado exitosamente${allImageUrls.length > 0 ? ` con ${allImageUrls.length} imagen${allImageUrls.length > 1 ? 'es' : ''}` : ''}`
        });
      } else {
        // Crear el servicio con la imagen incluida en el payload
        const created = await serviciosAPI.create(servicioData);

        // Intentar obtener el servicio recién creado desde la API para asegurar que tenga los campos actualizados
        let refreshed = created;
        try {
          if (serviciosAPI && serviciosAPI.getById) {
            refreshed = await serviciosAPI.getById(created.id);
          }
        } catch (fetchErr) {
          console.warn('No se pudo refrescar el servicio creado, se usará el objeto local:', fetchErr);
          refreshed = created;
        }

        // Agregar a la lista local
        setServicios(prev => [...prev, refreshed]);

        setShowAlert({
          show: true,
          variant: 'success',
          message: `✅ Servicio creado exitosamente${allImageUrls.length > 0 ? ` con ${allImageUrls.length} imagen${allImageUrls.length > 1 ? 'es' : ''}` : ''}`
        });

        // Mantener el modal abierto y cambiar a modo edición para que el admin pueda
        // crear franjas concretas (service_time_slot) para el servicio recién creado.
        setServicioEditando(refreshed);
        // Ajustar el formulario para reflejar el servicio creado
        setFormServicio({
          nombre: refreshed.nombre || '',
          descripcion: refreshed.descripcion || '',
          precio: refreshed.precio ? String(refreshed.precio) : '',
          categoria: refreshed.categoria || '',
          service_category_id: refreshed.service_category_id || '',
          imagen: refreshed.imagen_url || refreshed.imagen || '',
          imagen_data: refreshed.imagen_data || refreshed.imagen_url || refreshed.imagen || '',
          imageFiles: [],
          currentImages: refreshed.imagenes && refreshed.imagenes.length ? refreshed.imagenes : (refreshed.imagen_url ? [refreshed.imagen_url] : []),
          disponibilidad: refreshed.disponibilidad || '',
          proveedor: refreshed.proveedor || ''
        });
      }

      // Si estábamos editando, cerramos el modal tras el mensaje; si acabamos de crear,
      // dejamos el modal abierto para que el admin pueda crear franjas concretas.
      if (servicioEditando) {
        setTimeout(() => {
          setShowModalServicio(false);
        }, 1500);
      }
    } catch (error) {
      console.error('Error al guardar servicio:', error);
      setShowAlert({
        show: true,
        variant: 'danger',
        message: `Error al ${servicioEditando ? 'actualizar' : 'crear'} el servicio: ` + (error.response?.data?.message || error.message || 'Error desconocido')
      });
    } finally {
      setLoading(false);
    }
  };

  // Funciones para blogs
  const handleBlogChange = (e) => {
    const { name, value, files, type } = e.target;
    
    // Manejar archivos de imagen
    if (type === 'file' && name === 'imageFiles') {
      const fileArray = Array.from(files || []);
      
      // Validar que solo sean archivos JPEG
      const invalidFiles = fileArray.filter(file => 
        !file.type.includes('jpeg') && !file.type.includes('jpg')
      );
      
      if (invalidFiles.length > 0) {
        setShowAlert({
          show: true,
          variant: 'danger',
          message: `Solo se permiten imágenes JPEG. Archivos rechazados: ${invalidFiles.map(f => f.name).join(', ')}`
        });
        return;
      }
      
      // Agregar solo archivos JPEG válidos
      const validFiles = fileArray.filter(file => 
        file.type.includes('jpeg') || file.type.includes('jpg')
      );

      // Append: no reemplazar la lista existente para permitir seleccionar múltiples veces
      setFormBlog(prev => ({ ...prev, imageFiles: [...(prev.imageFiles || []), ...validFiles] }));
      return;
    }
    
    setFormBlog(prev => ({ ...prev, [name]: value }));
  };

  // Función para remover imagen actual de blog (URLs existentes)
  const removeCurrentBlogImage = (imageIndex) => {
    setFormBlog(prev => ({
      ...prev,
      currentImages: prev.currentImages.filter((_, index) => index !== imageIndex)
    }));
  };

  // Función para remover archivo nuevo de blog seleccionado
  const removeNewBlogImage = (fileIndex) => {
    setFormBlog(prev => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, index) => index !== fileIndex)
    }));
  };

  const handleCreateBlog = () => {
    setBlogEditando(null);
    setFormBlog({
      titulo: '',
      categoria: 'Tendencias',
      blog_category_id: categoriasBlog && categoriasBlog[0] ? categoriasBlog[0].id : 1,
      imagen: '',
      imageFiles: [],
      currentImages: [],
      contenido: '',
      subtitulos: '',
      fecha_publicacion: new Date().toISOString().split('T')[0]
    });
    setShowModalBlog(true);
  };

  const handleEditBlog = (blog) => {
    setBlogEditando(blog);
    
    // Convertir imagen (posible array/obj) a array de URLs si es necesario
    let currentImages = [];
    if (Array.isArray(blog.imagenes) && blog.imagenes.length) {
      currentImages = blog.imagenes;
    } else if (blog.imagen_url) {
      // imagen_url puede ser string o objeto
      if (typeof blog.imagen_url === 'string') currentImages = [blog.imagen_url];
      else if (Array.isArray(blog.imagen_url)) {
        currentImages = blog.imagen_url.map(item => (typeof item === 'string' ? item : (item.path ? (item.path.startsWith('http') ? item.path : `https://x8ki-letl-twmt.n7.xano.io${item.path}`) : (item.url || item.file?.url || null)))).filter(Boolean);
      } else if (typeof blog.imagen_url === 'object' && blog.imagen_url.path) {
        const p = blog.imagen_url.path.startsWith('http') ? blog.imagen_url.path : `https://x8ki-letl-twmt.n7.xano.io${blog.imagen_url.path}`;
        currentImages = [p];
      }
    }
    
    const formatToInputDate = (val) => {
      if (!val && val !== 0) return '';
      // If it's a numeric timestamp (ms) or string number
      const n = Number(val);
      if (!Number.isNaN(n) && n !== 0) {
        const d = new Date(n);
        if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }
      // Try ISO parse
      const d2 = new Date(val);
      if (!Number.isNaN(d2.getTime())) return d2.toISOString().split('T')[0];
      return '';
    };

    setFormBlog({
      titulo: blog.titulo,
      categoria: blog.categoria,
      blog_category_id: blog.blog_category_id ?? blog.blogCategoryId ?? (typeof blog.categoria === 'number' ? Number(blog.categoria) : undefined),
      imagen: blog.imagen_url || blog.imagen || '',
      imageFiles: [], // Al editar, no hay archivos seleccionados inicialmente
      currentImages: currentImages, // Imágenes actuales del blog
      contenido: blog.contenido,
      subtitulos: blog.subtitulos || '',
      fecha_publicacion: formatToInputDate(blog.fecha_publicacion ?? blog.publication_date ?? '')
    });
    setShowModalBlog(true);
  };

  const handleDeleteBlog = async (blogId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este blog?')) {
      try {
        setLoading(true);
        await blogsAPI.delete(blogId);
        
        // Actualizar la lista local
        setBlogs(prev => prev.filter(b => b.id !== blogId));
        
        setShowAlert({
          show: true,
          variant: 'success',
          message: 'Blog eliminado exitosamente'
        });
      } catch (error) {
        console.error('Error al eliminar blog:', error);
        setShowAlert({
          show: true,
          variant: 'danger',
          message: 'Error al eliminar el blog'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Nota: Se removieron las acciones de aprobar/rechazar desde el panel.
  // La gestión de publicación queda simplificada: el admin puede crear, editar o eliminar.

  const handleSaveBlog = async (e) => {
    e.preventDefault();

    if (!formBlog.titulo || !formBlog.contenido) {
      setShowAlert({ show: true, variant: 'danger', message: 'Por favor completa título y contenido' });
      return;
    }

    try {
      setLoading(true);
      
      // Combinar imágenes actuales con nuevas imágenes subidas
      let allImageUrls = [...formBlog.currentImages]; // Empezar con las imágenes actuales
      
      // Subir nuevas imágenes si hay archivos seleccionados
      let xanoImageObjects = [];
      if (formBlog.imageFiles && formBlog.imageFiles.length > 0) {
        try {
          const uploadResult = await xanoUploadImages(formBlog.imageFiles);
          xanoImageObjects = Array.isArray(uploadResult) ? uploadResult : [];
          const uploadedUrls = xanoImageObjects.map(img => {
            const p = img?.path || img?.url || img?.file?.url;
            return p ? (p.startsWith('http') ? p : `https://x8ki-letl-twmt.n7.xano.io${p}`) : null;
          }).filter(Boolean);
          allImageUrls = [...allImageUrls, ...uploadedUrls]; // Agregar nuevas URLs
        } catch (uploadError) {
          console.error('Error al subir imágenes:', uploadError);
          setShowAlert({
            show: true,
            variant: 'warning',
            message: 'Error al subir algunas imágenes. Se guardará con las imágenes disponibles.'
          });
        }
      }

      // Preparar payload: preferir enviar objetos completos si están disponibles
      let imageUrlForXano = null;
      if (xanoImageObjects.length > 0) {
        imageUrlForXano = xanoImageObjects.length === 1 ? xanoImageObjects[0] : xanoImageObjects;
      } else if (allImageUrls.length > 0) {
        // Convertir URLs existentes a objetos esperados por Xano (agregar size y mime para validación)
        const objs = allImageUrls.map(url => ({
          path: url.replace('https://x8ki-letl-twmt.n7.xano.io', ''),
          name: url.split('/').pop(),
          type: 'image',
          access: 'public',
          size: 0,
          mime: 'image/jpeg',
          meta: { filename: url.split('/').pop() }
        }));
        imageUrlForXano = objs.length === 1 ? objs[0] : objs;
      }

      const blogData = {
        titulo: formBlog.titulo,
        subtitulos: formBlog.subtitulos,
        categoria: formBlog.categoria,
        blog_category_id: formBlog.blog_category_id || undefined,
        imagen: imageUrlForXano, // Usar el nuevo campo [image]
        contenido: formBlog.contenido,
        publication_date: formBlog.fecha_publicacion || new Date().toISOString(),
        estado: 'Active',
        autor_id: user.id
      };

      let response;
      if (blogEditando) {
        response = await blogsAPI.update(blogEditando.id, blogData);

        // Si se seleccionaron archivos nuevos, subirlos y adjuntarlos
        if (formBlog.imageFiles && formBlog.imageFiles.length > 0) {
          try {
            const uploadResult = await xanoUploadImages(formBlog.imageFiles);
            await attachImagesToBlog(blogEditando.id, uploadResult);
          } catch (err) {
            console.warn('No se pudieron adjuntar nuevas imágenes al blog actualizado:', err);
          }
        }

        // Actualizar en la lista local (intentar refrescar con la versión del servidor)
        try {
          const refreshed = await blogsAPI.getById(blogEditando.id);
          setBlogs(prev => prev.map(b => b.id === blogEditando.id ? refreshed : b));
        } catch {
          setBlogs(prev => prev.map(b => b.id === blogEditando.id ? { ...response, id: blogEditando.id } : b));
        }

        setShowAlert({
          show: true,
          variant: 'success',
          message: `Blog actualizado exitosamente${allImageUrls.length > 0 ? ` con ${allImageUrls.length} imagen${allImageUrls.length > 1 ? 'es' : ''}` : ''}`
        });
      } else {
        // MÉTODO ACTUAL: Crear el blog primero SIN imágenes para evitar problemas de mapeo o coerción
        
        // ALTERNATIVA: Usar createBlogWithImage para crear blog con imagen en una sola llamada
        /*
        if (formBlog.imageFiles && formBlog.imageFiles.length > 0) {
          const blogData = {
            title: formBlog.titulo,
            content: formBlog.contenido,
            subtitulos: formBlog.subtitulos,
            user_id: user.id,
            blog_category_id: formBlog.blog_category_id,
            status: 'publicado'
          };
          const createdBlog = await createBlogWithImage(blogData, formBlog.imageFiles[0]);
          setBlogs(prev => [...prev, createdBlog]);
          setShowAlert({ show: true, variant: 'success', message: 'Blog creado exitosamente con imagen' });
          return;
        }
        */
        
        const blogPayload = {
          titulo: formBlog.titulo,
          categoria: formBlog.categoria,
          contenido: formBlog.contenido,
          subtitulos: formBlog.subtitulos,
          autor_id: user.id,
          // Por defecto crear blogs como activos
          estado: 'Active'
        };

  const createdRaw = await blogsAPI.create(blogPayload);
  // blogsAPI.create returns a mapped blog (mapBlogFromXano) or raw object; intentar obtener id
  const created = (createdRaw && createdRaw.id) ? createdRaw : (createdRaw?.data || createdRaw);
  const createdId = created?.id || created?.ID || created?.blog_id || createdRaw?.id || null;
  // blog created

  // Subir imágenes y asociarlas si hay archivos seleccionados
  if (formBlog.imageFiles && formBlog.imageFiles.length > 0 && createdId && !createdRaw?._is_fallback) {
            try {
            const uploaded = await xanoUploadImages(formBlog.imageFiles);
            await attachImagesToBlog(createdId, uploaded);
          } catch (err) {
            console.error('Error subiendo/adjuntando imágenes al nuevo blog:', err);
            setShowAlert({ show: true, variant: 'warning', message: 'El blog se creó, pero hubo un problema al subir/adjuntar algunas imágenes.' });
          }
        }

        // Refrescar el blog creado para asegurar imagenes y campos (solo si no es fallback)
        if (createdRaw?._is_fallback) {
          console.warn('blogsAPI.create devolvió fallback; se omite getById y se añade localmente:', createdRaw);
          setBlogs(prev => [...prev, createdRaw]);
        } else {
            try {
            if (!createdId) throw new Error('createdId indefinido, no se puede refrescar');
            const refreshedBlog = await blogsAPI.getById(createdId);
            setBlogs(prev => [...prev, refreshedBlog]);
          } catch (fetchErr) {
            console.warn('No se pudo refrescar el blog creado, agregando el objeto creado localmente', fetchErr);
            const fallback = created && created.id ? created : { ...created, id: createdId || Date.now() };
            setBlogs(prev => [...prev, fallback]);
          }
        }

        setShowAlert({
          show: true,
          variant: 'success',
          message: ` Blog creado exitosamente${allImageUrls.length > 0 ? ` con ${allImageUrls.length} imagen${allImageUrls.length > 1 ? 'es' : ''}` : ''}`
        });
      }

      // Cerrar modal con delay para que el usuario vea el mensaje
      setTimeout(() => {
        setShowModalBlog(false);
      }, 1500);
    } catch (error) {
      console.error('Error al guardar blog:', error);
      setShowAlert({
        show: true,
        variant: 'danger',
        message: 'Error al guardar el blog'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        setLoading(true);
        await usuariosAPI.delete(userId);
        
        // Actualizar la lista local
        setUsuarios(prev => prev.filter(u => u.id !== userId));
        
        setShowAlert({
          show: true,
          variant: 'success',
          message: 'Usuario eliminado exitosamente'
        });
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
        setShowAlert({
          show: true,
          variant: 'danger',
          message: 'Error al eliminar el usuario'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Bloquear / Desbloquear usuario
  // userId: id del usuario a modificar
  // state: true = desbloqueado, false = bloqueado
  const toggleUserState = async (userId, state) => {
    // Solo administradores pueden ejecutar esta acción
    if (!amIAdmin) {
      setShowAlert({ show: true, variant: 'warning', message: 'No autorizado: solo administradores pueden cambiar el estado de usuarios.' });
      return null;
    }

    // Proteger contra bloquearse a uno mismo desde la UI
    if (user && user.id === userId && state === false) {
      setShowAlert({ show: true, variant: 'warning', message: 'No puedes bloquear tu propia cuenta desde la interfaz. Pide a otro administrador que lo haga.' });
      return null;
    }

    const action = state ? 'desbloquear' : 'bloquear';
    const actionPastParticiple = state ? 'desbloqueado' : 'bloqueado';
    if (!window.confirm(`¿Deseas ${action} al usuario con id ${userId}?`)) return null;

    try {
      setLoading(true);
      // Usar la API existente para actualizar el campo `state`
      const updated = await usuariosAPI.update(userId, { state });

      // Actualizar la lista local de usuarios
      setUsuarios(prev => prev.map(u => (u.id === updated.id ? updated : u)));

      setShowAlert({ show: true, variant: 'success', message: `Usuario ${actionPastParticiple} correctamente.` });
      return updated;
    } catch (err) {
      console.error(`Error al ${action} usuario:`, err);
      // Mensajes amigables según tipo de error
      const status = err?.response?.status;
      if (status === 404) {
        setShowAlert({ show: true, variant: 'danger', message: 'Usuario no encontrado.' });
      } else if (status === 403 || status === 401) {
        setShowAlert({ show: true, variant: 'danger', message: 'No autorizado para realizar esta acción.' });
      } else if (err?.code === 'ECONNABORTED' || err?.message?.toLowerCase()?.includes('timeout')) {
        setShowAlert({ show: true, variant: 'danger', message: 'Error de conexión: tiempo de espera agotado.' });
      } else {
        setShowAlert({ show: true, variant: 'danger', message: 'Error al actualizar el estado del usuario.' });
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Cambiar rol de usuario (extraído para pasar a componente independiente)
  const handleChangeUserRole = async (usuario, newRole) => {
    if (!amIAdmin) {
      setShowAlert({ show: true, variant: 'warning', message: 'No autorizado: solo administradores pueden cambiar roles.' });
      return;
    }

    if (usuario.id === user.id && newRole !== 2) {
      setShowAlert({ show: true, variant: 'warning', message: 'No puedes auto-demotarte desde la interfaz. Pide a otro administrador que lo haga.' });
      return;
    }

    const ok = window.confirm(`¿Cambiar rol de ${usuario.email} a ${newRole === 2 ? 'Administrador' : 'Cliente'}?`);
    if (!ok) return;

    try {
      setLoading(true);
      const updated = await usuariosAPI.update(usuario.id, { rol: newRole === 2 ? 'admin' : 'cliente' });
      setUsuarios(prev => prev.map(u => (u.id === updated.id ? updated : u)));
      setShowAlert({ show: true, variant: 'success', message: 'Rol actualizado correctamente' });
    } catch (err) {
      console.error('Error actualizando rol:', err);
      setShowAlert({ show: true, variant: 'danger', message: 'Error al actualizar el rol' });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="admin-panel" style={{ minHeight: '100vh', paddingTop: '120px' }}>
      {/* Navbar Admin */}
      <nav className="navbar navbar-expand-lg admin-navbar mb-4 fixed-top" style={{ top: '0' }}>
        <Container>
          <span className="navbar-brand">
            <i className="bi bi-shield-lock-fill"></i> Panel Administrador
            <span className="fw-bold ambiente-nombre"> | AmbienteFest</span>
          </span>
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#adminNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="adminNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <span className="nav-link">Hola, {user?.nombre}</span>
              </li>
              <li className="nav-item">
                <button 
                  className="nav-link btn btn-link"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Cerrar Sesión
                </button>
              </li>
            </ul>
          </div>
        </Container>
      </nav>

      <Container fluid style={{ paddingTop: '80px' }}>
        {loading && (
          <div className="text-center mb-4">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
          </div>
        )}

        {showAlert.show && (
          <Alert 
            variant={showAlert.variant}
            onClose={() => setShowAlert({ ...showAlert, show: false })}
            dismissible
          >
            {showAlert.message}
          </Alert>
        )}

        {error && (
            <Alert variant="warning" className="mb-4">
            <Alert.Heading>Advertencia</Alert.Heading>
            <p>{error}</p>
            <button type="button" className="af-btn af-btn-outline-warning" onClick={cargarDatos}>
              Reintentar carga de datos
            </button>
          </Alert>
        )}

        {/* Mensaje de bienvenida */}
        <Alert variant="success" className="mb-4">
          <div className="d-flex align-items-center">
            <i className="bi bi-shield-lock-fill me-2 fs-4"></i>
            <div>
              <h5 className="mb-1">¡Bienvenido al Panel de Administración!</h5>
              <p className="mb-0">
                Hola <strong>{user?.nombre}</strong>, desde aquí puedes gestionar servicios, usuarios y blogs del sistema.
              </p>
            </div>
          </div>
        </Alert>

        {/* Navegación de pestañas (desktop) y select (mobile) */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div style={{ flex: 1 }}>
            <Nav variant="tabs" className="d-none d-sm-flex">
              <Nav.Item>
                <Nav.Link 
                  active={activeTab === 'servicios'}
                  onClick={() => setActiveTab('servicios')}
                >
                  Gestión de Servicios
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link 
                  active={activeTab === 'usuarios'}
                  onClick={() => setActiveTab('usuarios')}
                >
                  Gestión de Usuarios
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link 
                  active={activeTab === 'blogs'}
                  onClick={() => setActiveTab('blogs')}
                >
                  Gestión de Blogs
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'pagos'}
                  onClick={() => setActiveTab('pagos')}
                >
                  Gestión de Pagos
                </Nav.Link>
              </Nav.Item>
            </Nav>

            {/* Mobile select (very small screens) */}
            <div className="d-block d-sm-none">
              <select
                className="form-select admin-tab-select"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                aria-label="Seleccionar sección del admin"
              >
                <option value="servicios">Gestión de Servicios</option>
                <option value="usuarios">Gestión de Usuarios</option>
                <option value="blogs">Gestión de Blogs</option>
                <option value="pagos">Gestión de Pagos</option>
              </select>
            </div>
          </div>

          <div className="text-end">
            <small className="text-muted">Panel de Administración</small>
            <br />
            <small className="text-success">
              <i className="bi bi-check-circle"></i> Conectado como {user?.nombre}
            </small>
          </div>
        </div>

        {/* Gestión de Servicios (componente independiente) */}
        {activeTab === 'servicios' && (
          <AdminServices
            filteredServicios={filteredServicios}
            searchServicios={searchServicios}
            setSearchServicios={setSearchServicios}
            handleCreateService={handleCreateService}
            handleEditService={handleEditService}
            handleDeleteService={handleDeleteService}
            categoriasServicios={categoriasServicios}
            formatPrice={formatPrice}
            loading={loading}
          />
        )}

        {/* Gestión de Usuarios (componente independiente) */}
        {activeTab === 'usuarios' && (
          <AdminUsers
            filteredUsuarios={filteredUsuarios}
            searchUsuarios={searchUsuarios}
            setSearchUsuarios={setSearchUsuarios}
            amIAdmin={amIAdmin}
            user={user}
            toggleUserState={toggleUserState}
            handleDeleteUser={handleDeleteUser}
            setShowModalUsuario={setShowModalUsuario}
            setFormUsuario={setFormUsuario}
            handleChangeUserRole={handleChangeUserRole}
            loading={loading}
          />
        )}

        {/* Modal para crear/editar usuario */}
        <Modal show={showModalUsuario} onHide={() => setShowModalUsuario(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Nuevo Usuario</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={async (e) => {
              e.preventDefault();
              // Validación mínima
              if (!formUsuario.nombre || !formUsuario.apellidos || !formUsuario.email || !formUsuario.password) {
                setShowAlert({ show: true, variant: 'danger', message: 'Completa todos los campos obligatorios' });
                return;
              }

              try {
                setLoading(true);
                // usuariosAPI.create expects spanish fields (nombre, apellidos, email, password) and uses frontendUser.rol
                const payload = { ...formUsuario };
                const created = await usuariosAPI.create(payload);
                // Mapear y limpiar contraseña
                const createdClean = { ...created };
                delete createdClean.password;

                setUsuarios(prev => [...prev, createdClean]);
                setShowAlert({ show: true, variant: 'success', message: 'Usuario creado exitosamente' });
                setShowModalUsuario(false);
              } catch (err) {
                console.error('Error creando usuario desde Admin:', err);
                setShowAlert({ show: true, variant: 'danger', message: 'Error al crear el usuario' });
              } finally {
                setLoading(false);
              }
            }}>
              <Form.Group className="mb-2">
                <Form.Label>Nombre *</Form.Label>
                <Form.Control type="text" value={formUsuario.nombre} onChange={(e) => setFormUsuario(prev => ({ ...prev, nombre: e.target.value }))} required />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Apellidos *</Form.Label>
                <Form.Control type="text" value={formUsuario.apellidos} onChange={(e) => setFormUsuario(prev => ({ ...prev, apellidos: e.target.value }))} required />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Email *</Form.Label>
                <Form.Control type="email" value={formUsuario.email} onChange={(e) => setFormUsuario(prev => ({ ...prev, email: e.target.value }))} required />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Contraseña *</Form.Label>
                <Form.Control type="password" value={formUsuario.password} onChange={(e) => setFormUsuario(prev => ({ ...prev, password: e.target.value }))} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Rol *</Form.Label>
                <Form.Select value={formUsuario.rol} onChange={(e) => setFormUsuario(prev => ({ ...prev, rol: e.target.value }))}>
                  <option value="cliente">Cliente</option>
                  <option value="admin">Administrador</option>
                </Form.Select>
              </Form.Group>

              <button type="submit" className="af-btn af-btn-primary w-100">Crear Usuario</button>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Gestión de Blogs (componente independiente) */}
        {activeTab === 'blogs' && (
          <AdminBlogs
            filteredBlogs={filteredBlogs}
            searchBlogs={searchBlogs}
            setSearchBlogs={setSearchBlogs}
            handleCreateBlog={handleCreateBlog}
            handleEditBlog={handleEditBlog}
            handleDeleteBlog={handleDeleteBlog}
            categoriasBlog={categoriasBlog}
            isAdmin={isAdmin}
          />
        )}

        {/* Gestión de Pagos (nuevo componente) */}
        {activeTab === 'pagos' && (
          <GestionPagos />
        )}
        {/* Gestión de Pedidos removida — solo Gestión de Pagos permanece */}
      </Container>

      {/* Modal para Nuevo/Editar Servicio */}
      <Modal show={showModalServicio} onHide={() => setShowModalServicio(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {servicioEditando ? 'Editar Servicio' : 'Nuevo Servicio'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Alert dentro del modal */}
          {showAlert.show && (
            <Alert 
              variant={showAlert.variant}
              onClose={() => setShowAlert({ ...showAlert, show: false })}
              dismissible
              className="mb-3"
            >
              {showAlert.message}
            </Alert>
          )}
          
          <Form onSubmit={handleSaveService}>
            <Form.Group className="mb-2">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control
                type="text"
                name="nombre"
                value={formServicio.nombre}
                onChange={handleServiceChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Descripción *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="descripcion"
                value={formServicio.descripcion}
                onChange={handleServiceChange}
                required
                placeholder="Descripción del servicio"
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Precio *</Form.Label>
              <Form.Control
                type="number"
                name="precio"
                value={formServicio.precio}
                onChange={handleServiceChange}
                required
                placeholder="Precio en CLP"
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Disponibilidad *</Form.Label>
              <Form.Control
                type="text"
                name="disponibilidad"
                value={formServicio.disponibilidad}
                onChange={handleServiceChange}
                required
                placeholder="Ej: Lunes a Viernes"
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Categoría *</Form.Label>
              <Form.Select
                name="categoria"
                value={formServicio.categoria}
                onChange={handleServiceChange}
                required
                disabled={categoriasServicios.length === 0}
              >
                {categoriasServicios.length === 0 ? (
                  <option value="">No hay categorías disponibles</option>
                ) : (
                  categoriasServicios.filter(cat => cat && (cat.name || cat)).map(cat => (
                    <option key={cat.id || cat} value={cat.name || cat}>{cat.name || cat}</option>
                  ))
                )}
              </Form.Select>
              {categoriasServicios.length === 0 && (
                <Form.Text className="text-muted">
                  Las categorías se cargan desde la base de datos. Verifica la conexión a Xano.
                </Form.Text>
              )}
            </Form.Group>

            {/* Campo oculto para almacenar el service_category_id (enviarlo al backend) */}
            <Form.Control type="hidden" name="service_category_id" value={formServicio.service_category_id} onChange={handleServiceChange} />

            <Form.Group className="mb-2">
              <Form.Label>Proveedor *</Form.Label>
              <Form.Control
                type="text"
                name="proveedor"
                value={formServicio.proveedor}
                onChange={handleServiceChange}
                required
                placeholder="Nombre del proveedor"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Imágenes</Form.Label>
              <MultiFileInput
                name="imageFiles"
                accept="image/jpeg,image/jpg,.jpg,.jpeg"
                multiple={true}
                onChange={handleServiceChange}
                files={formServicio.imageFiles}
                placeholder="Selecciona imágenes JPEG para el servicio"
              />
              <Form.Text className="text-muted">
                <i className="bi bi-info-circle"></i> Solo se permiten imágenes JPEG/JPG
              </Form.Text>
              
              {/* Se ha removido el botón de prueba de subida (test-only) */}
              
              {/* Mostrar imágenes actuales */}
              {formServicio.currentImages?.length > 0 && (
                <div className="mt-3">
                  <small className="text-muted d-block mb-2">Imágenes actuales:</small>
                  <ImagePreview 
                    images={formServicio.currentImages} 
                    onRemove={removeCurrentServiceImage}
                    maxHeight="120px"
                  />
                </div>
              )}
              
              {/* Mostrar preview de nuevas imágenes seleccionadas */}
              {formServicio.imageFiles?.length > 0 ? (
                <div className="mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-success">
                      <i className="bi bi-check-circle"></i> Nuevas imágenes ({formServicio.imageFiles.length}):
                    </small>
                    <button
                      type="button"
                      className="af-btn af-btn-outline-secondary af-btn-sm"
                      onClick={clearNewServiceImages}
                      title="Limpiar todas las imágenes nuevas"
                    >
                      <i className="bi bi-trash"></i> Limpiar
                    </button>
                  </div>
                  <ImagePreview 
                    images={formServicio.imageFiles} 
                    onRemove={removeNewServiceImage}
                    maxHeight="120px"
                  />
                </div>
              ) : (
                <div className="mt-3 p-3 border border-dashed border-secondary rounded text-center">
                  <i className="bi bi-cloud-upload text-muted" style={{ fontSize: '2rem' }}></i>
                  <p className="text-muted mb-0">
                    No hay imágenes seleccionadas
                  </p>
                  <small className="text-muted">
                    Haz clic en el botón "Examinar" y selecciona una o más imágenes
                  </small>
                </div>
              )}
            </Form.Group>

            {/* Horarios: gestione franjas concretas usando el editor de horarios (AdminScheduleEditor) */}
            <div className="mb-3">
              <AdminScheduleEditor serviceId={servicioEditando?.id || null} />
            </div>

            <button type="submit" className="af-btn af-btn-primary w-100 btn-admin" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                servicioEditando ? 'Actualizar Servicio' : 'Guardar Servicio'
              )}
            </button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal para Nuevo/Editar Blog */}
      <Modal show={showModalBlog} onHide={() => setShowModalBlog(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {blogEditando ? 'Editar Blog' : 'Nuevo Blog'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Alert dentro del modal de blog */}
          {showAlert.show && (
            <Alert 
              variant={showAlert.variant}
              onClose={() => setShowAlert({ ...showAlert, show: false })}
              dismissible
              className="mb-3"
            >
              {showAlert.message}
            </Alert>
          )}
          
          <Form onSubmit={handleSaveBlog}>
            <Form.Group className="mb-3">
              <Form.Label>Subtítulo</Form.Label>
              <Form.Control
                type="text"
                name="subtitulos"
                value={formBlog.subtitulos}
                onChange={handleBlogChange}
                placeholder="Subtítulo del blog"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Fecha de publicación</Form.Label>
              <Form.Control
                type="date"
                name="fecha_publicacion"
                value={formBlog.fecha_publicacion}
                onChange={handleBlogChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Título *</Form.Label>
              <Form.Control
                type="text"
                name="titulo"
                value={formBlog.titulo}
                onChange={handleBlogChange}
                required
                placeholder="Título del blog"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Categoría *</Form.Label>
              <Form.Select
                name="blog_category_id"
                value={formBlog.blog_category_id ?? ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const found = categoriasBlog.find(c => String(c.id) === String(selectedId));
                  setFormBlog(prev => ({ ...prev, blog_category_id: selectedId, categoria: found ? found.name : prev.categoria }));
                }}
                required
                disabled={categoriasBlog.length === 0}
              >
                {categoriasBlog.length === 0 ? (
                  <option value="">No hay categorías disponibles</option>
                ) : (
                  categoriasBlog.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                )}
              </Form.Select>
              {categoriasBlog.length === 0 && (
                <Form.Text className="text-muted">
                  Las categorías se cargan desde la base de datos. Verifica la conexión a Xano.
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Imágenes</Form.Label>
              <MultiFileInput
                name="imageFiles"
                accept="image/*"
                multiple={true}
                onChange={handleBlogChange}
                files={formBlog.imageFiles}
                placeholder="Selecciona imágenes para el blog"
              />
              <Form.Text className="text-muted">
                <i className="bi bi-info-circle"></i> Se permiten todos los tipos de imagen
              </Form.Text>
              
              {/* Diagnostic buttons removed from admin UI to avoid depending on testing helpers */}
              
              {/* Mostrar imágenes actuales */}
              {formBlog.currentImages?.length > 0 && (
                <div className="mt-3">
                  <small className="text-muted d-block mb-2">Imágenes actuales:</small>
                  <ImagePreview 
                    images={formBlog.currentImages} 
                    onRemove={removeCurrentBlogImage}
                    maxHeight="120px"
                  />
                </div>
              )}
              
              {/* Mostrar preview de nuevas imágenes seleccionadas */}
              {formBlog.imageFiles?.length > 0 && (
                <div className="mt-3">
                  <small className="text-success d-block mb-2">
                    Nuevas imágenes ({formBlog.imageFiles.length}):
                  </small>
                  <ImagePreview 
                    images={formBlog.imageFiles} 
                    onRemove={removeNewBlogImage}
                    maxHeight="120px"
                  />
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contenido *</Form.Label>
              <Form.Control
                as="textarea"
                rows={8}
                name="contenido"
                value={formBlog.contenido}
                onChange={handleBlogChange}
                required
                placeholder="Contenido del blog..."
              />
            </Form.Group>

            <button type="submit" className="af-btn af-btn-primary w-100 btn-admin" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                blogEditando ? 'Actualizar Blog' : 'Guardar Blog'
              )}
            </button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Admin;
