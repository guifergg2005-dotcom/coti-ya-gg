import React, { useEffect, useMemo, useRef, useState } from 'react';
import { prepareDocumentImage, validatePdfConfig } from '../utils/documentImages';
import { isPosted } from '../utils/business';
import { renderQuoteDocument } from '../../electron/quoteDocument.mjs';
import { DEFAULT_ACCOUNTS } from '../services/defaultData';
import { ArrowLeft, Settings, Save, Printer, Palette, Building, Landmark, Trash2, FileText } from 'lucide-react';
import { calculateQuoteTotals, formatCurrency, reverseCalculateGanancia } from '../utils/math';



export default function PDFPreview({ quote, setQuote, onBack, onSave, pdfConfig, setPdfConfig: savePdfConfig, setDefaultConditions, onDuplicate }) {
  const [showConfig, setShowConfig] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printMessage, setPrintMessage] = useState('');
  const [previewHeight, setPreviewHeight] = useState(1200);
  const previewFrame = useRef(null);
  const readOnly = isPosted(quote);
  const [uploading, setUploading] = useState(false);
  const printable = useMemo(() => { try { return renderQuoteDocument({ quote, pdfConfig }); } catch (error) { return { error: error.message }; } }, [quote, pdfConfig]);
  const setPdfConfig = update => { try { savePdfConfig(prev => validatePdfConfig(typeof update === 'function' ? update(prev) : update)); return true; } catch (error) { setPrintMessage(error.message); return false; } };
  const [newBank, setNewBank] = useState({ banco: '', moneda: 'Soles', numero: '', cci: '' });

  useEffect(() => {
    const accs = Array.isArray(pdfConfig?.accounts) ? pdfConfig.accounts : [];
    const hasDemo = accs.length > 0 && accs.every(a => ['123-456789-00', '987-654321-00'].includes(String(a.numero || '').trim()));
    if (hasDemo) {
      try { savePdfConfig(prev => validatePdfConfig({ ...prev, accounts: DEFAULT_ACCOUNTS })); } catch { /* ignore */ }
    }
  }, [pdfConfig?.accounts, savePdfConfig]);

  // --- Motor financiero centralizado ---
  const { subtotal, igv, totalFinal } = calculateQuoteTotals(quote);
  const themeColor = pdfConfig.color || '#d99b26';

  // --- Handlers ---
  const addBankAccount = () => {
    if (!newBank.banco || !newBank.numero) return;
    setPdfConfig({ ...pdfConfig, accounts: [...(pdfConfig.accounts || []), { ...newBank, id: Date.now() }] });
    setNewBank({ banco: '', moneda: 'Soles', numero: '', cci: '' });
  };
  const removeBankAccount = (id) => setPdfConfig({ ...pdfConfig, accounts: pdfConfig.accounts.filter(a => a.id !== id) });
  const saveConditionsAsDefault = () => setDefaultConditions(quote.observaciones);

  const handleFileUpload = field => async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file || uploading) return;
    setUploading(true); setPrintMessage('Preparando imagen…');
    try { const image = await prepareDocumentImage(file); if (setPdfConfig(prev => ({ ...prev, [field]: image }))) setPrintMessage('Imagen preparada y aplicada en la vista previa.'); }
    catch (error) { setPrintMessage(error.message); }
    finally { setUploading(false); }
  };

  const handleTotalChange = e => {
    const newTotal = Number(e.target.value), minimum = Math.round(subtotal * (quote.omitIgv ? 1 : 1.18) * 100) / 100;
    if (readOnly || !Number.isSafeInteger(Math.round(newTotal * 100)) || newTotal < minimum) {
      e.target.value = totalFinal.toFixed(2); setPrintMessage('El total debe cubrir las partidas y su IGV. Para reducirlo, edita los precios en la cotización.'); return;
    }
    const ganancia = reverseCalculateGanancia(newTotal, subtotal, quote.omitIgv);
    setQuote(prev => ({ ...prev, ganancia, totalManual: null }));
    const calculated = calculateQuoteTotals({ ...quote, ganancia, totalManual: null }).totalFinal;
    setPrintMessage(calculated !== newTotal ? 'Total ajustado al redondeo de céntimos: ' + formatCurrency(calculated) : 'Total actualizado. El IGV conserva su porcentaje.');
  };

  const handlePrint = async (mode = 'print') => {
    if (printing) return;
    setPrinting(true); setPrintMessage('');
    try {
      if (window.cotiDocuments) {
        const result = await (mode === 'pdf' ? window.cotiDocuments.saveQuotePdf : window.cotiDocuments.printQuote)({ quote, pdfConfig });
        if (!result.canceled) setPrintMessage(result.opened ? 'Se abrió la impresión de Android. Elige «Guardar como PDF» o tu impresora.' : mode === 'pdf' ? 'PDF guardado con texto seleccionable.' : 'Trabajo enviado a la impresora.');
      } else {
        const frameWin = previewFrame.current?.contentWindow;
        if (!frameWin) throw new Error('Vista previa aún no disponible.');
        frameWin.focus();
        frameWin.print();
        setPrintMessage(mode === 'pdf' ? 'En la ventana de impresión del navegador, selecciona «Guardar como PDF» como destino.' : 'Se abrió el diálogo de impresión del navegador.');
      }
    } catch (error) { setPrintMessage('No se pudo completar la impresión: ' + error.message); }
    finally { setPrinting(false); }
  };

  return (
    <div className="flex flex-col items-center animate-fade-in print:animate-none pb-10 print:block print:pb-0">

      {/* ===== BARRA DE ACCIONES (oculta en impresión) ===== */}
      <div className="w-full max-w-4xl mb-6 print:hidden">
        <div className="flex justify-between items-center mb-4">
          <button onClick={onBack} className="text-gray-600 hover:text-gray-900 flex items-center gap-2 font-medium transition-colors">
            <ArrowLeft className="h-5 w-5" /> {readOnly ? "Volver" : "Editar"}
          </button>
          <div className="flex gap-3 items-center flex-wrap justify-end">
            <button onClick={() => setShowConfig(!showConfig)} className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm shadow-sm transition-all ${showConfig ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <Settings className="h-4 w-4" /> Personalizar
            </button>
            <button disabled={readOnly || uploading} onClick={onSave} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm shadow-sm hover:bg-green-700 transition-colors">
              <Save className="h-4 w-4" /> Guardar
            </button>
            <div className="flex items-center gap-2">
              <select value={pdfConfig.pageSize || 'A4'} onChange={(e) => setPdfConfig({...pdfConfig, pageSize: e.target.value})} className="text-sm border border-gray-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-blue-300">
                <option value="A4">A4</option><option value="Carta">Carta</option><option value="Oficio">Oficio</option>
              </select>
            </div>
            <button disabled={printing || uploading || !!printable.error} onClick={() => handlePrint('print')} className="bg-blue-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold text-sm shadow-lg hover:bg-blue-700 transition-colors">
              <Printer className="h-4 w-4" /> {printing ? 'Procesando…' : 'Imprimir'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <p className="text-xs text-slate-500">Formato oficial SERYVER G&G · Texto seleccionable · Numeración de páginas ({igv > 0 ? `IGV: ${formatCurrency(igv)}` : 'Sin IGV'})</p>
          <div className="flex gap-3 items-center">
            <label className="text-xs text-slate-600">Total ({quote.moneda || 'S/'})
              <input disabled={readOnly} aria-label="Total de la cotización" type="number" min="0" step="0.01" key={totalFinal.toFixed(2)} defaultValue={totalFinal.toFixed(2)} onBlur={handleTotalChange} className="ml-2 w-28 p-2 border rounded-lg text-right text-sm" />
            </label>
            <button disabled={printing || uploading || !!printable.error} onClick={() => handlePrint('pdf')} className="px-4 py-2 rounded-lg border border-blue-600 text-blue-700 font-semibold text-sm disabled:opacity-50">Guardar PDF</button>
          </div>
        </div>
        {readOnly && <p className="mb-3 text-sm text-slate-700">Venta contabilizada: sus importes y partidas están protegidos. {onDuplicate && <button className="underline font-bold" onClick={() => onDuplicate(quote)}>Duplicar como nueva propuesta</button>}</p>}
        {printable.error && <p role="alert" className="p-3 bg-red-50 text-red-800">{printable.error} Abre Personalizar para quitar o reemplazar las imágenes.</p>}
        {printMessage && <p role="status" className="mb-4 rounded-lg bg-blue-50 text-blue-900 p-3 text-sm">{printMessage}</p>}
        {(pdfConfig.logo || pdfConfig.logoRight || pdfConfig.signature || pdfConfig.watermark) && (
          <button onClick={() => setPdfConfig(prev => ({ ...prev, logo: null, logoRight: null, signature: null, watermark: null }))} className="text-sm text-red-700 underline mb-3">
            Quitar todas las imágenes
          </button>
        )}

        {/* --- Panel de Configuración --- */}
        {showConfig && (
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-down">
            {/* Columna 1: Logos + Marca de Agua + Estilo */}
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3 text-sm"><Palette className="h-4 w-4 text-blue-600" /> Colores, Logos y Marca de Agua</h3>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Color de Encabezados</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={themeColor} onChange={(e) => setPdfConfig({...pdfConfig, color: e.target.value})} className="h-9 w-14 p-1 rounded-lg border cursor-pointer" />
                        <span className="text-xs text-gray-400 font-mono">{themeColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Estilo de Tabla</label>
                      <div className="flex gap-1.5">
                        {['bordered', 'simple', 'zebra'].map(style => (
                          <button key={style} onClick={() => setPdfConfig({...pdfConfig, tableStyle: style})} className={`px-3 py-1.5 rounded-lg text-xs border capitalize transition-all ${pdfConfig.tableStyle === style ? 'bg-blue-100 border-blue-400 text-blue-700 font-bold shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>{style}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Logo Izquierdo */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700">Logo Izquierdo (Puertas Automáticas)</label>
                      <button
                        type="button"
                        onClick={() => setPdfConfig({ ...pdfConfig, hideLeftLogo: !pdfConfig.hideLeftLogo })}
                        className={`text-xs font-semibold px-2 py-0.5 rounded border ${pdfConfig.hideLeftLogo ? 'bg-gray-200 text-gray-600 border-gray-300' : 'bg-green-50 text-green-700 border-green-300'}`}
                      >
                        {pdfConfig.hideLeftLogo ? 'Oculto (Mostrar)' : 'Visible'}
                      </button>
                    </div>
                    <input type="file" disabled={uploading} accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileUpload('logo')} className="text-xs text-gray-500 w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-16 shrink-0">Tamaño:</label>
                      <input type="range" min="40" max="160" value={pdfConfig.logoSize || 100} onChange={e => setPdfConfig({ ...pdfConfig, logoSize: Number(e.target.value) })} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                      <span className="text-xs font-bold text-gray-600 w-10 text-right">{pdfConfig.logoSize || 100}%</span>
                    </div>
                    {pdfConfig.logo && (
                      <button type="button" onClick={() => setPdfConfig({ ...pdfConfig, logo: null })} className="text-xs text-red-600 hover:text-red-800 font-semibold block ml-auto">
                        Restaurar logo izquierdo SERYVER por defecto
                      </button>
                    )}
                  </div>

                  {/* Logo Derecho */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700">Logo Derecho (SERYVER G&amp;G S.A.C)</label>
                      <button
                        type="button"
                        onClick={() => setPdfConfig({ ...pdfConfig, hideRightLogo: !pdfConfig.hideRightLogo })}
                        className={`text-xs font-semibold px-2 py-0.5 rounded border ${pdfConfig.hideRightLogo ? 'bg-gray-200 text-gray-600 border-gray-300' : 'bg-green-50 text-green-700 border-green-300'}`}
                      >
                        {pdfConfig.hideRightLogo ? 'Oculto (Mostrar)' : 'Visible'}
                      </button>
                    </div>
                    <input type="file" disabled={uploading} accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileUpload('logoRight')} className="text-xs text-gray-500 w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-16 shrink-0">Tamaño:</label>
                      <input type="range" min="40" max="160" value={pdfConfig.logoRightSize || 100} onChange={e => setPdfConfig({ ...pdfConfig, logoRightSize: Number(e.target.value) })} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                      <span className="text-xs font-bold text-gray-600 w-10 text-right">{pdfConfig.logoRightSize || 100}%</span>
                    </div>
                    {pdfConfig.logoRight && (
                      <button type="button" onClick={() => setPdfConfig({ ...pdfConfig, logoRight: null })} className="text-xs text-red-600 hover:text-red-800 font-semibold block ml-auto">
                        Restaurar logo derecho SERYVER por defecto
                      </button>
                    )}
                  </div>

                  {/* Marca de Agua */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700">Marca de Agua Central</label>
                      <button
                        type="button"
                        onClick={() => setPdfConfig({ ...pdfConfig, hideWatermark: !pdfConfig.hideWatermark })}
                        className={`text-xs font-semibold px-2 py-0.5 rounded border ${pdfConfig.hideWatermark ? 'bg-gray-200 text-gray-600 border-gray-300' : 'bg-green-50 text-green-700 border-green-300'}`}
                      >
                        {pdfConfig.hideWatermark ? 'Oculta (Mostrar)' : 'Visible'}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500">Puedes ajustar la marca de agua de SERYVER o subir una propia.</p>
                    <input type="file" disabled={uploading} accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileUpload('watermark')} className="text-xs text-gray-500 w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-16 shrink-0">Tamaño:</label>
                      <input type="range" min="10" max="100" value={pdfConfig.watermarkSize || 55} onChange={e => setPdfConfig({...pdfConfig, watermarkSize: Number(e.target.value)})} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                      <span className="text-xs font-bold text-gray-600 w-10 text-right">{pdfConfig.watermarkSize || 55}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-16 shrink-0">Opacidad:</label>
                      <input type="range" min="0.01" max="1" step="0.01" value={pdfConfig.watermarkOpacity ?? 0.12} onChange={e => setPdfConfig({...pdfConfig, watermarkOpacity: Number(e.target.value)})} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                      <span className="text-xs font-bold text-gray-600 w-10 text-right">{Math.round((pdfConfig.watermarkOpacity ?? 0.12) * 100)}%</span>
                    </div>
                    {pdfConfig.watermark && (
                      <button type="button" onClick={() => setPdfConfig({...pdfConfig, watermark: null})} className="text-xs text-red-600 hover:text-red-800 font-semibold block ml-auto">
                        Restaurar marca de agua SERYVER por defecto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Columna 2: Identidad + Cuentas + Condiciones */}
            <div className="flex flex-col h-full space-y-5">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3 text-sm"><Building className="h-4 w-4 text-blue-600" /> Identidad de la Empresa y Firma</h3>
                <div className="space-y-3">
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Nombre</label><input className="w-full border border-gray-300 p-2 rounded-lg text-sm" value={pdfConfig.companyName || ''} onChange={e => setPdfConfig({...pdfConfig, companyName: e.target.value})} placeholder="Ej: SERYVER G&G S.A.C" /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Subtítulo / Slogan</label><input className="w-full border border-gray-300 p-2 rounded-lg text-sm" value={pdfConfig.companySubtitle || ''} onChange={e => setPdfConfig({...pdfConfig, companySubtitle: e.target.value})} placeholder="Expertos en seguridad..." /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">RUC</label><input className="w-full border border-gray-300 p-2 rounded-lg text-sm font-mono" value={pdfConfig.companyRuc || ''} onChange={e => setPdfConfig({...pdfConfig, companyRuc: e.target.value})} placeholder="20614510421" /></div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Firma Comercial (opcional)</label>
                    <input type="file" disabled={uploading} accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileUpload('signature')} className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    {pdfConfig.signature && <button onClick={() => setPdfConfig({...pdfConfig, signature: null})} className="text-xs text-red-500 hover:text-red-700 font-bold block mt-2">Quitar Firma</button>}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3 text-sm"><Landmark className="h-4 w-4 text-blue-600" /> Cuentas Bancarias</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input placeholder="Banco (Ej: BCP SOLES SERYVER)" className="border border-gray-300 p-2 rounded-lg text-xs" value={newBank.banco} onChange={e => setNewBank({...newBank, banco: e.target.value})} />
                  <input placeholder="Moneda" className="border border-gray-300 p-2 rounded-lg text-xs" value={newBank.moneda} onChange={e => setNewBank({...newBank, moneda: e.target.value})} />
                  <input placeholder="N° Cuenta" className="border border-gray-300 p-2 rounded-lg text-xs" value={newBank.numero} onChange={e => setNewBank({...newBank, numero: e.target.value})} />
                  <input placeholder="CCI (Opcional)" className="border border-gray-300 p-2 rounded-lg text-xs" value={newBank.cci} onChange={e => setNewBank({...newBank, cci: e.target.value})} />
                </div>
                <button onClick={addBankAccount} className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded-lg mb-3 hover:bg-blue-700 transition-colors">+ Agregar Cuenta</button>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {pdfConfig.accounts?.map((acc) => (
                    <div key={acc.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs">
                      <div><p className="font-bold text-gray-700">{acc.banco} ({acc.moneda})</p><p className="text-gray-500 font-mono">{acc.numero} {acc.cci ? `· CCI: ${acc.cci}` : ''}</p></div>
                      <button onClick={() => removeBankAccount(acc.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {(!pdfConfig.accounts || pdfConfig.accounts.length === 0) && <p className="text-xs text-gray-400 text-center py-2">Sin cuentas registradas.</p>}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3 text-sm"><FileText className="h-4 w-4 text-blue-600" /> Condiciones Comerciales</h3>
                <textarea disabled={readOnly} className="w-full h-28 border border-gray-300 p-3 rounded-lg text-xs text-gray-600 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none resize-none transition-all" value={quote.observaciones} onChange={(e) => setQuote({...quote, observaciones: e.target.value})} placeholder="Escribe aquí las condiciones..." />
                <button onClick={saveConditionsAsDefault} className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline font-medium w-full text-right">Guardar como texto por defecto</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto bg-slate-200 p-3 rounded-lg print:p-0">
        {!printable.error && <iframe ref={previewFrame} title="Vista previa de la cotización" sandbox="allow-same-origin allow-modals" srcDoc={printable.html}
          onLoad={event => setPreviewHeight(Math.max(600, event.currentTarget.contentDocument?.documentElement.scrollHeight || 1200))}
          style={{ width: printable.paper.width + 'mm', height: previewHeight, border: 0, display: 'block', margin: '0 auto', background: 'white' }} />}
      </div>
    </div>
  );
}
