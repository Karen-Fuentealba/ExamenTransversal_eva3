import api from './api';

// Variable interna para el parámetro de subida; por defecto 'content[]'
let correctUploadParameter = 'content[]';

export function setUploadParameter(param) {
  correctUploadParameter = param;
}

/**
 * uploadImages: helper para subir una o varias imágenes a Xano usando /upload/image
 * Devuelve { urls, xanoObjects }
 */
export async function uploadImages(files) {
  if (!files) throw new Error('No se proporcionaron archivos');
  
  // Normalizar a arreglo - maneja Array, FileList o archivo único
  let fileArray;
  if (files instanceof FileList) {
    fileArray = Array.from(files); // Convertir FileList a Array
  } else if (Array.isArray(files)) {
    fileArray = files;
  } else {
    fileArray = [files]; // Archivo único
  }
  
  if (fileArray.length === 0) throw new Error('Array de archivos vacío');

  // Validar que todos sean archivos válidos
  const invalidFiles = fileArray.filter(file => 
    !file || !(file instanceof File) || !file.type.startsWith('image/')
  );
  
  if (invalidFiles.length > 0) {
    throw new Error(`Solo se permiten archivos de imagen. Archivos inválidos: ${invalidFiles.length}`);
  }

  // Validar tamaño de archivos (máximo 10MB por archivo)
  const maxSize = 10 * 1024 * 1024; // 10MB
  const oversizedFiles = fileArray.filter(file => file.size > maxSize);
  
  if (oversizedFiles.length > 0) {
    throw new Error(`Archivos demasiado grandes (máximo 10MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
  }

  // Subir TODOS los archivos juntos en una sola petición (como espera Xano)
  const formData = new FormData();
  
  // Agregar todos los archivos
  fileArray.forEach((file) => {
    formData.append(correctUploadParameter, file);
  });

  const uploadEndpoint = '/upload/image';

  try {
    const response = await api.post(uploadEndpoint, formData, {
      timeout: 60000,
      headers: { 'Content-Type': 'multipart/form-data' },
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024,
    });

    const data = response.data;
    let processedData = data;
    if (data && !Array.isArray(data)) {
      if (data.files && Array.isArray(data.files)) processedData = data.files;
      else if (data.data && Array.isArray(data.data)) processedData = data.data;
      else if (data.result && Array.isArray(data.result)) processedData = data.result;
      else processedData = [data];
    }

    if (!Array.isArray(processedData) || processedData.length === 0) {
      throw new Error('Xano no procesó los archivos correctamente. Verifica la configuración del Function Stack.');
    }

    const uploadedUrls = [];
    const xanoObjects = [];

    processedData.forEach((imgObj) => {
      if (!imgObj) return;
      let imagePath = imgObj.path || imgObj.url || imgObj.file_path || imgObj.src;
      if (!imagePath) return;
      const fullUrl = imagePath.startsWith('http') ? imagePath : `https://x8ki-letl-twmt.n7.xano.io${imagePath}`;
      uploadedUrls.push(fullUrl);
      xanoObjects.push(imgObj);
    });

    if (uploadedUrls.length === 0) throw new Error('No se pudieron extraer URLs de la respuesta de Xano');

    return { urls: uploadedUrls, xanoObjects };
  } catch (error) {
    console.error('Error subiendo archivos a Xano:', error);
    if (error.response?.status === 413) {
      throw new Error('Los archivos son demasiado grandes. Límite de Xano excedido.');
    } else if (error.response?.status === 400) {
      console.debug('uploadImages: 400 response body:', error.response?.data);
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        try {
          const fetchResponse = await fetch(api.defaults.baseURL + uploadEndpoint, { method: 'POST', body: formData });
          const fetchText = await fetchResponse.text().catch(() => null);
          let fetchData = null;
          try { fetchData = fetchText ? JSON.parse(fetchText) : null; } catch { fetchData = null; }
          if (fetchResponse.ok && Array.isArray(fetchData) && fetchData.length > 0) {
            const uploadedUrls = [];
            const xanoObjects = [];
            fetchData.forEach((imgObj) => {
              if (imgObj && imgObj.path) {
                const fullUrl = imgObj.path.startsWith('http') ? imgObj.path : `https://x8ki-letl-twmt.n7.xano.io${imgObj.path}`;
                uploadedUrls.push(fullUrl);
                xanoObjects.push(imgObj);
              }
            });
            if (uploadedUrls.length === 0) throw new Error('Reintento con fetch no devolvió URLs válidas');
            return { urls: uploadedUrls, xanoObjects };
          }
        } catch (fetchErr) {
          console.warn('uploadImages: fetch retry failed', fetchErr);
        }
      }
      throw new Error('Error 400: Verifica que el Function Stack en Xano espera el parámetro "content[]"');
    } else if (error.response?.data) {
      throw new Error(`Error de Xano: ${error.response.data.message || 'Error desconocido'}`);
    } else {
      throw new Error(`Error de conexión: ${error.message}`);
    }
  }
}

export async function uploadImageToXano(file) {
  const result = await uploadImages(file);
  return result.urls[0];
}

export default {
  uploadImages,
  uploadImageToXano,
  setUploadParameter
};
