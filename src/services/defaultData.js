export function createDefaults() {
  const now = new Date();
  const fecha = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return {
    clients: [], history: [], inventory: [], transactions: [], workOrders: [], reminders: [],
    defaultConditions: '',
    currentQuote: { id: Date.now(), numero: 'COT-' + now.getFullYear() + '-0000', fecha,
      cliente: { nombre: '', ruc: '', direccion: '', contacto: '', telefono: '' },
      sections: [{ id: 1, name: 'Propuesta Principal', items: [], visible: true }],
      omitIgv: false, ganancia: 0, moneda: 'S/', observaciones: '', status: 'Pendiente' },
    pdfConfig: { color: '#1e3a8a', tableStyle: 'bordered', logo: null, companyName: 'SERYVER G&G S.A.C',
      companySubtitle: 'Expertos en seguridad y automatización', companyRuc: '20614510421',
      watermark: null, watermarkSize: 50, watermarkOpacity: 0.1, signature: null, accounts: [] }
  };
}
