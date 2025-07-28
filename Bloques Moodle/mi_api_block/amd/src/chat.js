/* eslint-disable no-trailing-spaces */
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

    // Función para llamar a la API del backend local
    function llamarAPITutor(instruccion, entrada, maxTokens) {
        return new Promise(function(resolve, reject) {
            $.ajax({
                url: API_tutor,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    instruccion: instruccion,
                    entrada: entrada,
                    max_nuevos_tokens: maxTokens || 1000
                }),
                success: function(response) {
                    if (response.respuesta) {
                        resolve({ respuesta: response.respuesta });
                    } else {
                        reject(new Error('Respuesta inválida de la API'));
                    }
                },
                error: function(xhr, status, error) {
                    reject(new Error(error));
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

            // Loader visual para el tutor
            function showTutorLoader() {
                var loader = $('<div class="chat-bubble tutor-bubble tutor-loader"></div>').html('<span><em>El tutor está escribiendo...</em></span>');
                messagesDiv.append(loader);
                scrollToBottom();
            }
            function removeTutorLoader() {
                messagesDiv.find('.tutor-loader').remove();
            }

            // Animación de "escritura" para el tutor
            function animateTutorMessage(htmlMsg) {
                removeTutorLoader();
                var bubble = $('<div class="chat-bubble tutor-bubble"></div>');
                bubble.append('<span></span>');
                messagesDiv.append(bubble);
                scrollToBottom();
                // Mejorar saltos de línea para mensajes largos
                var safeHtml = htmlMsg
                    // Negritas
                    .replace(/\*\*([^*]+)\*\*/g, function(match, p1) { return '<b>' + p1.replace(/\n/g, '<br>') + '</b>'; })
                    // Código
                    .replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, function(match, lang, code) {
                        return '<pre><code>' + $('<div>').text(code).html().replace(/\n/g, '<br>') + '</code></pre>';
                    })
                    .replace(/\n{2,}/g, '<br><br>')
                    .replace(/\n/g, '<br>')
                    .replace(/<(?!br\s*\/?>|b>|\/b>|strong>|\/strong>|i>|\/i>|pre>|\/pre>|code>|\/code>)[^>]+>/gi, '');
                var i = 0;
                function typeChar() {
                    if (i <= safeHtml.length) {
                        bubble.find('span').html(safeHtml.slice(0, i));
                        scrollToBottom();
                        i++;
                        setTimeout(typeChar, 12);
                    } else {
                        bubble.find('span').html(safeHtml);
                        addCodeActions(bubble);
                        bubble.find('pre code').each(function() {
                            var codeHtml = $(this).html();
                            var formattedCode = codeHtml.replace(/<br\s*\/?>/gi, '\n');
                            $(this).text(formattedCode);
                        });
                        scrollToBottom();
                    }
                }
                typeChar();
            }

            // Función para agregar botones de acción a los bloques de código
            function addCodeActions(container) {
                container.find('pre').each(function() {
                    var $pre = $(this);
                    var codeText = $pre.find('code').text() || $pre.text();
                    var codeHtml = $pre.find('code').html() || $pre.html();
                    var $actions = $('<div class="code-actions"></div>');
                    // Botón de copiar
                    var $copyBtn = $('<button class="code-action-btn copy-btn" title="Copiar código">📋</button>');
                    $copyBtn.on('click', function(e) {
                        e.stopPropagation();
                        copyToClipboard(codeText, codeHtml);
                        showCopyNotification();
                    });
                    // Botón de expandir
                    var $expandBtn = $('<button class="code-action-btn expand-btn" title="Ver en ventana ampliada">🔍</button>');
                    $expandBtn.on('click', function(e) {
                        e.stopPropagation();
                        showCodeModal(codeText);
                    });
                    $actions.append($copyBtn).append($expandBtn);
                    $pre.css('position', 'relative').append($actions);
                });
            }

            // Función para copiar texto al portapapeles
            function copyToClipboard(text, htmlSource) {
                // Si se pasa htmlSource, convertir <br> y etiquetas a saltos de línea
                if (htmlSource) {
                    // Quitar etiquetas y convertir <br> a saltos de línea
                    text = htmlSource
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<pre>|<code>|<\/pre>|<\/code>/gi, '')
                        .replace(/&nbsp;/gi, ' ')
                        .replace(/&lt;/gi, '<')
                        .replace(/&gt;/gi, '>')
                        .replace(/&amp;/gi, '&');
                }
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).catch(function() {
                        fallbackCopyToClipboard(text);
                    });
                } else {
                    fallbackCopyToClipboard(text);
                }
            }

            // Función de respaldo para copiar texto
            function fallbackCopyToClipboard(text) {
                var textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                } catch (err) {
                    console.error('Error al copiar texto: ', err);
                }
                document.body.removeChild(textArea);
            }

            // Función para mostrar notificación de copiado
            function showCopyNotification() {
                var $notification = $('<div class="copy-notification">Código copiado al portapapeles</div>');
                $('body').append($notification);
                
                setTimeout(function() {
                    $notification.addClass('show');
                }, 10);
                
                setTimeout(function() {
                    $notification.removeClass('show');
                    setTimeout(function() {
                        $notification.remove();
                    }, 300);
                }, 2000);
            }

            // Función para mostrar el modal con el código expandido
            function showCodeModal(codeText) {
                var $modal = $('#code-modal');
                if ($modal.length === 0) {
                    $modal = $('<div id="code-modal" class="code-modal">' +
                        '<div class="code-modal-content">' +
                            '<div class="code-modal-header">' +
                                '<h3>Código</h3>' +
                                '<span class="code-modal-close">&times;</span>' +
                            '</div>' +
                            '<div class="code-modal-body">' +
                                '<pre><code></code></pre>' +
                            '</div>' +
                        '</div>' +
                    '</div>');
                    $('body').append($modal);
                    $modal.find('.code-modal-close').on('click', function() {
                        $modal.hide();
                    });
                    $modal.on('click', function(e) {
                        if (e.target === this) {
                            $modal.hide();
                        }
                    });
                    $(document).on('keydown', function(e) {
                        if (e.key === 'Escape' && $modal.is(':visible')) {
                            $modal.hide();
                        }
                    });
                }
                // Mostrar el código con saltos de línea reales y sin etiquetas HTML
                var formattedCode = codeText.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
                $modal.find('code').text(formattedCode);
                $modal.show();
            }

            function showTutor(msg) {
                animateTutorMessage(msg);
            }

            // Mostrar mensaje de bienvenida al iniciar el bloque
            var mensajeBienvenida = '¡Bienvenido al chat de tutoría! Si tienes dudas sobre Análisis y Diseño de Software, tu progreso en el curso, o necesitas recomendaciones, no dudes en preguntar. Estoy aquí para ayudarte.';
            showTutor(mensajeBienvenida);

            /**
             * Registra al usuario en la API si no existe.
             */
            function registrarUsuario() {
                $.ajax({
                    url: `${API_BD_TUTOR_BASE}users/${userid}`,
                    method: 'GET',
                    dataType: 'json',
                    success: function() {
                        // Usuario encontrado, no se hace nada
                        localStorage.setItem('user_registered_' + userid, 'true');
                    },
                    error: function(xhr) {
                        if (xhr.status === 404) {
                            // Usuario no encontrado, se procede a registrar
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
                                    success: function() {
                                        localStorage.setItem('user_registered_' + userid, 'true');
                                    },
                                    error: function() {
                                        // Error al registrar usuario
                                    }
                                });
                            }).catch(function() {
                                // Error al obtener contexto del estudiante
                            });
                        } else {
                            // Error al verificar usuario
                        }
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
                showTutorLoader();
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
                            removeTutorLoader();
                            showTutor('No hay actividades con notas mayores a 0 para analizar.');
                            return;
                        }
                        var instruccionNotas = "Actúa como un tutor virtual especializado en la enseñanza de Análisis y Diseño de Software. Tu tarea es analizar las calificaciones de un estudiante y generar recomendaciones personalizadas para mejorar su rendimiento en cada actividad. Recibirás una lista de calificaciones en el formato: [{\"userid\": number, \"name\": string, \"grade\": number, \"actividad\": string}, ...]. Para cada actividad, evalúa la nota (que está en una escala de 0 a 10) y genera una recomendación específica basada en el rendimiento del estudiante. Si la nota es menor a 5, sugiere acciones para mejorar (por ejemplo, revisar conceptos específicos, practicar más ejercicios, o buscar ayuda adicional). Si la nota está entre 5 y 7, sugiere formas de consolidar el aprendizaje (por ejemplo, profundizar en temas específicos o aplicar conceptos en proyectos prácticos). Si la nota es mayor a 7, felicita al estudiante y sugiere cómo puede seguir avanzando (por ejemplo, explorar temas más avanzados o liderar proyectos). Devuelve las recomendaciones en formato JSON con la siguiente estructura: {\"recomendaciones\": [{\"userid\": number, \"name\": string, \"grade\": number, \"actividad\": string, \"recomendacion\": string}, ...]}. Responde en español.";
                        llamarAPITutor(instruccionNotas, JSON.stringify(notas), 5000)
                            .then(function(response) {
                                removeTutorLoader();
                                if (response.respuesta) {
                                    var cleanedResponse = response.respuesta;
                                    var jsonMatch = cleanedResponse.match(/{[\s\S]*}/);
                                    var textoExplicativo = cleanedResponse;
                                    if (jsonMatch) {
                                        textoExplicativo = cleanedResponse.substring(0, jsonMatch.index).trim();
                                        cleanedResponse = jsonMatch[0];
                                    }
                                    try {
                                        var recomendaciones = JSON.parse(cleanedResponse);
                                        if (recomendaciones.recomendaciones && recomendaciones.recomendaciones.length > 0) {
                                            var studentName = recomendaciones.recomendaciones[0].name;
                                            var mensaje = `<div style='margin-bottom:8px;'><strong>Hola ${studentName}, he analizado tus calificaciones. Aquí tienes algunas recomendaciones para mejorar:</strong></div>`;
                                            if (textoExplicativo) {
                                                mensaje += `<div style='color:#555;margin-bottom:8px;'>${textoExplicativo.replace(/\n/g, '<br>')}</div>`;
                                            }
                                            mensaje += '<ul style="margin-left:18px;">';
                                            recomendaciones.recomendaciones.forEach(rec => {
                                                mensaje += `<li><strong>${rec.actividad}</strong> (Nota: ${rec.grade}):<br><span style='color:#007bff;'>${rec.recomendacion}</span></li>`;
                                            });
                                            mensaje += '</ul>';
                                            showTutor(mensaje);
                                        } else {
                                            showTutor('No se han obtenido recomendaciones para mostrar.');
                                        }
                                    } catch (parseError) {
                                        showTutor('Error al parsear las recomendaciones: ' + parseError.message);
                                    }
                                } else {
                                    showTutor('Error: Respuesta inválida de la API.');
                                }
                            })
                            .catch(function(error) {
                                removeTutorLoader();
                                showTutor('Error al obtener recomendaciones: ' + error.message);
                            });
                    },
                    error: function(xhr, status, error) {
                        removeTutorLoader();
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
            var cooldownEscaneo = false;
            var cooldownTimeEscaneo = 10000; // 10 segundos
            
            if (btnIniciarEscaneo.length) {
                btnIniciarEscaneo.on('click', function() {
                    if (cooldownEscaneo) {
                        showTutor('Espera un momento antes de solicitar el análisis de desempeño nuevamente.');
                        return;
                    }
                    
                    cooldownEscaneo = true;
                    btnIniciarEscaneo.prop('disabled', true);
                    btnIniciarEscaneo.text('Analizando...');
                    
                    // Refresca el contexto en sessionStorage
                    obtenerContextoEstudiante(userid, courseid, true).then(function() {
                        verificarIntentosCuestionario(obtenerRecomendaciones);
                    }).catch(function() {
                        // Error al refrescar el contexto del estudiante
                        showTutor('Error al obtener el contexto del estudiante para el análisis.');
                    }).finally(function() {
                        // Restaurar el botón después del cooldown
                        setTimeout(function() {
                            cooldownEscaneo = false;
                            btnIniciarEscaneo.prop('disabled', false);
                            btnIniciarEscaneo.text('Ver desempeño');
                        }, cooldownTimeEscaneo);
                    });
                });
            } else {
                // Botón de escaneo no encontrado
            }

            // Manejo del formulario de chat
            if (form.length) {
                // Enviar mensaje con Enter, salto de línea con Shift+Enter
                chatInput.on('keydown', function(e) {
                    if (e.key === 'Enter') {
                        if (!e.shiftKey) {
                            e.preventDefault();
                            form.trigger('submit');
                        }
                        // Si es Shift+Enter, permite salto de línea (comportamiento por defecto)
                    }
                });

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
                        var bubble = $('<div class="chat-bubble tutor-bubble"></div>').html('<span>¡Hola! Por favor, realiza preguntas relacionadas con Análisis y Diseño de Software o sobre tu progreso en el curso para que pueda ayudarte mejor.</span>');
                        messagesDiv.append(bubble);
                        scrollToBottom();
                        chatInput.val('');
                        return;
                    }
                    showUser(message);
                    chatInput.val('');
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
                    showTutorLoader();
                    obtenerContextoEstudiante(userid, courseid).then(function(notas) {
                        var instruccion = "Actúa como un profesor especializado en Análisis y Diseño de Software. Responde todas las preguntas relacionadas con el tema de forma clara, detallada y estructurada, utilizando ejemplos prácticos y profundizando en las teorías, principios y metodologías que conforman el área. Además, si la pregunta está relacionada con el estudiante, sus calificaciones o su progreso, utiliza el siguiente contexto del estudiante para personalizar tu respuesta. Si el mensaje no está relacionado con Análisis y Diseño de Software o el curso, responde que solo puedes ayudar en esos temas. Responde en español de manera técnica, pero accesible para estudiantes. CONTEXTO_ESTUDIANTE: " + JSON.stringify(notas);
                        llamarAPITutor(instruccion, message, 1000)
                            .then(function(response) {
                                var tutorResponse = response.respuesta;
                                showTutor(tutorResponse);
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
                            })
                            .catch(function(error) {
                                showTutor('Error al conectar con la API: ' + error.message);
                            });
                    }).catch(function() {
                        showTutor('Error al obtener el contexto del estudiante.');
                    });
                });
            } else {
                // Formulario no encontrado
            }
        }
    };
});