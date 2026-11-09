import React from 'react';
import { FileText, CheckCircle, TrendingUp, DollarSign, BarChart2, Activity, Info, PieChart, Landmark, TrendingDown } from 'lucide-react';

function KpiCard({ title, value, icon, color }) {
  const colors = { blue: "border-l-blue-500 text-blue-600", green: "border-l-green-500 text-green-600", purple: "border-l-purple-500 text-purple-600", red: "border-l-red-500 text-red-600" };
  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${colors[color] || colors.blue}`}>
      <div className="flex justify-between items-start">
        <div><p className="text-xs font-bold text-gray-400 uppercase">{title}</p><p className="text-2xl font-bold text-gray-800 mt-1">{value}</p></div>
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ history, transactions }) {
  const totalCotizado = history.reduce((acc, curr) => acc + (Number(curr.totalFinal) || 0), 0);
  const aceptadas = history.filter(h => h.status === 'Aceptada');
  const rechazadas = history.filter(h => h.status === 'Rechazada');
  const pendientes = history.filter(h => h.status === 'Pendiente');

  const totalVendido = aceptadas.reduce((acc, curr) => acc + (Number(curr.totalFinal) || 0), 0);
  const ratioConversion = history.length > 0 ? ((aceptadas.length / history.length) * 100).toFixed(1) : 0;
  
  const ingresos = transactions.filter(t => t.tipo === 'Ingreso').reduce((acc, t) => acc + (Number(t.monto) || 0), 0);
  const gastos = transactions.filter(t => t.tipo === 'Gasto').reduce((acc, t) => acc + (Number(t.monto) || 0), 0);
  const utilidad = ingresos - gastos;

  const acceptedValues = aceptadas.map(h => Number(h.totalFinal) || 0).sort((a, b) => a - b);
  const n = acceptedValues.length;
  const mean = n > 0 ? totalVendido / n : 0;
  const median = n > 0 ? (n % 2 !== 0 ? acceptedValues[Math.floor(n/2)] : (acceptedValues[n/2 - 1] + acceptedValues[n/2]) / 2) : 0;
  const variance = n > 0 ? acceptedValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n : 0;
  const stdDev = Math.sqrt(variance);
  const min = n > 0 ? acceptedValues[0] : 0;
  const max = n > 0 ? acceptedValues[n - 1] : 0;
  const skewness = n > 0 && stdDev > 0 ? (acceptedValues.reduce((acc, val) => acc + Math.pow(val - mean, 3), 0) / n) / Math.pow(stdDev, 3) : 0;

  let interpretacionConversion = ratioConversion >= 60 ? "Excelente capacidad de cierre. El equipo está convirtiendo la mayoría de las oportunidades." : ratioConversion >= 30 ? "Conversión estable. Existe un flujo constante, pero hay margen para optimizar estrategias de cierre." : "Baja tasa de conversión. Se recomienda revisar el seguimiento de las cotizaciones, ajustar precios o mejorar la oferta de valor.";
  let interpretacionDispersion = stdDev > mean * 0.5 ? "Alta variabilidad. Sus ingresos dependen tanto de proyectos inusualmente grandes como de ventas pequeñas (alto riesgo, alta recompensa)." : "Ventas consistentes. Los montos cerrados mantienen un ticket promedio estable, facilitando la predicción del flujo de caja.";
  let interpretacionSesgo = skewness > 0.5 ? "Sesgo Positivo: La mayoría del volumen proviene de montos bajos/medios. Los promedios están siendo jalados hacia arriba por unas cuantas ventas grandes." : skewness < -0.5 ? "Sesgo Negativo: Su negocio está cerrando predominantemente proyectos de montos altos." : "Distribución Simétrica: Sus ventas están muy equilibradas alrededor de la media.";
  let interpretacionCaja = utilidad > ingresos * 0.2 ? "Salud financiera robusta. El negocio genera un excelente margen operativo libre de gastos." : utilidad >= 0 ? "Margen en equilibrio. Estabilidad confirmada, pero es vital monitorear que los gastos no se incrementen bruscamente." : "Alerta de Liquidez. El negocio opera en déficit. Los gastos operativos actuales superan el ingreso consolidado.";

  const maxStatusCount = Math.max(aceptadas.length, rechazadas.length, pendientes.length, 1);
  const maxCashFlow = Math.max(ingresos, gastos, 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total Cotizado" value={`S/ ${totalCotizado.toFixed(0)}`} icon={<FileText className="text-blue-500"/>} color="blue" />
        <KpiCard title="Ventas Cerradas" value={`S/ ${totalVendido.toFixed(0)}`} icon={<CheckCircle className="text-green-500"/>} color="green" />
        <KpiCard title="Ratio Conversión" value={`${ratioConversion}%`} icon={<TrendingUp className="text-purple-500"/>} color="purple" />
        <KpiCard title="Utilidad Neta" value={`S/ ${utilidad.toFixed(0)}`} icon={<DollarSign className={utilidad >= 0 ? "text-green-600" : "text-red-600"}/>} color={utilidad >= 0 ? "green" : "red"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart2 className="h-5 w-5 text-indigo-600"/> Estadísticos Descriptivos (Ventas Cerradas)</h3>
          
          <div className="overflow-x-auto rounded-lg border border-indigo-100">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-indigo-50 text-indigo-900 border-b-2 border-indigo-200">
                <tr>
                  <th className="p-3 font-bold text-center">N Válidos</th>
                  <th className="p-3 font-bold text-right">Media (Promedio)</th>
                  <th className="p-3 font-bold text-right">Mediana</th>
                  <th className="p-3 font-bold text-right">Desv. Estándar</th>
                  <th className="p-3 font-bold text-right">Mínimo</th>
                  <th className="p-3 font-bold text-right">Máximo</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 font-mono text-gray-700">
                  <td className="p-3 text-center bg-indigo-50/30 font-bold">{n}</td>
                  <td className="p-3 text-right">S/ {mean.toFixed(2)}</td>
                  <td className="p-3 text-right">S/ {median.toFixed(2)}</td>
                  <td className="p-3 text-right text-orange-600">± {stdDev.toFixed(2)}</td>
                  <td className="p-3 text-right text-red-600">S/ {min.toFixed(2)}</td>
                  <td className="p-3 text-right text-green-600">S/ {max.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 bg-slate-50 p-5 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-blue-500"/> Interpretaciones para Toma de Decisiones</h4>
              <ul className="text-sm text-slate-600 space-y-3">
                <li className="flex gap-2 items-start bg-white p-2 rounded shadow-sm border border-slate-100"><Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" /> <span><b>Conversión Estratégica:</b> {interpretacionConversion}</span></li>
                <li className="flex gap-2 items-start bg-white p-2 rounded shadow-sm border border-slate-100"><Info className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" /> <span><b>Volatilidad de Ventas:</b> {interpretacionDispersion}</span></li>
                <li className="flex gap-2 items-start bg-white p-2 rounded shadow-sm border border-slate-100"><Info className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" /> <span><b>Asimetría de Datos ({skewness.toFixed(2)}):</b> {interpretacionSesgo}</span></li>
              </ul>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><PieChart className="h-5 w-5 text-purple-600"/> Pipeline de Cotizaciones</h3>
            
            <div className="flex-1 flex items-end justify-around gap-2 mt-2 pb-2 border-b border-gray-200 min-h-[160px]">
              <div className="flex flex-col items-center gap-2 w-1/3 group">
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded shadow-sm">{aceptadas.length}</span>
                <div className="w-full max-w-[40px] bg-gradient-to-t from-green-600 to-green-400 rounded-t-md transition-all duration-1000 group-hover:opacity-80 print:opacity-100 shadow-md" style={{ height: `${(aceptadas.length / maxStatusCount) * 100}%`, minHeight: '10px' }}></div>
              </div>
              <div className="flex flex-col items-center gap-2 w-1/3 group">
                <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded shadow-sm">{pendientes.length}</span>
                <div className="w-full max-w-[40px] bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-md transition-all duration-1000 group-hover:opacity-80 print:opacity-100 shadow-md" style={{ height: `${(pendientes.length / maxStatusCount) * 100}%`, minHeight: '10px' }}></div>
              </div>
              <div className="flex flex-col items-center gap-2 w-1/3 group">
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded shadow-sm">{rechazadas.length}</span>
                <div className="w-full max-w-[40px] bg-gradient-to-t from-red-600 to-red-400 rounded-t-md transition-all duration-1000 group-hover:opacity-80 print:opacity-100 shadow-md" style={{ height: `${(rechazadas.length / maxStatusCount) * 100}%`, minHeight: '10px' }}></div>
              </div>
            </div>
            
            <div className="flex justify-around text-xs font-bold text-gray-500 mt-3">
              <span className="text-green-700 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Acept.</span>
              <span className="text-yellow-700 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Pend.</span>
              <span className="text-red-700 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Rechaz.</span>
            </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Landmark className="h-5 w-5 text-emerald-600"/> Rendimiento Operativo y Tesorería</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="flex gap-4 items-center">
              <div className="flex-1 bg-green-50 p-6 rounded-xl text-center border border-green-200 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                  <p className="text-green-800 font-bold mb-2 uppercase text-xs tracking-wider">Ingresos Totales</p>
                  <p className="text-3xl font-black text-green-600 font-mono">S/ {ingresos.toFixed(2)}</p>
              </div>
              <div className="text-gray-300 font-bold text-2xl">-</div>
              <div className="flex-1 bg-red-50 p-6 rounded-xl text-center border border-red-200 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                  <p className="text-red-800 font-bold mb-2 uppercase text-xs tracking-wider">Gastos Operativos</p>
                  <p className="text-3xl font-black text-red-600 font-mono">S/ {gastos.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="flex flex-col justify-center">
                <h4 className="font-bold text-gray-700 text-sm mb-3">Balance Visual de Composición</h4>
                <div className="w-full h-10 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                    <div className="bg-gradient-to-r from-green-500 to-green-400 h-full flex items-center px-3 text-sm font-bold text-white transition-all duration-1000" style={{ width: `${maxCashFlow > 0 ? (ingresos / ((ingresos + gastos) || 1)) * 100 : 50}%` }}>{((ingresos / ((ingresos + gastos) || 1)) * 100).toFixed(0)}%</div>
                    <div className="bg-gradient-to-r from-red-400 to-red-500 h-full flex justify-end items-center px-3 text-sm font-bold text-white transition-all duration-1000" style={{ width: `${maxCashFlow > 0 ? (gastos / ((ingresos + gastos) || 1)) * 100 : 50}%` }}>{((gastos / ((ingresos + gastos) || 1)) * 100).toFixed(0)}%</div>
                </div>
                <div className="flex justify-between mt-1 px-1">
                  <span className="text-xs font-bold text-green-600">Caja de Entrada</span>
                  <span className="text-xs font-bold text-red-600">Salidas</span>
                </div>
                
                <div className={`mt-5 flex gap-3 items-start p-4 rounded-lg border ${utilidad >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    {utilidad >= 0 ? <TrendingUp className="h-6 w-6 text-emerald-600 shrink-0"/> : <TrendingDown className="h-6 w-6 text-rose-600 shrink-0"/>}
                    <p className={`text-sm leading-relaxed ${utilidad >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                      <b>Veredicto de Tesorería:</b> {interpretacionCaja}
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
