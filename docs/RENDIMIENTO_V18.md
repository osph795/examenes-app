# Rendimiento V17.18 del navegador y operaciones V18 de Apps Script

## Qué se activa al publicar GitHub Pages

- Los bancos con sesión envían hasta 50 preguntas o 100 respuestas por petición POST, con bloques de aproximadamente 180 kB de formulario codificado. Los bancos antiguos conservan sus tamaños y transporte anteriores.
- El catálogo se reutiliza hasta 5 minutos, el banco de preguntas 2 minutos y el resumen de exámenes/repasos 15 segundos. Todo permanece solo en memoria de la pestaña y se aísla por maestro, banco y token. El estado de una actividad y la confirmación de entrega siempre se consultan en el servidor.
- Al abrir la pantalla de generación, se precargan las preguntas mientras se eligen los temas. Las escrituras de actividades conservan la copia temporal del banco, pero invalidan el historial; editar preguntas invalida también el banco y el catálogo. Salir elimina las lecturas de la sesión.
- «Diagnóstico de velocidad» copia las últimas 60 duraciones de las peticiones al maestro y bancos con sesión. Registra acción, milisegundos y éxito, sin URL, PIN, token, nombre, respuestas o contenido de errores. Los tiempos incluyen red, servidor y posibles reintentos; no desglosan el tiempo interno de Google.

## Qué requiere desplegar Apps Script por separado

Fuentes preparadas en este repositorio:

- `apps-script/fisiologia-us/Code.gs`
- `apps-script/fisiologia-medica-ii/Code.gs`
- `apps-script/psicologia-medica/Code.gs`

Publicar estos archivos en GitHub no actualiza las implementaciones de Google. Antes de aplicarlos, comparar con el código que está en el editor para conservar modificaciones posteriores que no estén en el repositorio. Conservar las propiedades privadas del proyecto. Reemplazar el código correspondiente y actualizar **la implementación existente** con una nueva versión, manteniendo su URL `/exec`.

El servidor anuncia `capacidades_v18: ['operaciones']` en las respuestas autenticadas de catálogo y actividad. Solo entonces el navegador usa `operacionesV18`. Los servidores anteriores no reciben acciones desconocidas ni necesitan actualizarse a la vez.

Esta vía valida la sesión una vez, abre la hoja una vez y ejecuta en orden las operaciones necesarias. Cada operación conserva su comprobación de propiedad, fuentes, preguntas canónicas, bloqueos e idempotencia. El índice del banco se reutiliza únicamente dentro de esa petición. No se cachean permisos en el servidor.

La creación agrupa cabecera, preguntas, inicio y recuperación de la actividad. La entrega agrupa respuestas, comprobación de integridad y finalización. No es una transacción: si falla un paso, se detiene y puede repetirse el paquete; las operaciones de guardado existentes evitan duplicados. La copia local de la entrega solo se elimina tras recibir confirmación de todos los pasos.

Para 20 preguntas pequeñas, el envío de preguntas pasa de 4 peticiones a 1 incluso sin actualizar Apps Script. Una entrega de 20 respuestas pasa de 4 peticiones (2 bloques, verificación, finalización) a 3 con el navegador nuevo, y a 1 con Apps Script V18. Son conteos del código, no mediciones de tiempo real.

## Verificación del PIN: pendiente de código actual

El login sigue haciendo una petición al maestro. Se localizó la hoja `Sistema Exámenes-Maestro`, pero no el código V14 vigente ni el proyecto/despliegue editable. La copia antigua V12 encontrada no implementa las sesiones actuales y no debe usarse para sustituir el maestro. Se necesita el código actual para revisar lecturas, escrituras y creación de sesiones. Ningún cambio de este paquete afirma acelerar la ejecución interna del PIN.

## Pruebas

Ejecutar:

```
node tests/loading-unit.cjs
node tests/batch-client.cjs
node tests/batch-server.cjs
```

Las pruebas de servidor ejecutan los tres códigos completos con Sheets y autorización simulados: generación, entrega, reintentos, rechazo de acceso y fuentes, notas calculadas en servidor y una sola lectura del banco por petición. No equivalen a un despliegue real ni a una medición de Google Apps Script.

`tests/offline-loading.cjs` contiene la prueba con navegador, pendiente en este entorno porque no hay Chromium disponible. Las verificaciones completas con sesiones reales deben realizarse después de desplegar cada backend.
