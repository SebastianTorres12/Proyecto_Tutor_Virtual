/* eslint-disable camelcase */
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable promise/always-return */
/* eslint-disable promise/no-nesting */
/* eslint-disable jsdoc/require-param */
/* eslint-disable max-len */
/* eslint-disable no-console */
define(['jquery'], function($) {
    // Definición de variables generales para las APIs
    const API_tutor = 'http://localhost:8000/generar';
    const API_BD_TUTOR_BASE = 'http://localhost:8080/api/';
    const API_Moodle = 'http://localhost/webservice/rest/server.php';

    /**
     * Detecta si el texto es un saludo o mensaje irrelevante.
     * @param {string} texto
     * @returns {boolean}
     */
    function esSaludoOMensajeIrrelevante(texto) {
        const saludos = [
            'hola', 'buenos dias', 'buenas tardes', 'buenas noches',
            'hello', 'hi', 'saludos', 'que tal', 'cómo estás', 'como estas'
        ];
        const textoLimpio = texto.trim().toLowerCase();
        return saludos.some(saludo => textoLimpio === saludo || textoLimpio.startsWith(saludo));
    }

    /**
     * Obtiene el contexto del estudiante (notas y actividades) y lo guarda en sessionStorage.
     * Si forceRefresh=true, fuerza la actualización desde la API.
     * @param {number} userid
     * @param {number} courseid
     * @param {boolean} [forceRefresh]
     * @returns {Promise<Array>}
     */
    function obtenerContextoEstudiante(userid, courseid, forceRefresh) {
        return new Promise(function(resolve) {
            var contextoKey = 'contexto_estudiante_' + userid + '_' + courseid;
            if (!forceRefresh) {
                var contextoGuardado = sessionStorage.getItem(contextoKey);
                if (contextoGuardado) {
                    try {
                        var notas = JSON.parse(contextoGuardado);
                        resolve(notas);
                        return;
                    } catch (e) {
                        // Si hay error al parsear, continúa para obtenerlo de la API
                    }
                }
            }
            var params = {
                wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                wsfunction: 'gradereport_user_get_grade_items',
                moodlewsrestformat: 'json',
                courseid: courseid,
                userid: userid
            };
            $.ajax({
                url: `${API_Moodle}?${$.param(params)}`,
                method: 'GET',
                dataType: 'json',
                success: function(data) {
                    var notas = [];
                    if (data.usergrades) {
                        data.usergrades.forEach(user => {
                            user.gradeitems.forEach(item => {
                                if (item.itemname) {
                                    var grade = item.graderaw !== null ? item.graderaw : 0;
                                    notas.push({
                                        userid: user.userid,
                                        name: user.userfullname,
                                        grade: grade,
                                        actividad: item.itemname
                                    });
                                }
                            });
                        });
                    }
                    sessionStorage.setItem(contextoKey, JSON.stringify(notas));
                    resolve(notas);
                },
                error: function() {
                    resolve([]);
                }
            });
        });
    }

    return {
        init: function(userid, courseid, role) {
            var messagesDiv = $('#chat-messages');
            var form = $('#chat-form');
            var chatInput = $('#chat-input');
            var submitButton = form.find('button[type="submit"]');
            var isChatBlocked = false;

            function scrollToBottom() {
                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
            }

            function showUser(msg) {
                var bubble = $('<div class="chat-bubble user-bubble"></div>').html('<span>' + $('<div>').text(msg).html() + '</span>');
                messagesDiv.append(bubble);
                scrollToBottom();
            }

            // Animación de "escritura" para el tutor
            function animateTutorMessage(htmlMsg) {
                var bubble = $('<div class="chat-bubble tutor-bubble"></div>');
                bubble.append('<span></span>');
                messagesDiv.append(bubble);
                scrollToBottom();
                // Permitir etiquetas seguras: <br>, <b>, <i>, <pre>, <code>
                var safeHtml = htmlMsg
                    .replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, function(match, lang, code) {
                        return '<pre><code>' + $('<div>').text(code).html() + '</code></pre>';
                    })
                    .replace(/\n/g, '<br>')
                    .replace(/<(?!br\s*\/?>|b>|\/b>|i>|\/i>|pre>|\/pre>|code>|\/code>)[^>]+>/gi, '');
                var i = 0;
                function typeChar() {
                    if (i <= safeHtml.length) {
                        bubble.find('span').html(safeHtml.slice(0, i));
                        scrollToBottom();
                        i++;
                        setTimeout(typeChar, 12);
                    } else {
                        bubble.find('span').html(safeHtml);
                        scrollToBottom();
                    }
                }
                typeChar();
            }

            function showTutor(msg) {
                animateTutorMessage(msg);
            }

            /**
             * Registra al usuario en la API si no existe.
             */
            function registrarUsuario() {
                messagesDiv.append('<p><strong>Registrando usuario...</strong></p>');
                scrollToBottom();
                $.ajax({
                    url: `${API_BD_TUTOR_BASE}users/${userid}`,
                    method: 'GET',
                    dataType: 'json',
                    success: function(response) {
                        messagesDiv.append('<p><strong>Usuario ya registrado en la plataforma.</strong></p>');
                        scrollToBottom();
                        $.ajax({
                            url: `${API_BD_TUTOR_BASE}users/${userid}`,
                            method: 'GET',
                            dataType: 'json',
                            success: function(response) {
                                $.ajax({
                                    url: `${API_BD_TUTOR_BASE}users/register`,
                                    method: 'POST',
                                    data: JSON.stringify({
                                        user_id: userid,
                                        username: 'user_' + userid,
                                        role: role,
                                        userfullname: userfullname
                                    }),
                                    contentType: 'application/json',
                                    success: function(response) {
                                    },
                                    error: function(xhr, status, error) {
                                    }
                                });
                            },
                            error: function(xhr) {
                                if (xhr.status === 404) {
                                    messagesDiv.append('<p><strong>Registrando nuevo usuario...</strong></p>');
                                    scrollToBottom();
                                    // Obtener nombre completo
                                    obtenerContextoEstudiante(userid, courseid, true).then(function(notas) {
                                        var userfullname = 'Usuario Desconocido';
                                        if (notas && notas.length > 0 && notas[0].name) {
                                            userfullname = notas[0].name;
                                        }
                                        $.ajax({
                                            url: `${API_BD_TUTOR_BASE}users/register`,
                                            method: 'POST',
                                            data: JSON.stringify({
                                                user_id: userid,
                                                username: 'user_' + userid,
                                                role: role,
                                                userfullname: userfullname
                                            }),
                                            contentType: 'application/json',
                                            success: function(response) {
                                                messagesDiv.append('<p><strong>Usuario registrado exitosamente.</strong></p>');
                                                scrollToBottom();
                                            },
                                            error: function(xhr, status, error) {
                                                messagesDiv.append('<p><strong>Error al registrar usuario.</strong></p>');
                                                scrollToBottom();
                                            }
                                        });
                                    }).catch(function(error) {
                                        messagesDiv.append('<p><strong>Error al obtener información del usuario.</strong></p>');
                                        scrollToBottom();
                                    });
                                } else {
                                    messagesDiv.append('<p><strong>Error al verificar usuario.</strong></p>');
                                    scrollToBottom();
                                }
                            }
                        });
                    }
                });
            }

            /**
             * Verifica si hay un intento de cuestionario en curso y bloquea el chat si es necesario.
             */
            function verificarIntentosCuestionario(callback) {
                var params = {
                    wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                    wsfunction: 'gradereport_user_get_grade_items',
                    moodlewsrestformat: 'json',
                    courseid: courseid,
                    userid: userid
                };
                $.ajax({
                    url: `${API_Moodle}?${$.param(params)}`,
                    method: 'GET',
                    dataType: 'json',
                    success: function(data) {
                        var actividades = [];
                        if (data.usergrades) {
                            data.usergrades.forEach(user => {
                                user.gradeitems.forEach(item => {
                                    if (item.itemname && item.cmid) {
                                        actividades.push({
                                            cmid: item.cmid,
                                            name: item.itemname
                                        });
                                    }
                                });
                            });
                        }
                        if (actividades.length === 0) {
                            if (callback) {
                                callback();
                            }
                            return;
                        }
                        var quizzes = [];
                        var promises = actividades.map(actividad => {
                            var paramsContext = {
                                wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                                wsfunction: 'core_course_get_course_module',
                                moodlewsrestformat: 'json',
                                cmid: actividad.cmid
                            };
                            return $.ajax({
                                url: `${API_Moodle}?${$.param(paramsContext)}`,
                                method: 'GET',
                                dataType: 'json',
                                success: function(contextData) {
                                    if (contextData.cm && contextData.cm.modname === 'quiz') {
                                        quizzes.push({
                                            quizid: contextData.cm.instance,
                                            name: actividad.name
                                        });
                                    }
                                }
                            });
                        });
                        Promise.all(promises).then(() => {
                            if (quizzes.length === 0) {
                                if (callback) {
                                    setTimeout(callback, 0);
                                }
                                return;
                            }
                            var attemptPromises = quizzes.map(quiz => {
                                var paramsAttempts = {
                                    wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                                    wsfunction: 'mod_quiz_get_user_attempts',
                                    moodlewsrestformat: 'json',
                                    quizid: quiz.quizid,
                                    userid: userid,
                                    status: 'all',
                                    includepreviews: 0
                                };
                                return $.ajax({
                                    url: `${API_Moodle}?${$.param(paramsAttempts)}`,
                                    method: 'GET',
                                    dataType: 'json',
                                    success: function(attemptData) {
                                        if (attemptData.attempts && attemptData.attempts.length > 0) {
                                            var inProgressAttempt = attemptData.attempts.find(attempt => attempt.state === 'inprogress');
                                            if (inProgressAttempt) {
                                                isChatBlocked = true;
                                                showTutor('No puedes enviar mensajes mientras estás realizando un cuestionario en curso.');
                                                chatInput.prop('disabled', true);
                                                submitButton.prop('disabled', true);
                                            }
                                        }
                                    }
                                });
                            });
                            Promise.all(attemptPromises).then(() => {
                                if (!isChatBlocked) {
                                    if (callback) {
                                        setTimeout(callback, 0);
                                    }
                                }
                            }).catch(() => {
                                showTutor('Error al verificar intentos de cuestionarios.');
                                if (callback) {
                                    setTimeout(callback, 0);
                                }
                            });
                        }).catch(() => {
                            showTutor('Error al verificar actividades.');
                            if (callback) {
                                setTimeout(callback, 0);
                            }
                        });
                    },
                    error: function(xhr, status, error) {
                        showTutor('Error al obtener actividades: ' + error + ' (Código: ' + xhr.status + ')');
                        if (callback) {
                            callback();
                        }
                    }
                });
            }

            /**
             * Obtiene las calificaciones y genera recomendaciones.
             */
            function obtenerRecomendaciones() {
                var params = {
                    wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                    wsfunction: 'gradereport_user_get_grade_items',
                    moodlewsrestformat: 'json',
                    courseid: courseid,
                    userid: userid
                };
                $.ajax({
                    url: `${API_Moodle}?${$.param(params)}`,
                    method: 'GET',
                    dataType: 'json',
                    success: function(data) {
                        var notas = [];
                        if (data.usergrades) {
                            data.usergrades.forEach(user => {
                                user.gradeitems.forEach(item => {
                                    if (item.itemname) {
                                        var grade = item.graderaw !== null ? item.graderaw : 0;
                                        if (grade > 0) {
                                            notas.push({
                                                userid: user.userid,
                                                name: user.userfullname,
                                                grade: grade,
                                                actividad: item.itemname
                                            });
                                        }
                                    }
                                });
                            });
                        }
                        if (notas.length === 0) {
                            showTutor('No hay actividades con notas mayores a 0 para analizar.');
                            return;
                        }
                        var instruccionNotas = "Actúa como un tutor virtual especializado en Responsabilidad Social Empresarial. Tu tarea es analizar las calificaciones de un estudiante y generar recomendaciones personalizadas para mejorar su rendimiento en cada actividad. Recibirás una lista de calificaciones en el formato: [{\"userid\": number, \"name\": string, \"grade\": number, \"actividad\": string}, ...]. Para cada actividad, evalúa la nota (que está en una escala de 0 a 10) y genera una recomendación específica basada en el rendimiento del estudiante. Si la nota es menor a 5, sugiere acciones para mejorar (por ejemplo, revisar conceptos específicos, practicar más ejercicios, o buscar ayuda adicional). Si la nota está entre 5 y 7, sugiere formas de consolidar el aprendizaje (por ejemplo, profundizar en temas específicos o aplicar conceptos en proyectos prácticos). Si la nota es mayor a 7, felicita al estudiante y sugiere cómo puede seguir avanzando (por ejemplo, explorar temas más avanzados o liderar proyectos). Devuelve las recomendaciones en formato JSON con la siguiente estructura: {\"recomendaciones\": [{\"userid\": number, \"name\": string, \"nota\": number, \"actividad\": string, \"recomendacion\": string}, ...]}. Responde en español.";
                        $.ajax({
                            url: API_tutor,
                            method: 'POST',
                            data: JSON.stringify({
                                instruccion: instruccionNotas,
                                entrada: JSON.stringify(notas),
                                max_nuevos_tokens: 5000
                            }),
                            contentType: 'application/json',
                            success: function(response) {
                                if (response.respuesta) {
                                    var cleanedResponse = response.respuesta
                                        .replace(/```json\n/, '')
                                        .replace(/\n```/, '')
                                        .trim();
                                    try {
                                        var recomendaciones = JSON.parse(cleanedResponse);
                                        if (recomendaciones.recomendaciones && recomendaciones.recomendaciones.length > 0) {
                                            var studentName = recomendaciones.recomendaciones[0].name;
                                            var mensaje = `Hola ${studentName}, he analizado tus calificaciones. Aquí tienes algunas recomendaciones para mejorar:<br>`;
                                            recomendaciones.recomendaciones.forEach(rec => {
                                                mensaje += `- En ${rec.actividad}, obtuviste ${rec.nota}: ${rec.recomendacion}<br>`;
                                            });
                                            showTutor(mensaje);
                                        } else {
                                            showTutor('Error: No se encontraron recomendaciones en la respuesta.');
                                        }
                                    } catch (parseError) {
                                        showTutor('Error al parsear las recomendaciones: ' + parseError.message);
                                    }
                                } else {
                                    showTutor('Error: Respuesta inválida de la API.');
                                }
                            },
                            error: function(xhr, status, error) {
                                showTutor('Error al obtener recomendaciones: ' + error);
                            }
                        });
                    },
                    error: function(xhr, status, error) {
                        showTutor('Error al obtener calificaciones: ' + error + ' (Código: ' + xhr.status + ')');
                    }
                });
            }

            // Registrar usuario al cargar el bloque
            registrarUsuario();

            // Verificar intentos de cuestionarios en curso al cargar el bloque
            verificarIntentosCuestionario();

            // Configurar el botón de escaneo para refrescar contexto y recomendaciones
            var btnIniciarEscaneo = $('#btn-iniciar-escaneo');
            if (btnIniciarEscaneo.length) {
                btnIniciarEscaneo.on('click', function() {
                    messagesDiv.append('<p><strong>Actualizando contexto del estudiante...</strong></p>');
                    scrollToBottom();
                    // Refresca el contexto en sessionStorage
                    obtenerContextoEstudiante(userid, courseid, true).then(function() {
                        verificarIntentosCuestionario(obtenerRecomendaciones);
                    }).catch(function(error) {
                    });
                });
            } else {
                messagesDiv.append('<p><strong>Botón de escaneo no encontrado.</strong></p>');
                scrollToBottom();
            }

            // Manejo del formulario de chat
            if (form.length) {
                form.on('submit', function(e) {
                    e.preventDefault();
                    if (isChatBlocked) {
                        showTutor('No puedes enviar mensajes mientras estás realizando un cuestionario en curso.');
                        return;
                    }
                    var message = chatInput.val();
                    if (message.trim() === '') {
                        return;
                    }
                    if (esSaludoOMensajeIrrelevante(message)) {
                        // Mensaje del bot, no del tutor, así que burbuja tipo tutor
                        var bubble = $('<div class="chat-bubble tutor-bubble"></div>').html('<span>¡Hola! Por favor, realiza preguntas relacionadas con Responsabilidad Social Empresarial o sobre tu progreso en el curso para que pueda ayudarte mejor.</span>');
                        messagesDiv.append(bubble);
                        scrollToBottom();
                        chatInput.val('');
                        return;
                    }
                    showUser(message);
                    chatInput.val('');
                    // Guardar el mensaje del usuario en la API
                    $.ajax({
                        url: `${API_BD_TUTOR_BASE}messages/save`,
                        method: 'POST',
                        data: JSON.stringify({
                            user_id: userid,
                            message_type: 'input',
                            message_text: message
                        }),
                        contentType: 'application/json'
                    });
                    obtenerContextoEstudiante(userid, courseid).then(function(notas) {
                        var instruccion = "Actúa como un profesor especializado en Responsabilidad Social Empresarial. Responde todas las preguntas relacionadas con el tema de forma clara, detallada y estructurada, utilizando ejemplos prácticos y profundizando en las teorías, principios y metodologías que conforman el área. Además, si la pregunta está relacionada con el estudiante, sus calificaciones o su progreso, utiliza el siguiente contexto del estudiante para personalizar tu respuesta. Si el mensaje no está relacionado con Responsabilidad Social Empresarial o el curso, responde que solo puedes ayudar en esos temas. Responde en español de manera técnica, pero accesible para estudiantes. CONTEXTO_ESTUDIANTE: " + JSON.stringify(notas);
                        $.ajax({
                            url: API_tutor,
                            method: 'POST',
                            data: JSON.stringify({
                                instruccion: instruccion,
                                entrada: message,
                                max_nuevos_tokens: 1000
                            }),
                            contentType: 'application/json',
                            success: function(response) {
                                var tutorResponse = response.respuesta;
                                showTutor(tutorResponse);
                                // Guardar la respuesta del tutor en la API
                                $.ajax({
                                    url: `${API_BD_TUTOR_BASE}messages/save`,
                                    method: 'POST',
                                    data: JSON.stringify({
                                        user_id: userid,
                                        message_type: 'output',
                                        message_text: tutorResponse
                                    }),
                                    contentType: 'application/json'
                                });
                            },
                            error: function(xhr, status, error) {
                                showTutor('Error al conectar con la API: ' + error);
                            }
                        });
                    }).catch(function(error) {
                        showTutor('Error al obtener el contexto del estudiante: ' + error);
                    });
                });
            } else {
                messagesDiv.append('<p><strong>Formulario de chat no encontrado.</strong></p>');
                scrollToBottom();
            }
        }
    };
});