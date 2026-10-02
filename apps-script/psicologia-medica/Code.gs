/**
 * APPS SCRIPT — Psicología Médica · núcleo unificado V15
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
 * Propiedades de script necesarias para editor/imágenes:
 *   EDITOR_UPLOAD_KEY (o EDITOR_KEY por compatibilidad)
 *   GITHUB_TOKEN
 * Owner/repo/branch/folder tienen valores seguros por defecto y pueden sobrescribirse.
 */

const SPREADSHEET_ID = '1Rjb8Xt8risAkZjFbnoF7_Bl9CJeTxYpYfHzVqyHQ-Fk';
const GITHUB_DEFAULT_OWNER = 'osph795';
const GITHUB_DEFAULT_REPO = 'examenes-imagenes';
const GITHUB_DEFAULT_BRANCH = 'main';
const GITHUB_DEFAULT_FOLDER = 'images/psicologia';

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

    const editorKey = norm(e.parameter.editor_key);

    if (!validarClaveEditor_(editorKey)) {
      return resp({
        error: 'Clave privada del editor incorrecta',
        codigo: 'EDITOR_KEY_INVALIDA'
      });
    }

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