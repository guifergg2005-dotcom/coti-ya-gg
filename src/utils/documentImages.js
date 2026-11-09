import { IMAGE_LIMIT, validateFieldSize } from '../../shared/dataLimits.mjs';
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export async function prepareDocumentImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Formato no admitido. Usa PNG, JPG, WebP o GIF.');
  if (file.size > 12 * 1024 * 1024) throw new Error('La imagen supera 12 MB. Reduce su tamaño antes de seleccionarla.');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('No se pudo leer la imagen. Selecciona un archivo válido.'); });
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40000000) throw new Error('La imagen tiene demasiados píxeles. Reduce su resolución.');
    let scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    for (let pass = 0; pass < 9; pass++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const value = canvas.toDataURL('image/webp', Math.max(0.55, 0.9 - pass * 0.04));
      if (value.length <= IMAGE_LIMIT) return value;
      scale *= 0.8;
    }
    throw new Error('No se pudo reducir la imagen. Usa una versión más pequeña.');
  } finally { bitmap.close(); }
}
export function validatePdfConfig(config) { validateFieldSize('pdfConfig', config); return config; }
