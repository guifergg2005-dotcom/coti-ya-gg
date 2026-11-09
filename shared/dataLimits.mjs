export const CONFIG_LIMIT = 600000;
export const QUOTE_LIMIT = 250000;
export const IMAGE_LIMIT = 175000;
const size = value => new TextEncoder().encode(JSON.stringify(value)).length;
export function validateFieldSize(field, value) {
  const limit = field === 'pdfConfig' ? CONFIG_LIMIT : field === 'currentQuote' ? QUOTE_LIMIT : field === 'defaultConditions' ? 30000 : null;
  if (limit && size(value) > limit) throw new Error(field === 'pdfConfig' ? 'Las imágenes o los datos de empresa son demasiado grandes. Reduce o quita una imagen.' : 'El documento es demasiado grande. Reduce el texto o divide la propuesta.');
}
