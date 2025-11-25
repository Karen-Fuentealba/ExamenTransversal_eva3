import api, { ENDPOINTS, cachedGet, extractArray } from './api';
import { uploadImages, } from './imagenes';

// Mapear blogs desde Xano al frontend
const mapBlogFromXano = (xanoBlog) => {
  if (!xanoBlog) return null;

  const ensureAbsolute = (p) => {
    if (!p) return '';
    if (typeof p !== 'string') return '';
    if (p.startsWith('http')) return p;
    const base = (api.defaults.baseURL || '').replace(/\/$/, '');
    const sep = p.startsWith('/') ? '' : '/';
    return `${base}${sep}${p}`;
  };

  const extractAllImageUrls = (field) => {
    if (!field) return [];

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
        const keys = Object.keys(obj).slice(0,6);
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

    if (typeof field === 'string') {
      const s = field.trim();
      if (!s) return [];
      if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) {
            const urls = parsed.map(p => {
              if (!p) return null;
              if (typeof p === 'string') return ensureAbsolute(p);
              const found = findUrlInObject(p);
              return found ? ensureAbsolute(found) : null;
            }).filter(Boolean);
            if (urls.length) return urls;
          }
          if (parsed && typeof parsed === 'object') {
            const found = findUrlInObject(parsed);
            if (found) return [ensureAbsolute(found)];
          }
        } catch {
          // fallthrough to treat as single path
        }
      }
      return [ensureAbsolute(s)];
    }

    if (Array.isArray(field)) {
      return field.map(item => {
        if (!item) return null;
        if (typeof item === 'string') return ensureAbsolute(item);
        const found = findUrlInObject(item);
        return found ? ensureAbsolute(found) : null;
      }).filter(Boolean);
    }

    if (typeof field === 'object') {
      const found = findUrlInObject(field);
      return found ? [ensureAbsolute(found)] : [];
    }

    return [];
  };

  const rawImg = xanoBlog.imagen ?? xanoBlog.imagenes ?? xanoBlog.images ?? xanoBlog.image ?? xanoBlog.imagen_url ?? xanoBlog.image_url ?? null;
  const imagenes = extractAllImageUrls(rawImg);
  const imagen_url = xanoBlog.imagen_url ?? xanoBlog.image_url ?? (imagenes.length ? imagenes[0] : null);

  return {
    id: xanoBlog.id || xanoBlog.blog_id || xanoBlog.blogId || xanoBlog.ID || null,
    titulo: xanoBlog.title,
    subtitulos: xanoBlog.subtitulos || xanoBlog.subtitle || '',
    contenido: xanoBlog.content,
    categoria: xanoBlog.category,
    blog_category_id: xanoBlog.blog_category_id ?? xanoBlog.blogCategoryId ?? xanoBlog.category_id ?? null,
    imagen_url: imagen_url,
    imagen: imagen_url,
    imagenes: imagenes,
    imagen_data: rawImg,
    fecha_publicacion: xanoBlog.publication_date,
    estado: xanoBlog.status,
    autor_id: xanoBlog.user_id,
    creado_en: xanoBlog.created_at,
    fecha: xanoBlog.publication_date,
    autor: `Usuario ${xanoBlog.user_id}`,
    _raw: xanoBlog
  };
};

// Mapear frontend -> Xano
const mapBlogToXano = (frontendBlog) => {
  const resolveFrontendImage = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (Array.isArray(field) && field.length) {
      const first = field[0];
      if (typeof first === 'string') return first;
      return first?.url || first?.file?.url || first?.file_url || first?.fileUrl || null;
    }
    if (typeof field === 'object') {
      return field.url || field.file?.url || field.file_url || field.fileUrl || null;
    }
    return null;
  };

  // Defensivo: preferir campo imagen del frontend
  const imageData = frontendBlog.imagen ?? frontendBlog.imagen_url;

  return {
    title: frontendBlog.titulo,
    subtitulos: frontendBlog.subtitulos || frontendBlog.subtitle || '',
    content: frontendBlog.contenido,
    category: frontendBlog.categoria,
    imagen: resolveFrontendImage(imageData) || imageData,
    publication_date: frontendBlog.fecha_publicacion || new Date().toISOString(),
    status: frontendBlog.estado || 'Active',
    user_id: frontendBlog.autor_id || frontendBlog.user_id,
    blog_category_id: (() => {
      const cat = frontendBlog.categoria;
      if (cat === undefined || cat === null || cat === '') return undefined;
      if (!Number.isNaN(Number(cat)) && String(cat).trim() !== '') return Number(cat);
      const CATEGORY_MAP = { 'Tendencia':1, 'Tendencias':1, 'Consejos':2, 'Experiencias':3 };
      if (CATEGORY_MAP[cat]) return CATEGORY_MAP[cat];
      const lower = String(cat).toLowerCase();
      for (const [k,v] of Object.entries(CATEGORY_MAP)) if (k.toLowerCase() === lower) return v;
      return undefined;
    })()
  };
};

// Normalizar elementos imagen a la forma mínima que los Function Stacks de Xano suelen esperar.
const guessMimeFromUrl = (url) => {
  if (!url || typeof url !== 'string') return 'application/octet-stream';
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml'
  };
  return map[ext] || 'application/octet-stream';
};

const getFileNameFromUrl = (url) => {
  try {
    const u = String(url).split('?')[0];
    return u.substring(u.lastIndexOf('/') + 1) || 'file';
  } catch { return 'file'; }
};

const normalizeImagenArray = (arr) => {
  if (!arr) return [];
  if (!Array.isArray(arr)) arr = [arr];
  return arr.map(item => {
    if (!item) return { size: 0, mime: 'application/octet-stream' };
    if (typeof item === 'string') {
      const url = item;
      return { url, size: 0, mime: guessMimeFromUrl(url), name: getFileNameFromUrl(url) };
    }
    // tipo objeto
    const url = item.url || item.path || item.file?.url || item.file_url || null;
    const size = Number(item.size ?? item.file?.size ?? 0) || 0;
    const mime = item.type || item.mime || (url ? guessMimeFromUrl(url) : 'application/octet-stream');
    const name = item.name || getFileNameFromUrl(url || '') || 'file';
    return { ...item, url, size, mime, name };
  });
};

// Auxiliar para crear blog con imagen en un solo flujo
export async function createBlogWithImage(data, imageFile) {
  try {
    let imageObjects = [];
    if (imageFile) {
      const uploadResult = await uploadImages(imageFile);
      imageObjects = uploadResult.xanoObjects || [];
    }

    const blogPayload = {
      title: data.title,
      content: data.content,
      publication_date: new Date().toISOString(),
      status: data.status || 'Active',
      user_id: data.user_id,
      blog_category_id: data.blog_category_id,
      subtitulos: data.subtitulos || ''
    };

    if (imageObjects.length > 0) blogPayload.imagen = imageObjects;

    const response = await api.post(ENDPOINTS.BLOGS, blogPayload);
    return response.data;
  } catch (error) {
    console.error('Error al crear blog con imagen:', error.response?.data || error.message);
    throw error;
  }
}

export async function attachImagesToBlog(blogId, imagesArray) {
  let bid = blogId;
  if (blogId && typeof blogId === 'object') {
    bid = blogId.id || blogId.blog_id || blogId.ID || blogId.data?.id || null;
  }
  if (!bid) return null;

  let imgs = imagesArray;
  if (!Array.isArray(imgs)) {
    if (imgs && imgs.xanoObjects && Array.isArray(imgs.xanoObjects)) imgs = imgs.xanoObjects;
    else if (imgs && imgs.data && Array.isArray(imgs.data)) imgs = imgs.data;
    else if (imgs && imgs.files && Array.isArray(imgs.files)) imgs = imgs.files;
    else imgs = [imgs];
  }

  const validatedImages = imgs.filter(img => img && (img.path || img.url || img.file_path || img.src || typeof img === 'string'));
  if (validatedImages.length === 0) return null;

  try {
    const { data } = await api.patch(`${ENDPOINTS.BLOGS}/${bid}`, { imagen: validatedImages }, { headers: { 'Content-Type': 'application/json' } });
    return data;
  } catch (error) {
    console.error('Error attachImagesToBlog:', error.response?.data || error.message);
    throw error;
  }
}

export const blogsAPI = {
  getAll: async (includeAll = true) => {
    try {
      let data;
      try {
        // Xano requiere el parámetro `imagen` para este stack; solicitar con un array vacío explícito
        // codificado como '%5B%5D' para que el endpoint devuelva datos en lugar de 400.
        data = await cachedGet(`${ENDPOINTS.BLOGS}?imagen=%5B%5D`);
      } catch (error) {
        const resp = error.response?.data;
        // Si Xano requiere un body/param (ej. imagen) intentar un GET fallback seguro con parámetro de consulta explícito
        if (resp && (resp.code === 'ERROR_CODE_INPUT_ERROR' || (resp.message || '').toLowerCase().includes('missing param'))) {
          // Intentar varios fallbacks sensatos para el parámetro `imagen` requerido.
          // Algunos stacks de Xano esperan un array explícito ([]) o un valor no vacío.
          const fallbacks = [JSON.stringify([]), '[]', 'null', '0', ''];
          let ok = false;
          for (const fb of fallbacks) {
            try {
              const fallbackResp = await api.get(ENDPOINTS.BLOGS, { params: { imagen: fb } });
              data = fallbackResp.data;
              ok = true;
              break;
            } catch (fbErr) {
              console.warn('blogsAPI.getAll: fallback with imagen=', fb, 'failed:', fbErr.response?.data || fbErr.message);
            }
          }
          if (!ok) {
            console.warn('blogsAPI.getAll: all fallbacks failed, returning empty list.', resp);
            return [];
          }
        } else {
          throw error;
        }
      }

      const list = extractArray(data);
      let mapped = list.map(mapBlogFromXano);
      // Si includeAll es false, filtrar solo a posts probablemente 'activos'
      if (includeAll === false) {
        mapped = mapped.filter(b => {
          const s = (b.estado || '').toString().toLowerCase();
          return s === 'active' || s === 'activo' || s === 'true' || b.estado === true;
        });
      }
      return mapped;
    } catch (error) {
      console.error('Error al obtener blogs:', error.response?.data || error.message);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      if (id === undefined || id === null || id === '' || Number.isNaN(Number(id))) {
        const e = new Error('getById: id inválido o indefinido'); e.invalidId = id; throw e;
      }
      const response = await api.get(`${ENDPOINTS.BLOGS}/${id}`);
      return mapBlogFromXano(response.data);
    } catch (error) {
      console.error(' Error al obtener blog:', error.response?.data || error.message);
      throw error;
    }
  },

  create: async (blogData) => {
    try {
      if (blogData instanceof FormData) {
        const title = blogData.get('title') || '';
        const content = blogData.get('content') || '';
        if (!title.toString().trim() || !content.toString().trim()) throw new Error('Validación: title y content son requeridos');
        // Asegurar que el parámetro 'imagen' existe para satisfacer los Function Stacks de Xano que lo requieren
        if (!blogData.has('imagen')) {
          // anexar una representación de array vacío
          blogData.append('imagen', JSON.stringify([]));
        }
        const response = await api.post(ENDPOINTS.BLOGS, blogData);
        return mapBlogFromXano(response.data);
      }

      let dataToSend = mapBlogToXano(blogData);
      // Asegurar que 'imagen' existe para evitar que Xano rechace la solicitud por parámetro faltante
      if (typeof dataToSend.imagen === 'undefined' || dataToSend.imagen === null) {
        dataToSend.imagen = [];
      }

      // Normalizar elementos imagen en objetos con url,size,mime,name
      dataToSend.imagen = normalizeImagenArray(dataToSend.imagen);

      const response = await api.post(ENDPOINTS.BLOGS, dataToSend);

      const raw = response.data;
      let candidate = null;
      if (!raw) candidate = null;
      else if (Array.isArray(raw) && raw.length > 0) candidate = raw[0];
      else if (raw.id) candidate = raw;
      else if (raw.data && raw.data.id) candidate = raw.data;
      else if (raw.data && Array.isArray(raw.data) && raw.data.length > 0 && raw.data[0].id) candidate = raw.data[0];
      else if (raw.blog && raw.blog.id) candidate = raw.blog;
      else if (raw.blog_id) candidate = { ...raw, id: raw.blog_id };
      else if (raw.result && raw.result.id) candidate = raw.result;
      else {
        const keys = Object.keys(raw || {});
        for (const k of keys) {
          const v = raw[k];
          if (v && typeof v === 'object' && (v.id || v.ID || v.blog_id)) { candidate = v; break; }
        }
      }

      const toMap = candidate || raw;
      const mapped = mapBlogFromXano(toMap);
      if (!mapped || !mapped.id) {
        const fallbackId = (candidate && (candidate.id || candidate.ID || candidate.blog_id)) || Date.now();
        const fallback = { id: fallbackId, titulo: (candidate && (candidate.title || candidate.titulo)) || (raw && raw.title) || 'Sin título', contenido: (candidate && (candidate.content || candidate.contenido)) || (raw && raw.content) || '', categoria: (candidate && (candidate.category || candidate.categoria)) || (raw && raw.category) || '', imagenes: (candidate && (candidate.imagenes || candidate.images)) || [], imagen_data: candidate && (candidate.imagen || candidate.imagen_url) || null, _xano_raw: raw, _is_fallback: true };
        return fallback;
      }

      return mapped;
    } catch (error) {
      const resp = error.response?.data;
      console.error('Error al crear blog:', resp ? JSON.stringify(resp, null, 2) : error.message);
      throw error;
    }
  },

  update: async (id, blogData) => {
    try {
      const dataToSend = mapBlogToXano(blogData);
      // Normalizar elementos imagen para actualización también
      dataToSend.imagen = normalizeImagenArray(dataToSend.imagen);
      const response = await api.patch(`${ENDPOINTS.BLOGS}/${id}`, dataToSend);
      return mapBlogFromXano(response.data);
    } catch (error) {
      console.error('Error al actualizar blog:', error.response?.data || error.message);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`${ENDPOINTS.BLOGS}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar blog:', error.response?.data || error.message);
      throw error;
    }
  },

  updateStatus: async (id, estado) => {
    try {
      const response = await api.put(`${ENDPOINTS.BLOGS}/${id}/estado`, { estado });
      return response.data;
    } catch (error) {
      console.error('Error al cambiar estado del blog:', error.response?.data || error.message);
      throw error;
    }
  }
};

export const comentariosAPI = {
  getByBlogId: async (blogId) => {
    try {
      const response = await api.get(`${ENDPOINTS.BLOG_COMMENTS}?blog_id=${blogId}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener comentarios:', error);
      throw error;
    }
  },

  create: async (blogId, comentarioData) => {
    try {
      const dataToSend = { ...comentarioData, blog_id: blogId, fecha: new Date().toISOString() };
      const response = await api.post(ENDPOINTS.BLOG_COMMENTS, dataToSend);
      return response.data;
    } catch (error) {
      console.error('Error al crear comentario:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`${ENDPOINTS.BLOG_COMMENTS}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar comentario:', error);
      throw error;
    }
  }
};

export const blogCommentsAPI = {
  create: async (commentData) => {
    try {
      const response = await api.post(ENDPOINTS.BLOG_COMMENTS, commentData);
      return response.data;
    } catch (error) {
      console.error('Error creando comentario de blog:', error.response?.data || error.message);
      throw error;
    }
  },
  getByBlogId: async (blogId) => {
    try {
      const response = await api.get(ENDPOINTS.BLOG_COMMENTS + `?blog_id=${blogId}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener comentarios por id de blog:', error.response?.data || error.message);
      throw error;
    }
  }
};

export async function getBlogCategories() {
  try {
    const data = await cachedGet('/blog_category', 300000);
    if (!data) return [];

    let items = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (data && typeof data === 'object') {
      // Revisar propiedades comunes que contienen arrays
      if (Array.isArray(data.data)) items = data.data;
      else if (Array.isArray(data.result)) items = data.result;
      else if (Array.isArray(data.items)) items = data.items;
      else if (Array.isArray(data.records)) items = data.records;
      else {
        // Si es un objeto único con id y name
        const hasName = typeof data.name === 'string' && data.name.trim() !== '';
        const hasId = typeof data.id !== 'undefined' || typeof data.blog_category_id !== 'undefined';
        if (hasName || hasId) items = [data];
      }
    }

    // Mapear a formato consistente { id, name }
    const mapped = items
      .map((c, idx) => {
        if (!c) return null;
        const id = c.id ?? c.blog_category_id ?? (idx + 1);
        const name = c.name ?? c.nombre ?? c.category ?? '';
        return { id, name };
      })
      .filter(c => c && c.id != null && c.name.trim() !== '');

    return mapped;
  } catch (error) {
    console.error('Error al obtener categorías de blogs:', error);
    return [];
  }
}



export default blogsAPI;
