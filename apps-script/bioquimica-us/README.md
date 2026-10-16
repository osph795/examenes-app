# Bioquímica US

Base verificada: commit `89a62e5` de `osph795/examenes-app` (PWA 17.18, operaciones V18). Se adapta el backend de Fisiología US; no se sustituye la asignatura Bioquímica existente.

## Estado

- Hoja nueva: https://docs.google.com/spreadsheets/d/1AiRRzUNeyHFZtMg3TPBzZ4vSNBvtNT-JNzkBX7uLPeI/edit
- Cuatro pestañas vacías: preguntas (22 columnas), examenes (30), preguntas_examen (2), respuestas (22).
- Cabeceras exactas en schema.json. Se completaron las cuatro cabeceras finales de puntuación que estaban vacías en la plantilla.
- Backend preparado y probado con Sheets/autorización simulados. No desplegado ni probado con sesión real.
- No se añade una URL ficticia a asignaturas.json: el alta pública queda pendiente del despliegue.
- No se han asignado permisos a alumnos ni cargado preguntas. Falta el temario específico de Bioquímica US.

## Instalación

1. Abre la hoja nueva y selecciona Extensiones → Apps Script. El proyecto de destino debe ser exclusivo de Bioquímica US. Si la copia de la hoja contiene código vinculado heredado, reemplázalo completamente por Code.gs de esta carpeta; no ejecutes el código heredado.
2. En Configuración del proyecto, activa la visualización de appsscript.json. Sustituye su contenido por el manifiesto de esta carpeta y guarda. Incluye el permiso de peticiones externas que necesita la validación de sesiones.
3. Ejecuta comprobarConexionBancoV14 y concede los permisos de Google. Comprueba que termina sin errores.
4. Implementar → Nueva implementación → Aplicación web. Ejecutar como tu cuenta propietaria; acceso Cualquier usuario, como en los demás bancos. El backend exige una sesión válida del maestro para cada operación de datos.
5. Copia la URL terminada en /exec. Al abrirla debe devolver banco Bioquímica US, version 18.0-bqus, requiere_sesion true y diagnostico BIOQUIMICA_US_BACKEND_OK.
6. Añade a asignaturas.json un objeto con nombre Bioquímica US, sheetId 1AiRRzUNeyHFZtMg3TPBzZ4vSNBvtNT-JNzkBX7uLPeI, scriptUrl igual a esa URL verificada y seguridad sesion-v14. Conserva las demás entradas.
7. En el sistema de accesos del maestro, asigna Bioquímica US únicamente a los alumnos elegidos por el profesor, con sus fuentes y modalidad correspondientes. No copies accesos de otra asignatura.
8. Prueba una sesión real de profesor y alumno: catálogo, editor, actividad breve, dudas, entrega, resultados y descarga con imagen en modo sin conexión. Las pruebas locales no sustituyen esta verificación.

Para biblioteca/subida de imágenes, configura GITHUB_TOKEN en las propiedades privadas del proyecto (nunca en el código ni en la hoja). El destino por defecto es osph795/examenes-imagenes, rama main, carpeta images/bioquimica-us. Mostrar imágenes mediante URL no requiere subirlas desde el editor.

## Funciones heredadas

Sesiones V14/V15; editor de profesor sin clave adicional; imágenes y explicaciones; métricas y tiene_duda; guardado idempotente y verificación de entrega; notas calculadas en servidor; operacionesV18 con una validación por paquete. Se reutiliza la interfaz común con cachés, bloques y corrección offline. El repaso espaciado permanece desactivado, como en Fisiología US; no se anuncia como activo para este banco. La mejora interna del PIN del maestro sigue pendiente y no forma parte de esta alta.

## Contenido pendiente

Recibir índice y preguntas de Bioquímica US antes de establecer temas. IDs propuestos: BQUS-T01-0001 y conceptos BQUS-T01-C01. Mantener preguntas autónomas, respuestas balanceadas y explicaciones cortas/largas con negritas, razonamiento de la correcta, distractores individuales y concepto clave; sin referencias explícitas al material. La fuente debe reflejar el origen real de cada lote.

## Pruebas

`node tests/batch-server.cjs` incluye Bioquímica US usando las cabeceras reales de schema.json: generación/entrega de 20 preguntas, reintentos sin duplicados, autorización, propiedad, restricciones de fuentes y nota calculada en servidor. Se ejecutan sin modificar la hoja real.
