/* eslint-disable promise/always-return */
/* eslint-disable promise/no-nesting */
/* eslint-disable no-trailing-spaces */
/* eslint-disable jsdoc/require-param */
/* eslint-disable max-len */
/* eslint-disable no-console */
define(['jquery'], function($) {
    // Definición de variables generales para las APIs
    const API_tutor = 'http://localhost:8000/generar'; // API para generar respuestas del tutor
    const API_BD_TUTOR_BASE = 'http://localhost:8080/api/'; // Base URL para la API de base de datos (se añaden endpoints específicos)
    const API_Moodle = 'http://localhost/webservice/rest/server.php'; // API de Moodle para servicios web

    return {
        init: function(userid, courseid, role) {
            var messagesDiv = $('#chat-messages');
            var form = $('#chat-form');
            var chatInput = $('#chat-input');
            var submitButton = form.find('button[type="submit"]');

            // Variable para controlar si el chat está bloqueado
            var isChatBlocked = false;

            /**
             * Registra al usuario en la API al cargar el bloque, solo si no ha sido registrado previamente
             */
            function registrarUsuario() {
                // Verificar si el usuario ya está registrado en la base de datos
                messagesDiv.append('<p><strong>Debug:</strong> Verificando si el usuario ya está registrado...</p>');
                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                $.ajax({
                    url: `${API_BD_TUTOR_BASE}users/${userid}`, // Usar variable para endpoint GET de usuarios
                    method: 'GET',
                    dataType: 'json',
                    success: function(response) {
                        console.log('Usuario encontrado en la API:', response);
                        messagesDiv.append('<p><strong>Debug:</strong> Usuario ya registrado en la API: ' + response.username + '</p>');
                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                        // Marcar al usuario como registrado en localStorage
                        var userRegisteredKey = 'user_registered_' + userid;
                        localStorage.setItem(userRegisteredKey, 'true');
                    },
                    error: function(xhr, status, error) {
                        // Si el usuario no existe (404), procedemos a registrarlo
                        if (xhr.status === 404) {
                            messagesDiv.append('<p><strong>Debug:</strong> Usuario no encontrado. Procediendo a registrar...</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                            // Construir la URL para gradereport_user_get_grade_items usando API_Moodle
                            var params = {
                                wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                                wsfunction: 'gradereport_user_get_grade_items',
                                moodlewsrestformat: 'json',
                                courseid: courseid,
                                userid: userid
                            };

                            var queryString = $.param(params);
                            var fullUrl = `${API_Moodle}?${queryString}`;

                            console.log('URL generada para gradereport_user_get_grade_items (registro):', fullUrl);

                            messagesDiv.append('<p><strong>Debug:</strong> Obteniendo nombre completo del usuario...</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                            $.ajax({
                                url: fullUrl,
                                method: 'GET',
                                dataType: 'json',
                                success: function(data) {
                                    console.log('Respuesta de gradereport_user_get_grade_items (registro):', data);

                                    var userfullname = 'Usuario Desconocido'; // Valor por defecto
                                    if (data.usergrades && data.usergrades.length > 0) {
                                        userfullname = data.usergrades[0].userfullname || userfullname;
                                    }

                                    messagesDiv.append('<p><strong>Debug:</strong> Nombre completo del usuario: ' + userfullname + '</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                                    messagesDiv.append('<p><strong>Debug:</strong> Rol del usuario: ' + role + '</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                                    // Registrar al usuario en la API, incluyendo el userfullname
                                    $.ajax({
                                        url: `${API_BD_TUTOR_BASE}users/register`, // Usar variable para endpoint POST de registro
                                        method: 'POST',
                                        data: JSON.stringify({
                                            user_id: userid,
                                            username: 'user_' + userid,
                                            role: role,
                                            userfullname: userfullname
                                        }),
                                        contentType: 'application/json',
                                        success: function(response) {
                                            console.log('Usuario registrado en la API:', response);
                                            messagesDiv.append('<p><strong>Debug:</strong> Usuario registrado en la API.</p>');
                                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                                            // Marcar al usuario como registrado en localStorage
                                            var userRegisteredKey = 'user_registered_' + userid;
                                            localStorage.setItem(userRegisteredKey, 'true');
                                        },
                                        error: function(xhr, status, error) {
                                            console.log('Error al registrar usuario:', { xhr, status, error });
                                            messagesDiv.append('<p><strong>Debug:</strong> Error al registrar usuario: ' + error + '</p>');
                                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                        }
                                    });
                                },
                                error: function(xhr, status, error) {
                                    console.log('Error al obtener nombre completo del usuario:', { xhr, status, error });
                                    messagesDiv.append('<p><strong>Debug:</strong> Error al obtener nombre completo del usuario: ' + error + '</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                                    // Registrar al usuario con un userfullname por defecto en caso de error
                                    $.ajax({
                                        url: `${API_BD_TUTOR_BASE}users/register`, // Usar variable para endpoint POST de registro
                                        method: 'POST',
                                        data: JSON.stringify({
                                            user_id: userid,
                                            username: 'user_' + userid,
                                            role: role,
                                            userfullname: 'Usuario Desconocido'
                                        }),
                                        contentType: 'application/json',
                                        success: function(response) {
                                            console.log('Usuario registrado en la API (userfullname por defecto):', response);
                                            messagesDiv.append('<p><strong>Debug:</strong> Usuario registrado en la API (userfullname por defecto).</p>');
                                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                                            // Marcar al usuario como registrado en localStorage
                                            var userRegisteredKey = 'user_registered_' + userid;
                                            localStorage.setItem(userRegisteredKey, 'true');
                                        },
                                        error: function(xhr, status, error) {
                                            console.log('Error al registrar usuario (userfullname por defecto):', { xhr, status, error });
                                            messagesDiv.append('<p><strong>Debug:</strong> Error al registrar usuario (userfullname por defecto): ' + error + '</p>');
                                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                        }
                                    });
                                }
                            });
                        } else {
                            // Otros errores al consultar el usuario
                            console.log('Error al verificar usuario:', { xhr, status, error });
                            messagesDiv.append('<p><strong>Debug:</strong> Error al verificar usuario: ' + error + '</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                        }
                    }
                });
            }

            /**
             * Verifica si hay un intento de cuestionario en curso y bloquea el chat si es necesario.
             * Si no hay intentos en curso, permite ejecutar un callback (como obtenerRecomendaciones).
             */
            function verificarIntentosCuestionario(callback) {
                // Construir la URL para gradereport_user_get_grade_items usando API_Moodle
                var params = {
                    wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                    wsfunction: 'gradereport_user_get_grade_items',
                    moodlewsrestformat: 'json',
                    courseid: courseid,
                    userid: userid
                };

                var queryString = $.param(params);
                var fullUrl = `${API_Moodle}?${queryString}`;

                console.log('URL generada para gradereport_user_get_grade_items:', fullUrl);

                messagesDiv.append('<p><strong>Debug:</strong> Verificando intentos de cuestionarios...</p>');
                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                // Obtener las actividades del curso
                $.ajax({
                    url: fullUrl,
                    method: 'GET',
                    dataType: 'json',
                    success: function(data) {
                        console.log('Respuesta de gradereport_user_get_grade_items:', data);

                        var actividades = [];
                        if (data.usergrades) {
                            data.usergrades.forEach(user => {
                                user.gradeitems.forEach(item => {
                                    // Solo incluir actividades (excluir itemname null, que es el total del curso)
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
                            messagesDiv.append('<p><strong>Debug:</strong> No se encontraron actividades para verificar.</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            // Ejecutar el callback si existe
                            if (callback) {callback();}
                            return;
                        }

                        // Filtrar las actividades que son cuestionarios
                        var quizzes = [];
                        var promises = actividades.map(actividad => {
                            var paramsContext = {
                                wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                                wsfunction: 'core_course_get_course_module',
                                moodlewsrestformat: 'json',
                                cmid: actividad.cmid
                            };

                            var queryStringContext = $.param(paramsContext);
                            var fullUrlContext = `${API_Moodle}?${queryStringContext}`;

                            return $.ajax({
                                url: fullUrlContext,
                                method: 'GET',
                                dataType: 'json',
                                success: function(contextData) {
                                    if (contextData.cm && contextData.cm.modname === 'quiz') {
                                        quizzes.push({
                                            quizid: contextData.cm.instance,
                                            name: actividad.name
                                        });
                                    }
                                },
                                error: function(xhr, status, error) {
                                    console.log('Error al obtener datos del módulo:', { xhr, status, error });
                                }
                            });
                        });

                        // Esperar a que todas las solicitudes de core_course_get_course_module se completen
                        Promise.all(promises).then(() => {
                            console.log('Cuestionarios encontrados:', quizzes);

                            if (quizzes.length === 0) {
                                messagesDiv.append('<p><strong>Debug:</strong> No se encontraron cuestionarios para verificar.</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                // Ejecutar el callback si existe
                                if (callback) {callback();}
                                return;
                            }

                            // Verificar intentos en curso para cada cuestionario
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

                                var queryStringAttempts = $.param(paramsAttempts);
                                var fullUrlAttempts = `${API_Moodle}?${queryStringAttempts}`;

                                console.log('URL generada para mod_quiz_get_user_attempts:', fullUrlAttempts);

                                return $.ajax({
                                    url: fullUrlAttempts,
                                    method: 'GET',
                                    dataType: 'json',
                                    success: function(attemptData) {
                                        console.log(`Respuesta de mod_quiz_get_user_attempts para quiz ${quiz.quizid}:`, attemptData);

                                        if (attemptData.attempts && attemptData.attempts.length > 0) {
                                            var inProgressAttempt = attemptData.attempts.find(attempt => attempt.state === 'inprogress');
                                            if (inProgressAttempt) {
                                                isChatBlocked = true;
                                                messagesDiv.append('<p><strong>Tutor:</strong> No puedes enviar mensajes mientras estás realizando un cuestionario en curso.</p>');
                                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                                // Deshabilitar el formulario
                                                chatInput.prop('disabled', true);
                                                submitButton.prop('disabled', true);
                                            }
                                        }
                                    },
                                    error: function(xhr, status, error) {
                                        console.log('Error al obtener intentos del cuestionario:', { xhr, status, error });
                                    }
                                });
                            });

                            // Esperar a que todas las solicitudes de mod_quiz_get_user_attempts se completen
                            Promise.all(attemptPromises).then(() => {
                                if (!isChatBlocked) {
                                    messagesDiv.append('<p><strong>Debug:</strong> No se encontraron intentos de cuestionarios en curso.</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                    // Ejecutar el callback si existe
                                    if (callback) {callback();}
                                }
                            }).catch(error => {
                                console.log('Error al verificar intentos:', error);
                                messagesDiv.append('<p><strong>Tutor:</strong> Error al verificar intentos de cuestionarios: ' + error + '</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                // Ejecutar el callback por seguridad
                                if (callback) {callback();}
                            });
                        }).catch(error => {
                            console.log('Error al obtener módulos del curso:', error);
                            messagesDiv.append('<p><strong>Tutor:</strong> Error al verificar actividades: ' + error + '</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            // Ejecutar el callback por seguridad
                            if (callback) {callback();}
                        });
                    },
                    error: function(xhr, status, error) {
                        console.log('Error al obtener actividades:', { xhr, status, error });
                        messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener actividades: ' + error + ' (Código: ' + xhr.status + ')</p>');
                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                        // Ejecutar el callback por seguridad
                        if (callback) {callback();}
                    }
                });
            }

            /**
             * Obtiene las calificaciones del usuario actual, genera recomendaciones y las muestra.
             * Usa gradereport_user_get_grade_items para obtener las calificaciones y las envía a la API
             * para generar recomendaciones personalizadas.
             */
            function obtenerRecomendaciones() {
                // Obtener el ID de la actividad desde la URL
                var urlParams = new URLSearchParams(window.location.search);
                var activityId = urlParams.get('id') || 1;
                console.log('Valor de activityId:', activityId); // Depuración

                // Usar el userid y courseid pasados desde PHP
                var currentUserId = userid;
                var currentCourseId = courseid;

                // Construir la URL completa para la solicitud GET usando API_Moodle
                var params = {
                    wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                    wsfunction: 'gradereport_user_get_grade_items',
                    moodlewsrestformat: 'json',
                    courseid: currentCourseId,
                    userid: currentUserId
                };

                var queryString = $.param(params);
                var fullUrl = `${API_Moodle}?${queryString}`;

                console.log('URL generada para gradereport_user_get_grade_items:', fullUrl);

                messagesDiv.append('<p><strong>Debug:</strong> Obteniendo calificaciones...</p>');
                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                // Obtener calificaciones
                $.ajax({
                    url: fullUrl,
                    method: 'GET',
                    dataType: 'json',
                    success: function(data) {
                        console.log('Respuesta de gradereport_user_get_grade_items:', data);

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
                        } else {
                            console.log('No se encontraron usergrades en la respuesta:', data);
                            messagesDiv.append('<p><strong>Tutor:</strong> No se encontraron calificaciones.</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            return;
                        }

                        console.log('Notas procesadas (después de filtrar notas > 0):', notas);

                        if (notas.length === 0) {
                            messagesDiv.append('<p><strong>Tutor:</strong> No hay actividades con notas mayores a 0 para analizar.</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            return;
                        }

                        var instruccionNotas = "Actúa como un tutor virtual especializado en la enseñanza de Análisis y Diseño de Software. Tu tarea es analizar las calificaciones de un estudiante y generar recomendaciones personalizadas para mejorar su rendimiento en cada actividad. Recibirás una lista de calificaciones en el formato: [{\"userid\": number, \"name\": string, \"grade\": number, \"actividad\": string}, ...]. Para cada actividad, evalúa la nota (que está en una escala de 0 a 10) y genera una recomendación específica basada en el rendimiento del estudiante. Si la nota es menor a 5, sugiere acciones para mejorar (por ejemplo, revisar conceptos específicos, practicar más ejercicios, o buscar ayuda adicional). Si la nota está entre 5 y 7, sugiere formas de consolidar el aprendizaje (por ejemplo, profundizar en temas específicos o aplicar conceptos en proyectos prácticos). Si la nota es mayor a 7, felicita al estudiante y sugiere cómo puede seguir avanzando (por ejemplo, explorar temas más avanzados o liderar proyectos). Devuelve las recomendaciones en formato JSON con la siguiente estructura: {\"recomendaciones\": [{\"userid\": number, \"name\": string, \"nota\": number, \"actividad\": string, \"recomendacion\": string}, ...]}. Responde en español.";

                        messagesDiv.append('<p><strong>Debug:</strong> Enviando calificaciones a la API...</p>');
                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                        $.ajax({
                            url: API_tutor, // Usar variable para endpoint de generación
                            method: 'POST',
                            data: JSON.stringify({
                                instruccion: instruccionNotas,
                                entrada: JSON.stringify(notas),
                                max_nuevos_tokens: 5000
                            }),
                            contentType: 'application/json',
                            success: function(response) {
                                console.log('Respuesta de la API /generar:', response);

                                if (response.respuesta) {
                                    var cleanedResponse = response.respuesta
                                        .replace(/```json\n/, '')
                                        .replace(/\n```/, '')
                                        .trim();

                                    console.log('Respuesta limpia:', cleanedResponse);

                                    try {
                                        var recomendaciones = JSON.parse(cleanedResponse);
                                        console.log('Recomendaciones parseadas:', recomendaciones);

                                        if (recomendaciones.recomendaciones && recomendaciones.recomendaciones.length > 0) {
                                            var studentName = recomendaciones.recomendaciones[0].name;
                                            var mensaje = `Hola ${studentName}, he analizado tus calificaciones. Aquí tienes algunas recomendaciones para mejorar:<br>`;
                                            recomendaciones.recomendaciones.forEach(rec => {
                                                mensaje += `- En ${rec.actividad}, obtuviste ${rec.nota}: ${rec.recomendacion}<br>`;
                                            });

                                            messagesDiv.append(`<p><strong>Tutor:</strong> ${mensaje}</p>`);
                                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                        } else {
                                            messagesDiv.append('<p><strong>Tutor:</strong> Error: No se encontraron recomendaciones en la respuesta.</p>');
                                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                        }
                                    } catch (parseError) {
                                        console.log('Error al parsear la respuesta:', parseError);
                                        messagesDiv.append('<p><strong>Tutor:</strong> Error al parsear las recomendaciones: ' + parseError.message + '</p>');
                                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                    }
                                } else {
                                    messagesDiv.append('<p><strong>Tutor:</strong> Error: Respuesta inválida de la API.</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                }
                            },
                            error: function(xhr, status, error) {
                                console.log('Error al obtener recomendaciones:', { xhr, status, error });
                                messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener recomendaciones: ' + error + '</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            }
                        });
                    },
                    error: function(xhr, status, error) {
                        console.log('Error al obtener calificaciones:', { xhr, status, error });
                        console.log('Código de estado HTTP:', xhr.status);
                        console.log('Respuesta del servidor:', xhr.responseText);
                        messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener calificaciones: ' + error + ' (Código: ' + xhr.status + ')</p>');
                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                    }
                });
            }

            // Registrar usuario al cargar el bloque
            registrarUsuario();

            // Verificar intentos de cuestionarios en curso al cargar el bloque
            verificarIntentosCuestionario();

            // Configurar el botón de escaneo
            var btnIniciarEscaneo = $('#btn-iniciar-escaneo');
            if (btnIniciarEscaneo.length) {
                btnIniciarEscaneo.on('click', function() {
                    messagesDiv.append('<p><strong>Debug:</strong> Iniciando escaneo del curso...</p>');
                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                    // Ejecutar verificarIntentosCuestionario y pasar obtenerRecomendaciones como callback
                    verificarIntentosCuestionario(obtenerRecomendaciones);
                });
            } else {
                console.log('Botón de escaneo no encontrado');
                messagesDiv.append('<p><strong>Error:</strong> Botón de escaneo no encontrado</p>');
                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
            }

            if (form.length) {
                form.on('submit', function(e) {
                    e.preventDefault();

                    // Verificar si el chat está bloqueado
                    if (isChatBlocked) {
                        messagesDiv.append('<p><strong>Tutor:</strong> No puedes enviar mensajes mientras estás realizando un cuestionario en curso.</p>');
                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                        return;
                    }

                    var message = chatInput.val();

                    if (message.trim() === '') {
                        return;
                    }

                    messagesDiv.append('<p><strong>Tú:</strong> ' + message + '</p>');
                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                    chatInput.val('');

                    // Guardar el mensaje del usuario en la API
                    $.ajax({
                        url: `${API_BD_TUTOR_BASE}messages/save`, // Usar variable para endpoint POST de mensajes
                        method: 'POST',
                        data: JSON.stringify({
                            user_id: userid,
                            message_type: 'input',
                            message_text: message
                        }),
                        contentType: 'application/json',
                        success: function(response) {
                            console.log('Mensaje del usuario guardado:', response);
                            messagesDiv.append('<p><strong>Debug:</strong> Mensaje del usuario guardado en la API.</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                        },
                        error: function(xhr, status, error) {
                            console.log('Error al guardar mensaje del usuario:', { xhr, status, error });
                            messagesDiv.append('<p><strong>Debug:</strong> Error al guardar mensaje del usuario: ' + error + '</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                        }
                    });

                    messagesDiv.append('<p><strong>Debug:</strong> Enviando a la API...</p>');
                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                    var instruccion = "Actúa como un profesor especializado en Análisis y Diseño de Software. Responde todas las preguntas relacionadas con el tema de forma clara, detallada y estructurada, utilizando ejemplos prácticos y profundizando en las teorías, principios y metodologías que conforman el área. Tus respuestas deben incluir aspectos tanto teóricos como prácticos, explicando de forma comprensible conceptos como los diagramas UML, las metodologías ágiles, el ciclo de vida del software, los patrones de diseño, la arquitectura de software, la ingeniería de requisitos, y otras áreas clave del análisis y diseño de software. Responde en español de manera técnica, pero accesible para estudiantes. Responde que no puedes ayudar si preguntan algo que no este relacionado al Análisis y Diseño de Software.";

                    $.ajax({
                        url: API_tutor, // Usar variable para endpoint de generación
                        method: 'POST',
                        data: JSON.stringify({
                            instruccion: instruccion,
                            entrada: message,
                            max_nuevos_tokens: 1000
                        }),
                        contentType: 'application/json',
                        success: function(response) {
                            var tutorResponse = response.respuesta;
                            messagesDiv.append('<p><strong>Bot:</strong> ' + tutorResponse + '</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                            // Guardar la respuesta del tutor en la API
                            $.ajax({
                                url: `${API_BD_TUTOR_BASE}messages/save`, // Usar variable para endpoint POST de mensajes
                                method: 'POST',
                                data: JSON.stringify({
                                    user_id: userid,
                                    message_type: 'output',
                                    message_text: tutorResponse
                                }),
                                contentType: 'application/json',
                                success: function(saveResponse) {
                                    console.log('Respuesta del tutor guardada:', saveResponse);
                                    messagesDiv.append('<p><strong>Debug:</strong> Respuesta del tutor guardada en la API.</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                },
                                error: function(xhr, status, error) {
                                    console.log('Error al guardar respuesta del tutor:', { xhr, status, error });
                                    messagesDiv.append('<p><strong>Debug:</strong> Error al guardar respuesta del tutor: ' + error + '</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                }
                            });
                        },
                        error: function(xhr, status, error) {
                            messagesDiv.append('<p><strong>Bot:</strong> Error al conectar con la API: ' + error + '</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                        }
                    });
                });
            } else {
                messagesDiv.append('<p><strong>Error:</strong> Formulario no encontrado</p>');
            }
        }
    };
});