export const DEFAULT_CONDITIONS = `MONEDA: SOLES
FORMA DE PAGO: 50% al inicio del contrato y el 50% al finalizar el proyecto
TIEMPO DE ENTREGA: 2 días
VALIDEZ DE OFERTA: 30 días calendario
LUGAR DE ENTREGA: Instalaciones del cliente
GARANTIA: 12 meses`;

export const DEFAULT_ACCOUNTS = [
  { id: 1, banco: 'BCP SOLES GUIDO G.', moneda: 'Soles', numero: '535-01912154-0-87', cci: '002-535-101912154087-35' },
  { id: 2, banco: 'BCP SOLES SERYVER', moneda: 'Soles', numero: '535-09572834-0-48', cci: '002-535-109572834048-39' }
];

export function createDefaults() {
  const now = new Date();
  const fecha = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return {
    clients: [], history: [], inventory: [], transactions: [], workOrders: [], reminders: [],
    defaultConditions: DEFAULT_CONDITIONS,
    currentQuote: { id: Date.now(), numero: 'COT-' + now.getFullYear() + '-0000', fecha,
      cliente: { nombre: '', ruc: '', direccion: '', contacto: '', telefono: '' },
      sections: [{ id: 1, name: 'Propuesta Principal', items: [], visible: true }],
      omitIgv: false, ganancia: 0, moneda: 'S/', observaciones: DEFAULT_CONDITIONS, status: 'Pendiente' },
    pdfConfig: { color: '#d99b26', tableStyle: 'bordered', logo: null, companyName: 'SERYVER G&G S.A.C',
      companySubtitle: 'PUERTAS AUTOMÁTICAS · SEGURIDAD · MODERNIDAD · CONFORT', companyRuc: '20614510421',
      watermark: null, watermarkSize: 55, watermarkOpacity: 0.12, signature: null, accounts: DEFAULT_ACCOUNTS }
  };
}
