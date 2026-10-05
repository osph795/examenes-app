/**
 * APPS SCRIPT — Fisiología US · núcleo unificado V15
 * Versión V11 corregida.
 *
 * Incluye:
 * - Consulta ligera de temas y fuentes.
 * - Guardado de preguntas por bloques sin duplicados.
 * - Guardado de respuestas y comprobación de entrega.
 * - Finalización conjunta del examen y su nota.
 * - Recuperación de explicaciones.
 * - Editor de preguntas e imágenes.
 * - Sesión V14 validada contra el maestro.
 *
 * Propiedad de script necesaria para biblioteca/subida de imágenes:
 *   GITHUB_TOKEN
 * El acceso al editor se autoriza mediante la sesión V14/V15 de profesor.
 * Owner/repo/branch/folder tienen valores seguros por defecto y pueden sobrescribirse.
 */

const SPREADSHEET_ID = '1Yo1zPIpT5Uiqvncz_suD2ijv49l9F-eUUUdZEbiZIng';
const GITHUB_DEFAULT_OWNER = 'osph795';
const GITHUB_DEFAULT_REPO = 'examenes-imagenes';
const GITHUB_DEFAULT_BRANCH = 'main';
const GITHUB_DEFAULT_FOLDER = 'images/fisiologia-medica-ii';

function procesarBancoV14_(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const action = (e.parameter.action || '').trim();

    if (!action) {
      return resp({ error: 'Falta el parámetro action' });
    }

    if (action === 'getTemasFuentes') {
      return resp(obtenerResumenTemas_(ss));
    }

    if (action === 'getPreguntas') {
      const sheet = getSheetOrThrow(ss, 'preguntas');
      const data = sheet.getDataRange().getValues();
      return resp(data.length > 1 ? data : []);
    }

    if (action === 'getExamen') {
      const codigo = norm(e.parameter.codigo);

      if (!codigo) {
        return resp({ error: 'Falta el código del examen' });
      }

      const sheetE = getSheetOrThrow(ss, 'examenes');
      const dataE = sheetE.getDataRange().getValues();

      const fila = dataE.find((row, idx) => {
        if (idx === 0) return false;
        return norm(row[0]) === codigo;
      });

      if (!fila) {
        return resp({
          error: 'no encontrado',
          detalle: 'No existe ninguna fila en "examenes" con ese código',
          codigo_buscado: codigo
        });
      }

      const sheetP = getSheetOrThrow(ss, 'preguntas_examen');
      const dataP = sheetP.getDataRange().getValues();
      const banco = buildPreguntasIndex(ss);

      const preguntas = dataP
        .filter((row, idx) => idx > 0 && norm(row[0]) === codigo)
        .map(row => {
          try {
            const p = JSON.parse(row[1]);
            return hydratePregunta(p, banco);
          } catch (err) {
            return null;
          }
        })
        .filter(p => p !== null);

      return resp({
        repasos_v15: BANCO_REPASOS_V15,
        codigo: fila[0],
        examen_id: fila[0],
        fecha: fila[1],
        alumno_id: fila[2],
        alumna: fila[3],
        temas: fila[4],
        num_preguntas: fila[5],
        completado: fila[6] || 'NO',

        tipo_actividad: fila[7] || 'EXAMEN',
        politica_explicaciones: fila[8] || 'AL_FINALIZAR',
        nivel_explicacion: fila[9] || 'CORTA_Y_DETALLADA',
        fecha_desbloqueo_explicaciones: fila[10] || '',

        mostrar_cronometro_total: fila[11] || 'SI',
        mostrar_cronometro_pregunta: fila[12] || 'SI',
        limite_tiempo_minutos: fila[13] || '',

        permitir_volver: fila[14] || 'SI',
        mostrar_mapa: fila[15] || 'SI',
        permitir_marcar: fila[16] || 'SI',
        mezclar_preguntas: fila[17] || 'SI',

        hora_inicio: fila[18] || '',
        hora_fin: fila[19] || '',
        tiempo_transcurrido_segundos: fila[20] || '',
        tiempo_resolucion_segundos: fila[21] || '',
        tiempo_visible_segundos: fila[22] || '',
        tiempo_fuera_pestana_segundos: fila[23] || '',
        tiempo_medio_pregunta_segundos: fila[24] || '',

        sistema_penalizacion:
          fila[25] ||
          (
            String(fila[7] || 'EXAMEN').toUpperCase() === 'PRACTICA'
              ? 'SIN_PENALIZACION'
              : 'ADAPTADA_OPCIONES'
          ),

        penalizacion_acumulada: fila[26] === '' ? '' : fila[26],
        puntuacion_neta: fila[27] === '' ? '' : fila[27],
        nota_bruta: fila[28] === '' ? '' : fila[28],
        nota_final: fila[29] === '' ? '' : fila[29],

        preguntas,
        aviso:
          preguntas.length === 0
            ? 'Examen encontrado pero sin preguntas guardadas'
            : ''
      });
    }

    if (action === 'getExamenesAlumno') {
      const alumnoId = norm(e.parameter.alumno_id);
      const sheet = getSheetOrThrow(ss, 'examenes');
      const data = sheet.getDataRange().getValues();

      return resp(
        data.slice(1)
          .filter(r => norm(r[2]) === alumnoId)
          .map(r => ({
            examen_id: r[0],
            fecha: r[1],
            alumno_id: r[2],
            alumna: r[3],
            temas: r[4],
            num_preguntas: r[5],
            completado: r[6],
            tipo_actividad: r[7] || 'EXAMEN',
            politica_explicaciones: r[8] || 'AL_FINALIZAR',
            nivel_explicacion: r[9] || 'CORTA_Y_DETALLADA',
            hora_inicio: r[18] || '',
            hora_fin: r[19] || '',
            tiempo_transcurrido_segundos: r[20] || '',
            tiempo_resolucion_segundos: r[21] || '',
            tiempo_medio_pregunta_segundos: r[24] || '',

            sistema_penalizacion:
              r[25] ||
              (
                String(r[7] || 'EXAMEN').toUpperCase() === 'PRACTICA'
                  ? 'SIN_PENALIZACION'
                  : 'ADAPTADA_OPCIONES'
              ),

            penalizacion_acumulada: r[26] === '' ? '' : r[26],
            puntuacion_neta: r[27] === '' ? '' : r[27],
            nota_bruta: r[28] === '' ? '' : r[28],
            nota_final: r[29] === '' ? '' : r[29]
          }))
      );
    }

    if (action === 'getRespuestasAlumno') {
      const alumnoId = norm(e.parameter.alumno_id);
      const sheet = getSheetOrThrow(ss, 'respuestas');
      const data = sheet.getDataRange().getValues();

      return resp(
        data.slice(1)
          .filter(r => norm(r[3]) === alumnoId)
          .map(r => ({
            respuesta_id: r[0],
            examen_id: r[1],
            alumna: r[2],
            alumno_id: r[3],
            pregunta_id: r[4],
            tema: r[5],
            concepto: r[6],
            respuesta_alumna: r[7],
            respuesta_correcta: r[8],
            es_correcta: r[9],
            fecha: r[10],
            tiempo_pregunta_segundos: r[11] || '',
            numero_visitas: r[12] || '',
            numero_cambios_respuesta: r[13] || '',
            respuesta_inicial: r[14] || '',
            marcada_revision: r[15] || 'NO',
            orden_presentacion: r[16] || '',
            fecha_primera_respuesta: r[17] || '',
            fecha_ultima_modificacion: r[18] || '',
            numero_opciones: r[19] === '' ? '' : r[19],
            penalizacion_aplicada: r[20] === '' ? '' : r[20],
            tiene_duda: norm(r[21]).toUpperCase() === 'SI' ? 'SI' : 'NO'
          }))
      );
    }

    if (action === 'guardarExamen') {
      const sheet = getSheetOrThrow(ss, 'examenes');
      const codigo = norm(e.parameter.codigo);

      if (!codigo) {
        return resp({
          error: 'No se recibió código al guardar examen'
        });
      }

      const tipoActividad =
        (e.parameter.tipo_actividad || 'EXAMEN').toUpperCase();

      const politicaExplicaciones = (
        e.parameter.politica_explicaciones ||
        (
          tipoActividad === 'PRACTICA'
            ? 'INMEDIATAS'
            : 'AL_FINALIZAR'
        )
      ).toUpperCase();

      const sistemaPenalizacion = (
        e.parameter.sistema_penalizacion ||
        (
          tipoActividad === 'PRACTICA'
            ? 'SIN_PENALIZACION'
            : 'ADAPTADA_OPCIONES'
        )
      ).toUpperCase();

      sheet.appendRow([
        codigo,
        e.parameter.fecha || '',
        e.parameter.alumno_id || '',
        e.parameter.alumna || '',
        e.parameter.temas || '',
        e.parameter.num_preguntas || '',
        'NO',

        tipoActividad,
        politicaExplicaciones,
        (
          e.parameter.nivel_explicacion ||
          'CORTA_Y_DETALLADA'
        ).toUpperCase(),
        e.parameter.fecha_desbloqueo_explicaciones || '',

        e.parameter.mostrar_cronometro_total || 'SI',
        e.parameter.mostrar_cronometro_pregunta || 'SI',
        e.parameter.limite_tiempo_minutos || '',

        e.parameter.permitir_volver || 'SI',
        e.parameter.mostrar_mapa || 'SI',
        e.parameter.permitir_marcar || 'SI',
        e.parameter.mezclar_preguntas || 'SI',

        '',
        '',
        '',
        '',
        '',
        '',
        '',

        sistemaPenalizacion,
        '',
        '',
        '',
        ''
      ]);

      return resp({
        ok: true,
        codigo_guardado: codigo
      });
    }

    if (action === 'guardarPreguntas') {
      const sheet = getSheetOrThrow(ss, 'preguntas_examen');
      const codigo = norm(e.parameter.codigo);
      const preguntas = JSON.parse(e.parameter.preguntas || '[]');
      const banco = buildPreguntasIndex(ss);

      if (!codigo) {
        return resp({
          error: 'No se recibió código al guardar preguntas'
        });
      }

      if (!Array.isArray(preguntas)) {
        return resp({
          error: 'El bloque de preguntas no es válido'
        });
      }

      const nuevas = preguntas.map(p => {
        const completa = hydratePregunta(p, banco);
        const id = norm(
          completa && (completa.id || completa.pregunta_id)
        );

        if (!id) {
          throw new Error(
            'Una pregunta no tiene identificador. No se guardó el bloque.'
          );
        }

        return {
          id,
          json: JSON.stringify(completa)
        };
      });

      const lock = LockService.getScriptLock();

      try {
        lock.waitLock(30000);

        const existentes = new Set();
        const ultima = sheet.getLastRow();

        if (ultima > 1) {
          sheet
            .getRange(2, 1, ultima - 1, 2)
            .getValues()
            .forEach(row => {
              if (norm(row[0]) !== codigo) return;

              try {
                const p = JSON.parse(row[1]);
                existentes.add(norm(p.id || p.pregunta_id));
              } catch (e) {}
            });
        }

        const filas = [];

        nuevas.forEach(p => {
          if (existentes.has(p.id)) return;

          existentes.add(p.id);
          filas.push([codigo, p.json]);
        });

        if (e.parameter.limite_preguntas_v14 && existentes.size > Number(e.parameter.limite_preguntas_v14)) {
          throw new Error('Se ha alcanzado el tamaño de la actividad.');
        }
        if (filas.length) {
          sheet
            .getRange(sheet.getLastRow() + 1, 1, filas.length, 2)
            .setValues(filas);
        }

        SpreadsheetApp.flush();

        return resp({
          ok: true,
          codigo_guardado: codigo,
          preguntas_guardadas: filas.length,
          preguntas_omitidas_duplicadas:
            nuevas.length - filas.length
        });
      } finally {
        try {
          lock.releaseLock();
        } catch (e) {}
      }
    }

    if (action === 'guardarRespuestasBloque') {
      const sheetR = getSheetOrThrow(ss, 'respuestas');
      const filas = JSON.parse(e.parameter.filas || '[]');

      if (!Array.isArray(filas)) {
        return resp({
          error: 'Las filas recibidas no son válidas'
        });
      }

      const lock = LockService.getScriptLock();

      try {
        lock.waitLock(30000);

        asegurarColumnaDudaV15_(sheetR);
        const existentes = obtenerIdsRespuesta_(sheetR);
        const vistosEnPeticion = new Set();
        const nuevas = [];

        let omitidasDuplicadas = 0;
        let omitidasInvalidas = 0;

        filas.forEach(fila => {
          if (!Array.isArray(fila)) {
            omitidasInvalidas++;
            return;
          }

          const respuestaId = norm(fila[0]);

          if (!respuestaId) {
            omitidasInvalidas++;
            return;
          }

          if (
            existentes.has(respuestaId) ||
            vistosEnPeticion.has(respuestaId)
          ) {
            omitidasDuplicadas++;
            return;
          }

          vistosEnPeticion.add(respuestaId);
          const copia=fila.slice(0,22);
          while(copia.length<22)copia.push('');
          copia[10]=new Date().toISOString();
          copia[21]=norm(copia[21]).toUpperCase()==='SI'?'SI':'NO';
          nuevas.push(copia);
        });

        if (nuevas.length > 0) {
          const numColumnas = Math.max(
            sheetR.getLastColumn(),
            22
          );

          const normalizadas = nuevas.map(fila => {
            const salida = [];

            for (let c = 0; c < numColumnas; c++) {
              salida.push(c < fila.length ? fila[c] : '');
            }

            return salida;
          });

          sheetR
            .getRange(
              sheetR.getLastRow() + 1,
              1,
              normalizadas.length,
              numColumnas
            )
            .setValues(normalizadas);
        }

        return resp({
          ok: true,
          filas_recibidas: filas.length,
          filas_guardadas: nuevas.length,
          filas_omitidas_duplicadas: omitidasDuplicadas,
          filas_omitidas_invalidas: omitidasInvalidas
        });
      } finally {
        try {
          lock.releaseLock();
        } catch (e) {}
      }
    }

    if (action === 'registrarInicioExamen') {
      const codigo = norm(e.parameter.codigo);
      const sheetE = getSheetOrThrow(ss, 'examenes');
      const dataE = sheetE.getDataRange().getValues();

      for (let i = 1; i < dataE.length; i++) {
        if (norm(dataE[i][0]) === codigo) {
          const celdaInicio = sheetE.getRange(i + 1, 19);
          const inicioActual = celdaInicio.getValue();

          if (!inicioActual) {
            celdaInicio.setValue(
              e.parameter.hora_inicio ||
              new Date().toISOString()
            );
          }

          return resp({
            ok: true,
            codigo,
            hora_inicio: celdaInicio.getValue()
          });
        }
      }

      return resp({
        error: 'No se encontró el examen para registrar el inicio',
        codigo
      });
    }

    if (action === 'verificarEntrega') {
      const codigo = norm(e.parameter.codigo);

      if (!codigo) {
        return resp({
          error: 'Falta el código de la actividad'
        });
      }

      const lock = LockService.getScriptLock();

      try {
        lock.waitLock(30000);

        const sheetE = getSheetOrThrow(ss, 'examenes');
        const dataE = sheetE.getDataRange().getValues();

        const filaExamen = dataE.find(
          (r, idx) => idx > 0 && norm(r[0]) === codigo
        );

        if (!filaExamen) {
          return resp({
            error: 'No se encontró la actividad',
            codigo
          });
        }

        const sheetR = getSheetOrThrow(ss, 'respuestas');

        const guardadas = contarRespuestasUnicasExamen_(
          sheetR,
          codigo
        );

        const esperadasParametro =
          Number(e.parameter.esperadas || 0);

        const esperadasHoja =
          Number(filaExamen[5] || 0);

        const esperadas =
          esperadasParametro > 0
            ? esperadasParametro
            : esperadasHoja;

        const entregaCompleta =
          esperadas > 0
            ? guardadas >= esperadas
            : guardadas > 0;

        return resp({
          ok: true,
          codigo,
          respuestas_guardadas: guardadas,
          respuestas_esperadas: esperadas,
          entrega_completa: entregaCompleta,
          completado:
            norm(filaExamen[6]).toUpperCase() === 'SI'
              ? 'SI'
              : 'NO'
        });
      } finally {
        try {
          lock.releaseLock();
        } catch (e) {}
      }
    }

    if (action === 'finalizarExamen') {
      const codigo = norm(e.parameter.codigo);

      if (!codigo) {
        return resp({
          error: 'Falta el código de la actividad'
        });
      }

      const lock = LockService.getScriptLock();

      try {
        lock.waitLock(30000);

        const sheetE = getSheetOrThrow(ss, 'examenes');
        const dataE = sheetE.getDataRange().getValues();

        for (let i = 1; i < dataE.length; i++) {
          if (norm(dataE[i][0]) !== codigo) continue;

          if (norm(dataE[i][6]).toUpperCase() === 'SI') {
            return resp({
              ok: true,
              codigo,
              ya_completado: true,
              mensaje:
                'La actividad ya estaba finalizada; no se ha duplicado la entrega.'
            });
          }

          const sheetR = getSheetOrThrow(ss, 'respuestas');

          const respuestasGuardadas =
            contarRespuestasUnicasExamen_(sheetR, codigo);

          const respuestasEsperadas =
            Number(dataE[i][5] || 0);

          if (
            respuestasEsperadas > 0 &&
            respuestasGuardadas < respuestasEsperadas
          ) {
            return resp({
              error: 'La entrega todavía está incompleta',
              codigo,
              respuestas_guardadas: respuestasGuardadas,
              respuestas_esperadas: respuestasEsperadas
            });
          }

          const filaFinal = Array.from(
            { length: 30 },
            (_, c) =>
              dataE[i][c] === undefined ? '' : dataE[i][c]
          );

          filaFinal[6] = 'SI';

          filaFinal[19] =
            e.parameter.hora_fin ||
            new Date().toISOString();

          const camposTiempo = [
            'tiempo_transcurrido_segundos',
            'tiempo_resolucion_segundos',
            'tiempo_visible_segundos',
            'tiempo_fuera_pestana_segundos',
            'tiempo_medio_pregunta_segundos'
          ];

          camposTiempo.forEach((campo, j) => {
            filaFinal[20 + j] =
              numberOrBlank(e.parameter[campo]);
          });

          filaFinal[25] = (
            e.parameter.sistema_penalizacion ||
            'SIN_PENALIZACION'
          ).toUpperCase();

          [
            'penalizacion_acumulada',
            'puntuacion_neta',
            'nota_bruta',
            'nota_final'
          ].forEach((campo, j) => {
            filaFinal[26 + j] =
              numberOrBlank(e.parameter[campo]);
          });

          sheetE
            .getRange(i + 1, 1, 1, 30)
            .setValues([filaFinal]);

          SpreadsheetApp.flush();

          return resp({
            ok: true,
            codigo,
            ya_completado: false,
            respuestas_guardadas: respuestasGuardadas
          });
        }

        return resp({
          error: 'No se encontró el examen para finalizarlo',
          codigo
        });
      } finally {
        try {
          lock.releaseLock();
        } catch (e) {}
      }
    }

    if (action === 'marcarExamenCompletado') {
      const codigo = norm(e.parameter.codigo);
      const sheetE = getSheetOrThrow(ss, 'examenes');
      const data = sheetE.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (norm(data[i][0]) === codigo) {
          sheetE.getRange(i + 1, 7).setValue('SI');

          return resp({
            ok: true,
            codigo
          });
        }
      }

      return resp({
        error: 'No se encontró el examen para marcarlo como completado',
        codigo
      });
    }

    if (action === 'estadoConfiguracionImagenes') {
      return resp(estadoConfiguracionImagenes_());
    }

    return resp({
      error: 'Acción no reconocida',
      action
    });
  } catch (err) {
    return resp({
      error: 'Excepción en Apps Script',
      detalle: String(err)
    });
  }
}

function procesarEditorV14_(e) {
  try {
    const action = norm(
      (e && e.parameter && e.parameter.action) || ''
    );

    const accionesActividad = [
      'guardarExamen',
      'guardarPreguntas',
      'guardarRespuestasBloque',
      'registrarInicioExamen',
      'verificarEntrega',
      'finalizarExamen'
    ];

    if (accionesActividad.indexOf(action) !== -1) {
      return procesarBancoV14_(e);
    }

    const accionesEditor = [
      'validarEditor',
      'subirImagen',
      'listarImagenes',
      'guardarPregunta',
      'cambiarEstadoPregunta'
    ];

    if (accionesEditor.indexOf(action) === -1) {
      return resp({
        error: 'Acción POST no reconocida',
        action
      });
    }

    // En V14/V15, esta función solo se alcanza después de validar
    // que la sesión pertenece a un profesor en doPost().
    // No se exige una segunda contraseña privada para el editor.
    if (action === 'validarEditor') {
      return resp({
        ok: true,
        editor_autorizado: true
      });
    }

    if (action === 'subirImagen') {
      return procesarSubidaImagen_(e);
    }

    if (action === 'listarImagenes') {
      return listarImagenesGitHub_();
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (action === 'guardarPregunta') {
      const resultado = guardarPreguntaEditor_(ss, e);
      invalidarResumenTemas_();
      return resultado;
    }

    if (action === 'cambiarEstadoPregunta') {
      const resultado = cambiarEstadoPreguntaEditor_(ss, e);
      invalidarResumenTemas_();
      return resultado;
    }

    return resp({
      error: 'Acción POST no reconocida',
      action
    });
  } catch (err) {
    return resp({
      error: 'Excepción en la operación del editor',
      detalle: String(err)
    });
  }
}

/* =====================================================
   BIBLIOTECA DE IMÁGENES
===================================================== */

function listarImagenesGitHub_() {
  const config = obtenerConfigGitHub_();

  if (!config.ok) {
    return resp({
      error: 'La configuración de GitHub está incompleta',
      codigo: 'CONFIG_GITHUB_INCOMPLETA',
      propiedades_faltantes: config.faltantes
    });
  }

  const cache = CacheService.getScriptCache();

  const cacheKey =
    'biblioteca_imagenes_' +
    config.owner + '_' +
    config.repo + '_' +
    config.branch + '_' +
    config.folder;

  const cacheado = cache.get(cacheKey);

  if (cacheado) {
    try {
      return resp(JSON.parse(cacheado));
    } catch (e) {}
  }

  const url =
    'https://api.github.com/repos/' +
    encodeURIComponent(config.owner) + '/' +
    encodeURIComponent(config.repo) +
    '/git/trees/' +
    encodeURIComponent(config.branch) +
    '?recursive=1';

  let respuesta;

  try {
    respuesta = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': 'Bearer ' + config.token,
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'Apps-Script-Examenes'
      },
      muteHttpExceptions: true
    });
  } catch (err) {
    return resp({
      error: 'No se pudo consultar la biblioteca de imágenes',
      codigo: 'EXCEPCION_URLFETCH_BIBLIOTECA',
      detalle: String(err)
    });
  }

  const status = respuesta.getResponseCode();
  let github = {};

  try {
    github = JSON.parse(
      respuesta.getContentText() || '{}'
    );
  } catch (e) {}

  if (status !== 200) {
    return resp({
      error: mensajeErrorGitHub_(status, github),
      codigo: 'ERROR_GITHUB_BIBLIOTECA',
      estado_http: status
    });
  }

  const prefijo = limpiarRutaGitHub_(config.folder);
  const prefijoConBarra = prefijo ? prefijo + '/' : '';
  const extensiones = /\.(jpe?g|png|webp)$/i;
  const base = config.publicBase.replace(/\/+$/, '');

  const imagenes = (github.tree || [])
    .filter(item =>
      item &&
      item.type === 'blob' &&
      typeof item.path === 'string' &&
      (
        !prefijoConBarra ||
        item.path.indexOf(prefijoConBarra) === 0
      ) &&
      extensiones.test(item.path)
    )
    .map(item => {
      const nombre = item.path.split('/').pop();
      const partes = item.path.split('/');

      const anio =
        partes.length >= 3
          ? partes[partes.length - 3]
          : '';

      const mes =
        partes.length >= 2
          ? partes[partes.length - 2]
          : '';

      return {
        nombre,
        ruta: item.path,
        url:
          base + '/' +
          item.path.split('/').map(encodeURIComponent).join('/'),
        tamano_bytes: Number(item.size || 0),
        anio,
        mes
      };
    })
    .sort((a, b) => b.ruta.localeCompare(a.ruta));

  const resultado = {
    ok: true,
    total: imagenes.length,
    carpeta: prefijo,
    imagenes,
    truncado: Boolean(github.truncated)
  };

  try {
    cache.put(cacheKey, JSON.stringify(resultado), 60);
  } catch (e) {}

  return resp(resultado);
}

/* =====================================================
   SUBIDA DE IMÁGENES
===================================================== */

function procesarSubidaImagen_(e) {
  let etapa = 'inicio';

  try {
    etapa = 'leer configuración';

    const config = obtenerConfigGitHub_();

    if (!config.ok) {
      return resp({
        error: 'La configuración de GitHub está incompleta',
        codigo: 'CONFIG_GITHUB_INCOMPLETA',
        propiedades_faltantes: config.faltantes
      });
    }

    etapa = 'leer parámetros';

    const mimeType =
      norm(e.parameter.mime_type).toLowerCase();

    const nombreOriginal =
      norm(e.parameter.nombre_archivo || 'imagen');

    let contenidoBase64 =
      norm(e.parameter.contenido_base64);

    const comaDataUrl = contenidoBase64.indexOf(',');

    if (
      contenidoBase64.indexOf('data:') === 0 &&
      comaDataUrl >= 0
    ) {
      contenidoBase64 =
        contenidoBase64.slice(comaDataUrl + 1);
    }

    contenidoBase64 =
      contenidoBase64.replace(/\s+/g, '');

    const tiposPermitidos = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };

    if (
      !Object.prototype.hasOwnProperty.call(
        tiposPermitidos,
        mimeType
      )
    ) {
      return resp({
        error: 'Formato no permitido. Usa JPG, PNG o WebP.',
        codigo: 'TIPO_NO_PERMITIDO'
      });
    }

    if (!contenidoBase64) {
      return resp({
        error: 'No se recibió el contenido de la imagen',
        codigo: 'IMAGEN_VACIA'
      });
    }

    etapa = 'decodificar Base64';

    let bytes;

    try {
      bytes = Utilities.base64Decode(contenidoBase64);
    } catch (err) {
      return resp({
        error: 'El contenido recibido no es una imagen Base64 válida',
        codigo: 'BASE64_INVALIDO',
        detalle: String(err)
      });
    }

    const maxBytes = 3 * 1024 * 1024;

    if (!bytes || bytes.length === 0) {
      return resp({
        error: 'La imagen está vacía',
        codigo: 'IMAGEN_VACIA'
      });
    }

    if (bytes.length > maxBytes) {
      return resp({
        error: 'La imagen supera el límite de 3 MB',
        codigo: 'IMAGEN_DEMASIADO_GRANDE',
        tamano_bytes: bytes.length,
        limite_bytes: maxBytes
      });
    }

    etapa = 'comprobar formato real';

    if (!firmaImagenValida_(bytes, mimeType)) {
      return resp({
        error: 'El contenido del archivo no coincide con el formato declarado',
        codigo: 'FIRMA_ARCHIVO_INVALIDA'
      });
    }

    etapa = 'generar ruta';

    const extension = tiposPermitidos[mimeType];

    const ruta = construirRutaImagen_(
      config.folder,
      nombreOriginal,
      extension
    );

    etapa = 'esperar bloqueo';

    const lock = LockService.getScriptLock();

    try {
      lock.waitLock(30000);

      etapa = 'preparar petición a GitHub';

      const apiUrl =
        'https://api.github.com/repos/' +
        encodeURIComponent(config.owner) + '/' +
        encodeURIComponent(config.repo) +
        '/contents/' +
        ruta.split('/').map(encodeURIComponent).join('/');

      const payload = {
        message: 'Añadir imagen desde el editor de exámenes',
        content: contenidoBase64,
        branch: config.branch
      };

      etapa = 'enviar a GitHub';

      let respuesta;

      try {
        respuesta = UrlFetchApp.fetch(apiUrl, {
          method: 'put',
          contentType: 'application/json',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': 'Bearer ' + config.token,
            'X-GitHub-Api-Version': '2026-03-10'
          },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });
      } catch (err) {
        const detalleConexion = String(err);

        return resp({
          error:
            'No se pudo realizar la conexión con GitHub. Detalle: ' +
            detalleConexion,
          codigo: 'EXCEPCION_URLFETCH',
          etapa,
          detalle: detalleConexion,
          pila: err && err.stack ? String(err.stack) : ''
        });
      }

      etapa = 'interpretar respuesta de GitHub';

      const status = respuesta.getResponseCode();
      const texto = respuesta.getContentText();

      let github = {};

      try {
        github = texto ? JSON.parse(texto) : {};
      } catch (err) {}

      if (status !== 200 && status !== 201) {
        return resp({
          error: mensajeErrorGitHub_(status, github),
          codigo: 'ERROR_GITHUB',
          estado_http: status,
          detalle_github: norm(github && github.message)
        });
      }

      etapa = 'construir URL pública';

      const base = config.publicBase.replace(/\/+$/, '');

      const urlPublica =
        base + '/' +
        ruta.split('/').map(encodeURIComponent).join('/');

      return resp({
        ok: true,
        nombre_original: nombreOriginal,
        nombre_guardado: ruta.split('/').pop(),
        ruta,
        mime_type: mimeType,
        tamano_bytes: bytes.length,
        imagen_url: urlPublica
      });
    } finally {
      try {
        lock.releaseLock();
      } catch (err) {}
    }
  } catch (err) {
    return resp({
      error: 'Error al subir la imagen en la etapa: ' + etapa,
      codigo: 'EXCEPCION_SUBIDA_IMAGEN',
      etapa,
      detalle: String(err),
      pila: err && err.stack ? String(err.stack) : ''
    });
  }
}

/* =====================================================
   EDITOR DE PREGUNTAS
===================================================== */

function guardarPreguntaEditor_(ss, e) {
  const sheet = getSheetOrThrow(ss, 'preguntas');
  let pregunta;

  try {
    pregunta = JSON.parse(
      e.parameter.pregunta_json || '{}'
    );
  } catch (err) {
    return resp({
      error: 'Los datos de la pregunta no son JSON válido',
      codigo: 'PREGUNTA_JSON_INVALIDA'
    });
  }

  if (
    !pregunta ||
    typeof pregunta !== 'object' ||
    Array.isArray(pregunta)
  ) {
    return resp({
      error: 'Los datos de la pregunta no son válidos',
      codigo: 'PREGUNTA_INVALIDA'
    });
  }

  const modo =
    norm(e.parameter.modo || 'CREAR').toUpperCase();

  const idOriginal = norm(e.parameter.id_original);
  const datos = normalizarPreguntaEditor_(pregunta);
  const errores = validarPreguntaEditor_(datos);

  if (errores.length > 0) {
    return resp({
      error: 'La pregunta contiene datos incompletos o inválidos',
      codigo: 'VALIDACION_PREGUNTA',
      errores
    });
  }

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const data = sheet.getDataRange().getValues();

    if (!data || data.length === 0) {
      return resp({
        error: 'La hoja preguntas no tiene encabezados',
        codigo: 'SIN_ENCABEZADOS'
      });
    }

    const headers = data[0].map(normalizeHeader);

    const requeridas = [
      'tema_id',
      'tema_nombre',
      'concepto_id',
      'concepto_nombre',
      'enunciado',
      'opcion_a',
      'opcion_b',
      'opcion_c',
      'opcion_d',
      'opcion_e',
      'correcta',
      'fuente',
      'dificultad',
      'explicacion_corta',
      'explicacion_larga',
      'estado_explicacion',
      'tags',
      'activa',
      'version',
      'pregunta_id',
      'imagen_url',
      'imagen_alt'
    ];

    const faltantes = requeridas.filter(
      h => headers.indexOf(h) === -1
    );

    if (faltantes.length > 0) {
      return resp({
        error: 'Faltan columnas necesarias en la hoja preguntas',
        codigo: 'COLUMNAS_FALTANTES',
        columnas_faltantes: faltantes
      });
    }

    const idxId = headers.indexOf('pregunta_id');

    let filaExistente = -1;

    for (let i = 1; i < data.length; i++) {
      if (norm(data[i][idxId]) === datos.pregunta_id) {
        filaExistente = i;
        break;
      }
    }

    if (modo === 'CREAR' && filaExistente >= 0) {
      return resp({
        error: 'Ya existe una pregunta con ese pregunta_id',
        codigo: 'ID_DUPLICADO',
        pregunta_id: datos.pregunta_id
      });
    }

    if (modo === 'EDITAR') {
      if (!idOriginal) {
        return resp({
          error: 'Falta el identificador original de la pregunta',
          codigo: 'ID_ORIGINAL_FALTANTE'
        });
      }

      if (datos.pregunta_id !== idOriginal) {
        return resp({
          error: 'No se permite cambiar pregunta_id durante la edición',
          codigo: 'ID_NO_EDITABLE'
        });
      }

      filaExistente = -1;

      for (let i = 1; i < data.length; i++) {
        if (norm(data[i][idxId]) === idOriginal) {
          filaExistente = i;
          break;
        }
      }

      if (filaExistente < 0) {
        return resp({
          error: 'No se encontró la pregunta que se quería editar',
          codigo: 'PREGUNTA_NO_ENCONTRADA',
          pregunta_id: idOriginal
        });
      }
    }

    let version = 1;

    if (filaExistente >= 0) {
      const idxVersion = headers.indexOf('version');
      const anterior =
        Number(data[filaExistente][idxVersion] || 0);

      version =
        isFinite(anterior) && anterior >= 1
          ? Math.floor(anterior) + 1
          : 2;
    }

    datos.version = version;

    const valores = {
      tema_id: datos.tema_id,
      tema_nombre: datos.tema_nombre,
      concepto_id: datos.concepto_id,
      concepto_nombre: datos.concepto_nombre,
      enunciado: datos.enunciado,
      opcion_a: datos.opcion_a,
      opcion_b: datos.opcion_b,
      opcion_c: datos.opcion_c,
      opcion_d: datos.opcion_d,
      opcion_e: datos.opcion_e,
      correcta: datos.correcta,
      fuente: datos.fuente,
      dificultad: datos.dificultad,
      explicacion_corta: datos.explicacion_corta,
      explicacion_larga: datos.explicacion_larga,
      estado_explicacion: datos.estado_explicacion,
      tags: datos.tags,
      activa: datos.activa ? 'SI' : 'NO',
      version: datos.version,
      pregunta_id: datos.pregunta_id,
      imagen_url: datos.imagen_url,
      imagen_alt: datos.imagen_alt
    };

    if (modo === 'EDITAR') {
      const numeroFila = filaExistente + 1;

      Object.keys(valores).forEach(campo => {
        const col = headers.indexOf(campo);

        sheet
          .getRange(numeroFila, col + 1)
          .setValue(valores[campo]);
      });

      return resp({
        ok: true,
        operacion: 'EDITADA',
        pregunta_id: datos.pregunta_id,
        version: datos.version,
        fila: numeroFila
      });
    }

    const nuevaFila =
      new Array(headers.length).fill('');

    Object.keys(valores).forEach(campo => {
      const col = headers.indexOf(campo);
      nuevaFila[col] = valores[campo];
    });

    sheet.appendRow(nuevaFila);

    return resp({
      ok: true,
      operacion: 'CREADA',
      pregunta_id: datos.pregunta_id,
      version: datos.version,
      fila: sheet.getLastRow()
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function cambiarEstadoPreguntaEditor_(ss, e) {
  const preguntaId = norm(e.parameter.pregunta_id);
  const activaTexto = norm(e.parameter.activa).toUpperCase();

  const activa =
    ['SI', 'SÍ', 'TRUE', '1'].indexOf(activaTexto) >= 0;

  if (!preguntaId) {
    return resp({
      error: 'Falta pregunta_id',
      codigo: 'ID_FALTANTE'
    });
  }

  const sheet = getSheetOrThrow(ss, 'preguntas');
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(normalizeHeader);

    const idxId = headers.indexOf('pregunta_id');
    const idxActiva = headers.indexOf('activa');
    const idxVersion = headers.indexOf('version');

    if (idxId < 0 || idxActiva < 0) {
      return resp({
        error: 'Faltan las columnas pregunta_id o activa',
        codigo: 'COLUMNAS_FALTANTES'
      });
    }

    for (let i = 1; i < data.length; i++) {
      if (norm(data[i][idxId]) !== preguntaId) continue;

      sheet
        .getRange(i + 1, idxActiva + 1)
        .setValue(activa ? 'SI' : 'NO');

      let version = '';

      if (idxVersion >= 0) {
        const anterior =
          Number(data[i][idxVersion] || 0);

        version =
          isFinite(anterior) && anterior >= 1
            ? Math.floor(anterior) + 1
            : 1;

        sheet
          .getRange(i + 1, idxVersion + 1)
          .setValue(version);
      }

      return resp({
        ok: true,
        pregunta_id: preguntaId,
        activa,
        version
      });
    }

    return resp({
      error: 'No se encontró la pregunta',
      codigo: 'PREGUNTA_NO_ENCONTRADA',
      pregunta_id: preguntaId
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function normalizarPreguntaEditor_(p) {
  function txt(v) {
    return String(
      v === undefined || v === null ? '' : v
    ).trim();
  }

  const fuente =
    txt(p.fuente || 'PROPIA').toUpperCase();

  const dificultad =
    txt(p.dificultad || 'media').toLowerCase();

  const estado =
    txt(p.estado_explicacion || 'revisada').toLowerCase();

  const correcta =
    txt(p.correcta || p.respuesta_correcta).toUpperCase();

  return {
    tema_id: txt(p.tema_id || p.tema),
    tema_nombre: txt(p.tema_nombre),
    concepto_id: txt(p.concepto_id),
    concepto_nombre: txt(p.concepto_nombre || p.concepto),
    enunciado: txt(p.enunciado),
    opcion_a: txt(p.opcion_a),
    opcion_b: txt(p.opcion_b),
    opcion_c: txt(p.opcion_c),
    opcion_d: txt(p.opcion_d),
    opcion_e: txt(p.opcion_e),
    correcta,
    fuente,
    dificultad,
    explicacion_corta: txt(p.explicacion_corta),
    explicacion_larga: txt(p.explicacion_larga),
    estado_explicacion: estado,
    tags: txt(p.tags),

    activa: !['NO', 'FALSE', '0'].includes(
      txt(
        p.activa === undefined ? 'SI' : p.activa
      ).toUpperCase()
    ),

    version: Number(p.version || 1),
    pregunta_id: txt(p.pregunta_id || p.id),
    imagen_url: txt(p.imagen_url),
    imagen_alt: txt(p.imagen_alt)
  };
}

function validarPreguntaEditor_(p) {
  const errores = [];

  [
    ['tema_id', 'Falta el identificador del tema'],
    ['tema_nombre', 'Falta el nombre del tema'],
    ['concepto_id', 'Falta el identificador del concepto'],
    ['concepto_nombre', 'Falta el nombre del concepto'],
    ['enunciado', 'Falta el enunciado'],
    ['pregunta_id', 'Falta pregunta_id'],
    ['fuente', 'Falta la fuente']
  ].forEach(par => {
    if (!p[par[0]]) errores.push(par[1]);
  });

  const opciones = {
    A: p.opcion_a,
    B: p.opcion_b,
    C: p.opcion_c,
    D: p.opcion_d,
    E: p.opcion_e
  };

  const disponibles = Object.keys(opciones)
    .filter(letra => opciones[letra] !== '');

  if (disponibles.length < 2) {
    errores.push(
      'Debe haber al menos dos opciones con contenido'
    );
  }

  if (
    !p.correcta ||
    disponibles.indexOf(p.correcta) === -1
  ) {
    errores.push(
      'La respuesta correcta debe corresponder a una opción con contenido'
    );
  }

  if (
    ['facil', 'media', 'dificil'].indexOf(p.dificultad) === -1
  ) {
    errores.push(
      'La dificultad debe ser facil, media o dificil'
    );
  }

  if (p.imagen_url) {
    if (!/^https:\/\//i.test(p.imagen_url)) {
      errores.push(
        'La URL de la imagen debe comenzar por https://'
      );
    }

    if (!p.imagen_alt) {
      errores.push(
        'Añade una descripción accesible para la imagen'
      );
    }
  }

  if (p.pregunta_id.length > 120) {
    errores.push('pregunta_id es demasiado largo');
  }

  return errores;
}

/* =====================================================
   CONFIGURACIÓN DE IMÁGENES Y GITHUB
===================================================== */

function estadoConfiguracionImagenes_() {
  const config = obtenerConfigGitHub_();

  return {
    ok: true,
    servicio_imagenes:
      config.ok ? 'CONFIGURADO' : 'INCOMPLETO',
    configuracion_completa: config.ok,
    propiedades_faltantes: config.faltantes,
    formatos_permitidos: [
      'image/jpeg',
      'image/png',
      'image/webp'
    ],
    limite_bytes: 3 * 1024 * 1024,
    limite_mb: 3,
    carpeta: config.folder || '',
    base_publica: config.publicBase || '',
    token_configurado: Boolean(config.token),
    clave_editor_configurada: Boolean(config.editorKey)
  };
}

function obtenerConfigGitHub_() {
  const props = PropertiesService.getScriptProperties();

  const owner = norm(props.getProperty('GITHUB_OWNER')) || GITHUB_DEFAULT_OWNER;
  const repo = norm(props.getProperty('GITHUB_REPO')) || GITHUB_DEFAULT_REPO;
  const branch = norm(props.getProperty('GITHUB_BRANCH')) || GITHUB_DEFAULT_BRANCH;
  const folder = limpiarRutaGitHub_(props.getProperty('GITHUB_FOLDER')) || GITHUB_DEFAULT_FOLDER;

  const config = {
    token: norm(props.getProperty('GITHUB_TOKEN')),
    owner,
    repo,
    branch,
    folder,
    publicBase:
      norm(props.getProperty('GITHUB_PUBLIC_BASE')) ||
      ('https://raw.githubusercontent.com/' + owner + '/' + repo + '/' + branch),
    editorKey:
      norm(props.getProperty('EDITOR_UPLOAD_KEY') || props.getProperty('EDITOR_KEY'))
  };

  const requeridas = {
    GITHUB_TOKEN: config.token
  };

  const faltantes = Object.keys(requeridas)
    .filter(k => !requeridas[k]);

  config.faltantes = faltantes;
  config.ok = faltantes.length === 0;

  return config;
}

function validarClaveEditor_(claveRecibida) {
  const props = PropertiesService.getScriptProperties();
  const claveGuardada = norm(
    props.getProperty('EDITOR_UPLOAD_KEY') || props.getProperty('EDITOR_KEY')
  );

  if (!claveGuardada || !claveRecibida) return false;

  const a = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    claveGuardada,
    Utilities.Charset.UTF_8
  );

  const b = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    claveRecibida,
    Utilities.Charset.UTF_8
  );

  if (a.length !== b.length) return false;

  let diferencia = 0;

  for (let i = 0; i < a.length; i++) {
    diferencia |= (a[i] ^ b[i]);
  }

  return diferencia === 0;
}

function byteSinSigno_(bytes, indice) {
  const valor = Number(bytes[indice]);
  return valor < 0 ? valor + 256 : valor;
}

function firmaImagenValida_(bytes, mimeType) {
  if (!bytes || typeof bytes.length !== 'number') {
    return false;
  }

  if (mimeType === 'image/jpeg') {
    return (
      bytes.length >= 3 &&
      byteSinSigno_(bytes, 0) === 0xFF &&
      byteSinSigno_(bytes, 1) === 0xD8 &&
      byteSinSigno_(bytes, 2) === 0xFF
    );
  }

  if (mimeType === 'image/png') {
    const firma = [
      0x89, 0x50, 0x4E, 0x47,
      0x0D, 0x0A, 0x1A, 0x0A
    ];

    if (bytes.length < firma.length) return false;

    for (let i = 0; i < firma.length; i++) {
      if (byteSinSigno_(bytes, i) !== firma[i]) {
        return false;
      }
    }

    return true;
  }

  if (mimeType === 'image/webp') {
    return (
      bytes.length >= 12 &&
      byteSinSigno_(bytes, 0) === 0x52 &&
      byteSinSigno_(bytes, 1) === 0x49 &&
      byteSinSigno_(bytes, 2) === 0x46 &&
      byteSinSigno_(bytes, 3) === 0x46 &&
      byteSinSigno_(bytes, 8) === 0x57 &&
      byteSinSigno_(bytes, 9) === 0x45 &&
      byteSinSigno_(bytes, 10) === 0x42 &&
      byteSinSigno_(bytes, 11) === 0x50
    );
  }

  return false;
}

function construirRutaImagen_(
  folder,
  nombreOriginal,
  extension
) {
  const ahora = new Date();
  const zona =
    Session.getScriptTimeZone() || 'Etc/UTC';

  const anio = Utilities.formatDate(
    ahora,
    zona,
    'yyyy'
  );

  const mes = Utilities.formatDate(
    ahora,
    zona,
    'MM'
  );

  const fechaHora = Utilities.formatDate(
    ahora,
    zona,
    'yyyyMMdd-HHmmss'
  );

  const base = nombreOriginal
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'imagen';

  const unico = Utilities
    .getUuid()
    .replace(/-/g, '')
    .slice(0, 10);

  const archivo =
    fechaHora + '-' +
    base + '-' +
    unico + '.' +
    extension;

  return [
    limpiarRutaGitHub_(folder),
    anio,
    mes,
    archivo
  ]
    .filter(Boolean)
    .join('/');
}

function limpiarRutaGitHub_(ruta) {
  return norm(ruta)
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map(segmento =>
      segmento
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    )
    .filter(Boolean)
    .join('/');
}

function mensajeErrorGitHub_(status, github) {
  const mensaje = norm(github && github.message);

  if (status === 401) {
    return 'GitHub rechazó el token. Comprueba GITHUB_TOKEN.';
  }

  if (status === 403) {
    return 'El token no tiene permiso de escritura o GitHub ha limitado temporalmente las peticiones.';
  }

  if (status === 404) {
    return 'No se encontró el repositorio, la rama o el token no tiene acceso al repositorio.';
  }

  if (status === 409) {
    return 'GitHub detectó un conflicto al crear el archivo. Inténtalo de nuevo.';
  }

  if (status === 422) {
    return 'GitHub rechazó los datos de la imagen o la ruta generada.';
  }

  return mensaje
    ? 'GitHub respondió: ' + mensaje
    : 'GitHub respondió con el estado HTTP ' + status;
}

/* =====================================================
   FUNCIONES AUXILIARES DE RESPUESTAS
===================================================== */

function obtenerIdsRespuesta_(sheet) {
  const ids = new Set();
  const ultimaFila = sheet.getLastRow();

  if (ultimaFila <= 1) return ids;

  sheet
    .getRange(2, 1, ultimaFila - 1, 1)
    .getDisplayValues()
    .forEach(r => {
      const id = norm(r[0]);
      if (id) ids.add(id);
    });

  return ids;
}

function contarRespuestasUnicasExamen_(sheet, codigo) {
  const ultimaFila = sheet.getLastRow();

  if (ultimaFila <= 1) return 0;

  const data = sheet
    .getRange(2, 1, ultimaFila - 1, 2)
    .getDisplayValues();

  const ids = new Set();

  data.forEach(r => {
    if (norm(r[1]) === codigo) {
      const id = norm(r[0]);
      if (id) ids.add(id);
    }
  });

  return ids.size;
}

function getSheetOrThrow(ss, name) {
  const sh = ss.getSheetByName(name);

  if (!sh) {
    throw new Error('No existe la hoja: ' + name);
  }

  return sh;
}

function norm(v) {
  return String(
    v === undefined || v === null ? '' : v
  ).trim();
}

function numberOrBlank(v) {
  const txt = norm(v).replace(',', '.');

  if (txt === '') return '';

  const n = Number(txt);
  return isFinite(n) ? n : '';
}

function resp(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =====================================================
   RECUPERACIÓN DE PREGUNTAS Y EXPLICACIONES
===================================================== */

function buildPreguntasIndex(ss) {
  const sheet = getSheetOrThrow(ss, 'preguntas');
  const data = sheet.getDataRange().getValues();

  if (!data || data.length < 2) return {};

  const headers = data[0].map(
    h => normalizeHeader(h)
  );

  const index = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = rowToPregunta(headers, row);
    const id = norm(obj.id || obj.pregunta_id);

    if (id) {
      index[id] = obj;
    }
  }

  return index;
}

function hydratePregunta(pregunta, banco) {
  if (!pregunta || typeof pregunta !== 'object') {
    return pregunta;
  }

  const id = norm(
    pregunta.id || pregunta.pregunta_id
  );

  if (!id || !banco[id]) return pregunta;

  const origen = banco[id];

  const out = Object.assign(
    {},
    origen,
    pregunta
  );

  if (
    !out.opciones ||
    typeof out.opciones !== 'object' ||
    Object.keys(out.opciones).length === 0
  ) {
    out.opciones = origen.opciones || {};
  }

  out.id = out.id || origen.id || '';
  out.tema = out.tema || origen.tema || '';

  out.tema_nombre =
    out.tema_nombre || origen.tema_nombre || '';

  out.concepto =
    out.concepto || origen.concepto || '';

  out.enunciado =
    out.enunciado || origen.enunciado || '';

  out.respuesta_correcta =
    out.respuesta_correcta ||
    origen.respuesta_correcta ||
    '';

  out.explicacion_corta =
    out.explicacion_corta ||
    origen.explicacion_corta ||
    '';

  out.explicacion_larga =
    out.explicacion_larga ||
    origen.explicacion_larga ||
    '';

  out.estado_explicacion =
    out.estado_explicacion ||
    origen.estado_explicacion ||
    '';

  out.imagen_url =
    out.imagen_url || origen.imagen_url || '';

  out.imagen_alt =
    out.imagen_alt || origen.imagen_alt || '';

  return out;
}

function rowToPregunta(headers, row) {
  const raw = {};

  headers.forEach((h, i) => {
    raw[h] = row[i];
  });

  const pregunta = {
    id: pick(raw, ['id', 'pregunta_id']),
    pregunta_id: pick(raw, ['pregunta_id', 'id']),
    tema: pick(raw, ['tema', 'tema_id']),
    tema_id: pick(raw, ['tema_id', 'tema']),
    tema_nombre: pick(raw, ['tema_nombre', 'nombre_tema']),

    concepto: pick(raw, [
      'concepto',
      'concepto_nombre',
      'concepto_id'
    ]),

    concepto_id: pick(raw, ['concepto_id']),

    concepto_nombre: pick(raw, [
      'concepto_nombre',
      'concepto'
    ]),

    enunciado: pick(raw, ['enunciado', 'pregunta']),

    respuesta_correcta: pick(raw, [
      'respuesta_correcta',
      'correcta',
      'respuesta'
    ]),

    explicacion_corta: pick(raw, ['explicacion_corta']),
    explicacion_larga: pick(raw, ['explicacion_larga']),
    estado_explicacion: pick(raw, ['estado_explicacion']),

    imagen_url: pick(raw, [
      'imagen_url',
      'url_imagen'
    ]),

    imagen_alt: pick(raw, [
      'imagen_alt',
      'descripcion_imagen',
      'alt_imagen'
    ]),

    opciones: extractOpciones(raw)
  };

  Object.keys(raw).forEach(k => {
    if (
      pregunta[k] === undefined &&
      raw[k] !== ''
    ) {
      pregunta[k] = raw[k];
    }
  });

  return pregunta;
}

function extractOpciones(raw) {
  const opcionesJson = pick(raw, ['opciones']);

  if (opcionesJson) {
    try {
      if (typeof opcionesJson === 'string') {
        const parsed = JSON.parse(opcionesJson);

        if (
          parsed &&
          typeof parsed === 'object'
        ) {
          return parsed;
        }
      }
    } catch (e) {}
  }

  const a = pick(raw, ['a', 'opcion_a', 'opciona']);
  const b = pick(raw, ['b', 'opcion_b', 'opcionb']);
  const c = pick(raw, ['c', 'opcion_c', 'opcionc']);
  const d = pick(raw, ['d', 'opcion_d', 'opciond']);
  const e = pick(raw, ['e', 'opcion_e', 'opcione']);

  const opciones = {};

  if (a !== '') opciones.a = a;
  if (b !== '') opciones.b = b;
  if (c !== '') opciones.c = c;
  if (d !== '') opciones.d = d;
  if (e !== '') opciones.e = e;

  return opciones;
}

function pick(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];

    if (
      Object.prototype.hasOwnProperty.call(obj, k)
    ) {
      const val = obj[k];

      if (
        val !== undefined &&
        val !== null &&
        String(val).trim() !== ''
      ) {
        return val;
      }
    }
  }

  return '';
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/* =====================================================
   DIAGNÓSTICO MANUAL DE GITHUB
   Solo se ejecuta si se llama desde el editor.
   Crea un pequeño TXT en la carpeta diagnostico.
===================================================== */

function diagnosticarConexionGitHub() {
  const config = obtenerConfigGitHub_();

  console.log('=== DIAGNÓSTICO GITHUB ===');
  console.log('Configuración completa: ' + config.ok);

  console.log(
    'Propiedades faltantes: ' +
    JSON.stringify(config.faltantes || [])
  );

  console.log(
    'Repositorio: ' + config.owner + '/' + config.repo
  );

  console.log('Rama: ' + config.branch);

  console.log(
    'Token presente: ' + Boolean(config.token)
  );

  if (!config.ok) {
    throw new Error(
      'Configuración incompleta: ' +
      JSON.stringify(config.faltantes || [])
    );
  }

  const headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': 'Bearer ' + config.token,
    'X-GitHub-Api-Version': '2026-03-10',
    'User-Agent': 'Apps-Script-Examenes'
  };

  const repoUrl =
    'https://api.github.com/repos/' +
    encodeURIComponent(config.owner) + '/' +
    encodeURIComponent(config.repo);

  try {
    const lectura = UrlFetchApp.fetch(repoUrl, {
      method: 'get',
      headers,
      muteHttpExceptions: true
    });

    console.log(
      'GET repositorio — HTTP ' +
      lectura.getResponseCode()
    );

    console.log(
      'GET cuerpo: ' +
      lectura.getContentText().slice(0, 500)
    );
  } catch (err) {
    console.error('EXCEPCIÓN GET: ' + String(err));

    if (err && err.stack) {
      console.error(String(err.stack));
    }

    throw err;
  }

  const nombre =
    'diagnostico/conexion-' +
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone() || 'Etc/UTC',
      'yyyyMMdd-HHmmss'
    ) +
    '-' +
    Utilities.getUuid().slice(0, 8) +
    '.txt';

  const putUrl =
    'https://api.github.com/repos/' +
    encodeURIComponent(config.owner) + '/' +
    encodeURIComponent(config.repo) +
    '/contents/' +
    nombre.split('/').map(encodeURIComponent).join('/');

  const contenido = Utilities.base64Encode(
    Utilities.newBlob(
      'Prueba de conexión de Apps Script con GitHub.\n' +
      new Date().toISOString(),
      'text/plain',
      'conexion.txt'
    ).getBytes()
  );

  const payload = {
    message: 'Diagnóstico de conexión desde Apps Script',
    content: contenido,
    branch: config.branch
  };

  try {
    const escritura = UrlFetchApp.fetch(putUrl, {
      method: 'put',
      contentType: 'application/json',
      headers,
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    console.log(
      'PUT archivo — HTTP ' +
      escritura.getResponseCode()
    );

    console.log(
      'PUT cuerpo: ' +
      escritura.getContentText().slice(0, 800)
    );

    if (
      [200, 201].indexOf(
        escritura.getResponseCode()
      ) >= 0
    ) {
      console.log(
        'RESULTADO: conexión y escritura correctas.'
      );

      console.log(
        'Archivo creado: ' + nombre
      );
    } else {
      console.log(
        'RESULTADO: GitHub respondió, pero rechazó la escritura.'
      );
    }
  } catch (err) {
    console.error('EXCEPCIÓN PUT: ' + String(err));

    if (err && err.stack) {
      console.error(String(err.stack));
    }

    throw err;
  }
}

/* =====================================================
   RESUMEN LIGERO DE TEMAS Y FUENTES
===================================================== */

function valorResumen_(v, fb = '') {
  return v === undefined || v === null
    ? fb
    : String(v).trim();
}

function esLetraResumen_(v) {
  return ['A', 'B', 'C', 'D', 'E'].includes(
    valorResumen_(v).toUpperCase()
  );
}

function normalizarPreguntaResumen_(row, i = 0) {
  const formatoFijoConOpcionE =
    esLetraResumen_(row[10]);

  const idxCorrecta =
    formatoFijoConOpcionE ? 10 : 9;

  const idxFuente =
    formatoFijoConOpcionE ? 11 : 10;

  const idxDificultad =
    formatoFijoConOpcionE ? 12 : 11;

  const idxExpCorta =
    formatoFijoConOpcionE ? 13 : 12;

  const idxExpLarga =
    formatoFijoConOpcionE ? 14 : 13;

  const idxEstado =
    formatoFijoConOpcionE ? 15 : 14;

  const idxTags =
    formatoFijoConOpcionE ? 16 : 15;

  const idxActiva =
    formatoFijoConOpcionE ? 17 : 16;

  const idxVersion =
    formatoFijoConOpcionE ? 18 : 17;

  const idxId =
    formatoFijoConOpcionE ? 19 : 18;

  const opciones = {
    a: valorResumen_(row[5]),
    b: valorResumen_(row[6]),
    c: valorResumen_(row[7]),
    d: valorResumen_(row[8])
  };

  const opcionE =
    formatoFijoConOpcionE
      ? valorResumen_(row[9])
      : '';

  if (opcionE) opciones.e = opcionE;

  return {
    id: valorResumen_(row[idxId], i + 1),
    pregunta_id: valorResumen_(row[idxId], i + 1),
    tema: valorResumen_(row[0]),
    tema_nombre: valorResumen_(row[1]),
    concepto_id: valorResumen_(row[2]),
    concepto: valorResumen_(row[3]),
    enunciado: valorResumen_(row[4]),
    opciones,

    respuesta_correcta:
      valorResumen_(row[idxCorrecta]).toUpperCase(),

    fuente:
      valorResumen_(row[idxFuente], 'PROPIA').toUpperCase(),

    dificultad:
      valorResumen_(row[idxDificultad], 'media').toLowerCase(),

    explicacion_corta:
      valorResumen_(row[idxExpCorta]),

    explicacion_larga:
      valorResumen_(row[idxExpLarga]),

    estado_explicacion:
      valorResumen_(row[idxEstado], 'ninguna').toLowerCase(),

    tags: valorResumen_(row[idxTags]),

    activa: !['0', 'false', 'no'].includes(
      valorResumen_(row[idxActiva], '1').toLowerCase()
    ),

    version:
      valorResumen_(row[idxVersion], '1'),

    imagen_url:
      valorResumen_(row[idxId + 1]),

    imagen_alt:
      valorResumen_(row[idxId + 2])
  };
}

function obtenerResumenTemas_(ss) {
  const key = 'temas_v11_' + SPREADSHEET_ID;

  try {
    const raw = CacheService
      .getScriptCache()
      .get(key);

    if (raw) return JSON.parse(raw);
  } catch (e) {}

  const rows = getSheetOrThrow(ss, 'preguntas')
    .getDataRange()
    .getValues();

  const unicos = new Map();

  rows.slice(1).forEach((row, i) => {
    const p = normalizarPreguntaResumen_(row, i);

    const letras = ['a', 'b', 'c', 'd', 'e']
      .filter(l => p.opciones[l]);

    if (
      !p.activa ||
      !p.enunciado ||
      letras.length < 2 ||
      !letras.includes(
        p.respuesta_correcta.toLowerCase()
      )
    ) {
      return;
    }

    const claveTemaFuente = JSON.stringify([
      p.tema,
      p.fuente
    ]);

    if (!unicos.has(claveTemaFuente)) {
      unicos.set(claveTemaFuente, {
        tema: p.tema,
        tema_nombre: p.tema_nombre,
        fuente: p.fuente
      });
    }
  });

  const result = {
    ok: true,
    items: Array.from(unicos.values())
  };

  try {
    CacheService
      .getScriptCache()
      .put(key, JSON.stringify(result), 60);
  } catch (e) {}

  return result;
}

function invalidarResumenTemas_() {
  try {
    CacheService
      .getScriptCache()
      .remove('temas_v11_' + SPREADSHEET_ID);
  } catch (e) {}
}
const BANCO_NOMBRE_V14 = 'Fisiología US';
const BANCO_REPASOS_V15 = false;
const MAESTRO_URL_V14 = 'https://script.google.com/macros/s/AKfycbyO0xdkuz1Z9sfcOQm-vBkoFZivDYtEC_F1fmflLO-1xJ9rAN_JbPGSjjkQdeMOEIE8Iw/exec';

function doGet(e) {
  return resp({ok:true, banco:BANCO_NOMBRE_V14, version:'15', requiere_sesion:true, repasos:BANCO_REPASOS_V15});
}

function doPost(e) {
  try {
    const p = Object.assign({}, e && e.parameter || {});
    const action = norm(p.action);
    p.action = action;
    const permitidas = ['getRepasos','getPreguntas','getTemasFuentes','getExamen','getExamenesAlumno','getRespuestasAlumno',
      'guardarExamen','guardarPreguntas','guardarRespuestasBloque','registrarInicioExamen','verificarEntrega',
      'finalizarExamen','validarEditor','guardarPregunta','cambiarEstadoPregunta','listarImagenes','subirImagen','estadoConfiguracionImagenes'];
    if (!permitidas.includes(action)) throw new Error('Acción no admitida.');
    if (!p.session_token) return resp({ok:false,codigo:'SESION_INVALIDA',error:'Inicia sesión para acceder al banco.'});
    const response = UrlFetchApp.fetch(MAESTRO_URL_V14, {method:'post',payload:{
      action:'validarSesionBanco',session_token:p.session_token,banco:BANCO_NOMBRE_V14
    },muteHttpExceptions:true});
    if (response.getResponseCode() !== 200) throw new Error('No se pudo consultar el permiso en el maestro.');
    const usuario = JSON.parse(response.getContentText());
    if (usuario.ok !== true || usuario.banco !== BANCO_NOMBRE_V14 || !['profesor','alumno'].includes(usuario.rol)) {
      return resp({ok:false,codigo:usuario.codigo || 'ACCESO_DENEGADO',error:usuario.error || 'Acceso denegado.'});
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const esProfesor = usuario.rol === 'profesor';
    const edicion = ['validarEditor','guardarPregunta','cambiarEstadoPregunta','listarImagenes','subirImagen','estadoConfiguracionImagenes'];
    if (edicion.includes(action)) {
      if (!esProfesor) throw new Error('Esta operación requiere acceso de profesor.');
      if (action === 'estadoConfiguracionImagenes') return procesarBancoV14_({parameter:p});
      return procesarEditorV14_({parameter:p});
    }
    if (!esProfesor) comprobarPermisosAlumnoV14_(ss,p,usuario);
    if (action === 'getRepasos') {
      if (!BANCO_REPASOS_V15) return resp({ok:false,codigo:'FUNCION_NO_ACTIVA',error:'Este banco no utiliza repaso espaciado V15.'});
      return resp(obtenerRepasosV15_(ss,norm(p.alumno_id),usuario));
    }
    if (action === 'guardarExamen') {
      // Los reintentos con el mismo código no crean otra actividad.
      const lock = LockService.getScriptLock();
      lock.waitLock(30000);
      try {
        const existente = filasBancoV14_(ss,'examenes').find(r=>norm(r[0])===norm(p.codigo));
        if (existente) {
          if (norm(existente[2])!==norm(p.alumno_id)) throw new Error('Código de actividad ya utilizado.');
          if (Number(existente[5])!==Number(p.num_preguntas) || norm(existente[4])!==norm(p.temas)) throw new Error('El código ya corresponde a otra configuración.');
          return resp({ok:true,codigo_guardado:p.codigo,ya_existente:true});
        }
        return procesarBancoV14_({parameter:p});
      } finally { lock.releaseLock(); }
    }
    let data = JSON.parse(procesarBancoV14_({parameter:p}).getContent());
    if (!esProfesor && !data.error) {
      if (action === 'getPreguntas' && data.length) {
        data = [data[0]].concat(data.slice(1).filter((r,i)=>fuentePermitidaV14_(usuario,normalizarPreguntaResumen_(r,i))));
      }
      if (action === 'getTemasFuentes') data.items = (data.items || []).filter(item=>fuentePermitidaV14_(usuario,item));
    }
    return resp(data);
  } catch (err) {
    return resp({ok:false,error:String(err.message || err)});
  }
}

function filasBancoV14_(ss,nombre) {
  return getSheetOrThrow(ss,nombre).getDataRange().getValues().slice(1);
}
function fuentePermitidaV14_(usuario,pregunta) {
  return !usuario.fuentes.length || usuario.fuentes.includes(norm(pregunta.fuente).toUpperCase());
}
function actividadPropiaV14_(ss,codigo,usuario) {
  const filas = filasBancoV14_(ss,'examenes').filter(r=>norm(r[0])===norm(codigo));
  if (filas.length!==1 || norm(filas[0][2])!==usuario.alumno_id) throw new Error('Actividad no disponible para este alumno.');
  return filas[0];
}
function preguntasActividadV14_(ss,codigo) {
  return filasBancoV14_(ss,'preguntas_examen').filter(r=>norm(r[0])===norm(codigo)).map(r=>JSON.parse(r[1]));
}
function comprobarPermisosAlumnoV14_(ss,p,u) {
  const a=p.action;
  if (['getRepasos','getPreguntas','getTemasFuentes','guardarExamen','guardarPreguntas'].includes(a) && u.modo!=='autonomo') {
    throw new Error('Tu acceso supervisado no permite generar actividades ni consultar el banco completo.');
  }
  if (['getRepasos','getExamenesAlumno','getRespuestasAlumno','guardarExamen'].includes(a)) {
    if (norm(p.alumno_id)!==u.alumno_id) throw new Error('Solo puedes acceder a tus propios resultados.');
  }
  if (a==='guardarExamen') {
    if (!norm(p.codigo) || !norm(p.temas)) throw new Error('Falta el código o la selección de contenidos.');
    const n=Number(p.num_preguntas);
    if (!Number.isInteger(n) || n<1 || n>1000) throw new Error('Número de preguntas no válido.');
    p.alumna=u.nombre;
    return;
  }
  const conActividad=['getExamen','guardarPreguntas','registrarInicioExamen','verificarEntrega','finalizarExamen'];
  if (conActividad.includes(a)) {
    const ex=actividadPropiaV14_(ss,p.codigo,u);
    if (['guardarPreguntas','registrarInicioExamen'].includes(a) && norm(ex[6])==='SI') throw new Error('La actividad ya está finalizada.');
    if (a==='guardarPreguntas') {
      const listado=JSON.parse(p.preguntas || '[]');
      if (!Array.isArray(listado) || listado.length>Number(ex[5])) throw new Error('Bloque de preguntas no válido.');
      const banco=buildPreguntasIndex(ss);
      const temas=norm(ex[4]).split(',');
      const canonicas=listado.map(q=>{
        const original=banco[norm(q.id || q.pregunta_id)];
        if (!original || !fuentePermitidaV14_(u,original) || !temas.includes(norm(original.tema))) throw new Error('Pregunta fuera de los contenidos autorizados.');
        if (['0','false','no'].includes(norm(original.activa).toLowerCase())) throw new Error('Pregunta desactivada.');
        return original;
      });
      const ids=new Set(preguntasActividadV14_(ss,p.codigo).map(q=>norm(q.id || q.pregunta_id)));
      canonicas.forEach(q=>ids.add(norm(q.id || q.pregunta_id)));
      if (ids.size>Number(ex[5])) throw new Error('La actividad ya tiene suficientes preguntas.');
      p.preguntas=JSON.stringify(canonicas);
      p.limite_preguntas_v14=String(ex[5]);
    }
    if (a==='verificarEntrega') p.esperadas=String(ex[5]);
    if (a==='finalizarExamen') {
      // Las notas se derivan de respuestas registradas, no de la nota enviada por el navegador.
      const respuestas=filasBancoV14_(ss,'respuestas').filter(r=>norm(r[1])===norm(p.codigo));
      const correctas=respuestas.filter(r=>norm(r[9])==='SI').length;
      const penalizacion=respuestas.reduce((sum,r)=>sum+(Number(r[20]) || 0),0);
      const total=Number(ex[5]);
      p.sistema_penalizacion=ex[25];
      p.penalizacion_acumulada=String(penalizacion);
      p.puntuacion_neta=String(correctas-penalizacion);
      p.nota_bruta=String(total?correctas/total*10:0);
      p.nota_final=String(total?Math.max(0,(correctas-penalizacion)/total*10):0);
    }
  }
  if (a==='guardarRespuestasBloque') {
    const filas=JSON.parse(p.filas || '[]');
    if (!Array.isArray(filas)) throw new Error('Respuestas no válidas.');
    const actividades={};
    p.filas=JSON.stringify(filas.map(r=>{
      if (!Array.isArray(r)) throw new Error('Fila de respuesta no válida.');
      const codigo=norm(r[1]);
      if (!actividades[codigo]) actividades[codigo]={ex:actividadPropiaV14_(ss,codigo,u),preguntas:preguntasActividadV14_(ss,codigo)};
      const datos=actividades[codigo];
      const idx=datos.preguntas.findIndex(q=>norm(q.id || q.pregunta_id)===norm(r[4]));
      if (idx<0) throw new Error('La pregunta no pertenece a la actividad.');
      const q=datos.preguntas[idx];
      const respuesta=norm(r[7]).toUpperCase();
      const opciones=Object.keys(q.opciones).filter(k=>norm(q.opciones[k]));
      if (respuesta && !opciones.includes(respuesta.toLowerCase())) throw new Error('Opción de respuesta no válida.');
      const correcta=!!respuesta && respuesta===norm(q.respuesta_correcta).toUpperCase();
      const penaliza=norm(datos.ex[25])==='ADAPTADA_OPCIONES';
      const salida=r.slice(0,22);while(salida.length<22)salida.push('');
      salida[21]=norm(r[21]).toUpperCase()==='SI'?'SI':'NO';
      salida[0]=codigo+'-'+(idx+1);salida[2]=u.nombre;salida[3]=u.alumno_id;
      salida[5]=q.tema;salida[6]=q.concepto;salida[7]=respuesta;salida[8]=q.respuesta_correcta;
      salida[9]=correcta?'SI':'NO';salida[10]=new Date().toISOString();salida[16]=idx+1;
      salida[19]=opciones.length;salida[20]=respuesta&&!correcta&&penaliza&&opciones.length>1?1/(opciones.length-1):0;
      return salida;
    }));
  }
}

function comprobarConexionBancoV14() {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  ['preguntas','examenes','preguntas_examen','respuestas'].forEach(n=>getSheetOrThrow(ss,n));
  const respuesta=UrlFetchApp.fetch(MAESTRO_URL_V14,{method:'post',payload:{action:'validarSesionBanco',banco:BANCO_NOMBRE_V14,session_token:''},muteHttpExceptions:true});
  const data=JSON.parse(respuesta.getContentText());
  if (data.codigo!=='SESION_INVALIDA') throw new Error('Actualiza el maestro a V14 y conserva su URL.');
  console.log(BANCO_NOMBRE_V14 + ': pestañas disponibles y maestro con validación de sesiones activo.');
}

// V15: el historial de entregas es la única fuente del calendario.
// Recalcular es idempotente: no hay una segunda tabla que pueda desincronizarse.
function calcularRepasosV15_(respuestas, examenes, alumnoId) {
  const actividades = new Map(examenes.filter(e => norm(e[2]) === alumnoId && norm(e[6]).toUpperCase() === 'SI').map(e => [norm(e[0]), e]));
  const vistos = new Set();
  const eventos = [];
  respuestas.forEach(r => {
    const ex = actividades.get(norm(r[1]));
    if (!ex || norm(r[3]) !== alumnoId || !norm(r[4])) return;
    const clave = JSON.stringify([norm(r[1]), norm(r[4])]);
    if (vistos.has(clave)) return;
    // La fecha de recepción de la respuesta se sella en el servidor V14/V15.
    const fecha = [r[10], ex[19], ex[1]].map(v => v ? new Date(v).getTime() : NaN).find(Number.isFinite);
    if (!Number.isFinite(fecha)) return;
    vistos.add(clave);
    eventos.push({r, fecha, clave});
  });
  eventos.sort((a,b) => a.fecha-b.fecha || a.clave.localeCompare(b.clave));
  const estados = new Map();
  const dias = [1,3,7,14,30,60,120];
  eventos.forEach(({r,fecha}) => {
    const id = norm(r[4]);
    const previo = estados.get(id);
    const st = previo || {pregunta_id:id, intentos:0, nivel:0, proximo_ms:0};
    const resultado = !norm(r[7]) ? 'blanco' : norm(r[7]).toUpperCase() !== norm(r[8]).toUpperCase() ? 'fallada' : norm(r[21]).toUpperCase() === 'SI' ? 'dudosa' : 'correcta';
    st.intentos++;
    if (resultado === 'fallada' || resultado === 'blanco') {
      st.nivel = 0;
      st.proximo_ms = fecha + 10*60*1000;
    } else if (resultado === 'dudosa') {
      st.nivel = 0;
      st.proximo_ms = previo && st.proximo_ms > fecha ? Math.min(st.proximo_ms, fecha+86400000) : fecha+86400000;
    } else if (!previo || fecha >= st.proximo_ms) {
      st.nivel = Math.min(st.nivel+1, dias.length);
      st.proximo_ms = fecha + dias[st.nivel-1]*86400000;
    }
    // Un acierto anticipado no alarga el intervalo ni sube el nivel.
    st.ultimo_resultado = resultado;
    st.ultima_revision = new Date(fecha).toISOString();
    st.proximo_repaso = new Date(st.proximo_ms).toISOString();
    estados.set(id, st);
  });
  return estados;
}

function obtenerRepasosV15_(ss, alumnoId, usuario) {
  if (!alumnoId) throw new Error('Selecciona un alumno para consultar los repasos.');
  const sheet = getSheetOrThrow(ss,'respuestas');
  const cabecera = sheet.getDataRange().getValues()[0] || [];
  if (norm(cabecera[21]) && norm(cabecera[21]) !== 'tiene_duda') throw new Error('La columna V de respuestas está ocupada por otra cabecera. Revisa la estructura antes de activar los repasos.');
  const estados = calcularRepasosV15_(filasBancoV14_(ss,'respuestas'), filasBancoV14_(ss,'examenes'), alumnoId);
  const ahora = Date.now();
  const items = filasBancoV14_(ss,'preguntas').map(normalizarPreguntaResumen_)
    .filter(q => q.activa && q.enunciado && Object.keys(q.opciones).length >= 2 && q.opciones[q.respuesta_correcta.toLowerCase()] && (usuario.rol === 'profesor' || fuentePermitidaV14_(usuario,q)))
    .map(q => {
      const st = estados.get(norm(q.pregunta_id));
      return Object.assign({pregunta_id:norm(q.pregunta_id),tema:q.tema,fuente:q.fuente,estado:'nueva'}, st || {}, st ? {estado:st.proximo_ms<=ahora?'pendiente':'programada'} : {});
    });
  return {ok:true,version:15,ahora:new Date(ahora).toISOString(),items};
}

// Se ejecuta dentro del bloqueo de guardarRespuestasBloque, antes de escribir.
function asegurarColumnaDudaV15_(sheet) {
  if (sheet.getMaxColumns() < 22) sheet.insertColumnsAfter(sheet.getMaxColumns(),22-sheet.getMaxColumns());
  const celda = sheet.getRange(1,22);
  const titulo = norm(celda.getValue());
  if (titulo && titulo !== 'tiene_duda') throw new Error('La columna V de respuestas está ocupada. Debe llamarse tiene_duda; no se ha sobrescrito.');
  if (!titulo) {
    if (sheet.getLastRow()>1 && sheet.getRange(2,22,sheet.getLastRow()-1,1).getValues().some(r=>norm(r[0]))) throw new Error('La columna V contiene datos sin cabecera; no se ha modificado.');
    celda.setValue('tiene_duda');
  }
}