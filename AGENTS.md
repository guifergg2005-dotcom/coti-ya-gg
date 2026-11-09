# Compatibilidad permanente con Android

El propietario exige que Android y escritorio compartan inventario, materiales, combos y cotizaciones guardadas. La app Android está en `C:\Users\Guido\SeryverApp_Android`.

Ambas aplicaciones usan Firebase `coty-ya-app`, cuenta `SERYVER-admin`, raíz `user_data/SERYVER-admin`. Las colecciones comunes son `inventory`, `history`, `clients`, `transactions`, `work_orders` y `reminders`; `pdfConfig` y `defaultConditions` están en el documento raíz.

`currentQuote` es un borrador local por dispositivo: guardarlo en `history` publica la cotización para todos los equipos. No sincronizar el borrador global ni sobrescribir colecciones completas a partir de una caché incompleta.

Si modificas servicios, hooks, utilidades, configuración de acceso, componentes o cálculos compartidos, sincroniza y verifica la copia Android con `node C:\Users\Guido\SeryverApp_Android\scripts\verify-shared.cjs --sync`. Comprueba ambas aplicaciones, incluyendo cambios en ambos sentidos, desconexión, reinicio, conflictos y borradores independientes. Usa datos de prueba aislados; conserva datos reales y respaldos.

Mantén el administrador solicitado y la firma pendiente. No agregues claves en texto plano ni restaures el registro abierto de usuarios. La interfaz móvil y el código nativo Android permanecen específicos de esa plataforma.
