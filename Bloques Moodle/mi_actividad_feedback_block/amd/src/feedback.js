/* eslint-disable camelcase */
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable jsdoc/require-param */
/* eslint-disable max-len */
define(['jquery'], function($) {
    // Definición de variables generales para las APIs
    const API_tutor = 'http://localhost:8000/generar'; // API para generar retroalimentación del tutor
    const API_Moodle = 'http://localhost/webservice/rest/server.php'; // API de Moodle para servicios web
    const API_BD_TUTOR_BASE = 'http://localhost:8080/api/';

    return {
        init: function(userid, courseid, cmid, modname) {
            var messagesDiv = $('#feedback-messages');
            var requestBtn = $('#feedback-request-btn');
            var cooldown = false;
            var cooldownTime = 10000; // 10 segundos (puedes cambiar a 5000 para 5 segundos)

            // Loader visual para el tutor
            function showTutorLoader() {
                var loader = $('<div class="tutor-bubble tutor-loader"></div>').html('<span><em>El tutor está escribiendo...</em></span>');
                messagesDiv.append(loader);
                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
            }
            function removeTutorLoader() {
                messagesDiv.find('.tutor-loader').remove();
            }

            // --- NUEVA FUNCIÓN PARA ANIMAR EL TEXTO EN BURBUJA Y RESPETAR HTML (ESTILO CHAT) ---
            function mostrarTextoAnimado(element, html, velocidad = 20) {
                removeTutorLoader();
                var bubble = $('<div class="tutor-bubble typing-tutor"></div>');
                bubble.append('<span></span>');
                element.append(bubble);
                var span = bubble.find('span');
                // Permitir etiquetas seguras: <br>, <b>, <i>, <pre>, <code>
                var safeHtml = html
                    .replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, function(match, lang, code) {
                        return '<pre><code>' + $('<div>').text(code).html() + '</code></pre>';
                    })
                    .replace(/\n/g, '<br>')
                    .replace(/<(?!br\s*\/?>|b>|\/b>|i>|\/i>|pre>|\/pre>|code>|\/code>)[^>]+>/gi, '');
                var i = 0;
                function typeChar() {
                    if (i <= safeHtml.length) {
                        span.html(safeHtml.slice(0, i));
                        element.scrollTop(element[0].scrollHeight);
                        i++;
                        setTimeout(typeChar, velocidad);
                    } else {
                        span.html(safeHtml);
                        bubble.removeClass('typing-tutor');
                        element.scrollTop(element[0].scrollHeight);
                    }
                }
                typeChar();
            }
            // --- FIN NUEVA FUNCIÓN ---

            /**
             * Obtiene la calificación, contenido y respuestas del usuario para la actividad específica.
             */
            function obtenerRetroalimentacion() {
                var params = {
                    wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                    wsfunction: 'gradereport_user_get_grade_items',
                    moodlewsrestformat: 'json',
                    courseid: courseid,
                    userid: userid
                };

                var queryString = $.param(params);
                var fullUrl = `${API_Moodle}?${queryString}`;

                showTutorLoader();
                $.ajax({
                    url: fullUrl,
                    method: 'GET',
                    dataType: 'json',
                    success: function(data) {
                        removeTutorLoader();

                        var actividadData = null;
                        if (data.usergrades) {
                            data.usergrades.forEach(user => {
                                user.gradeitems.forEach(item => {
                                    if (item.cmid == cmid) {
                                        var grade = item.graderaw !== null ? item.graderaw : 0;
                                        actividadData = {
                                            userid: user.userid,
                                            name: user.userfullname,
                                            grade: grade,
                                            actividad: item.itemname,
                                            feedback: item.feedback || 'Sin retroalimentación del profesor.',
                                            feedbackformat: item.feedbackformat || 0
                                        };
                                    }
                                });
                            });
                        }

                        if (!actividadData) {
                            messagesDiv.append('<p><strong>Tutor:</strong> No se encontró una calificación para esta actividad o aún no ha sido calificada.</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            return;
                        }

                        if (actividadData.feedbackformat === 1) {
                            var tempDiv = $('<div>').html(actividadData.feedback);
                            actividadData.feedback = tempDiv.text();
                        }

                        var paramsContext = {
                            wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                            wsfunction: 'core_course_get_course_module',
                            moodlewsrestformat: 'json',
                            cmid: cmid
                        };

                        var queryStringContext = $.param(paramsContext);
                        var fullUrlContext = `${API_Moodle}?${queryStringContext}`;

                        $.ajax({
                            url: fullUrlContext,
                            method: 'GET',
                            dataType: 'json',
                            success: function(contextData) {
                                removeTutorLoader();

                                if (!contextData.cm || !contextData.cm.instance) {
                                    messagesDiv.append('<p><strong>Tutor:</strong> No se pudo obtener el ID de la actividad.</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                    return;
                                }

                                actividadData.id = contextData.cm.instance;

                                if (modname === 'quiz') {
                                    obtenerDatosCuestionario(actividadData);
                                } else if (modname === 'assign') {
                                    obtenerDatosTarea(actividadData);
                                } else {
                                    messagesDiv.append('<p><strong>Tutor:</strong> Este tipo de actividad no es compatible para análisis detallado.</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                }
                            },
                            error: function() {
                                removeTutorLoader();
                                messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener contextid.</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            }
                        });
                    },
                    error: function() {
                        removeTutorLoader();
                        messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener calificaciones.</p>');
                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                    }
                });
            }

            /**
             * Obtiene las preguntas y respuestas del estudiante para un cuestionario.
             */
            function obtenerDatosCuestionario(actividadData) {
                var params = {
                    wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                    wsfunction: 'mod_quiz_get_user_attempts',
                    moodlewsrestformat: 'json',
                    quizid: actividadData.id,
                    userid: userid,
                    status: 'finished'
                };

                var queryString = $.param(params);
                var fullUrl = `${API_Moodle}?${queryString}`;

                showTutorLoader();
                $.ajax({
                    url: fullUrl,
                    method: 'GET',
                    dataType: 'json',
                    success: function(data) {
                        removeTutorLoader();

                        if (!data.attempts || data.attempts.length === 0) {
                            messagesDiv.append('<p><strong>Tutor:</strong> No se encontraron intentos para este cuestionario.</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            return;
                        }

                        var ultimoIntento = data.attempts[data.attempts.length - 1];
                        var attemptId = ultimoIntento.id;

                        // Establecer número máximo de intentos fijo
                        var maxAttempts = 3;
                        var attemptsMade = data.attempts.length;
                        var remainingAttempts = maxAttempts - attemptsMade;

                        if (remainingAttempts < 0) {
                            remainingAttempts = 0; // Por si hay un error en los datos
                        }

                        actividadData.remainingAttempts = remainingAttempts;

                        // Obtener detalles del intento
                        var paramsAttempt = {
                            wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                            wsfunction: 'mod_quiz_get_attempt_review',
                            moodlewsrestformat: 'json',
                            attemptid: attemptId,
                            page: -1
                        };

                        var queryStringAttempt = $.param(paramsAttempt);
                        var fullUrlAttempt = `${API_Moodle}?${queryStringAttempt}`;

                        $.ajax({
                            url: fullUrlAttempt,
                            method: 'GET',
                            dataType: 'json',
                            success: function(attemptData) {
                                removeTutorLoader();

                                if (attemptData.warnings && attemptData.warnings.length > 0) {
                                    messagesDiv.append('<p><strong>Tutor:</strong> Advertencias: ' + attemptData.warnings[0].message + '</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                    return;
                                }

                                if (!attemptData.questions || attemptData.questions.length === 0) {
                                    messagesDiv.append('<p><strong>Tutor:</strong> No se encontraron preguntas en el intento.</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                    return;
                                }

                                var preguntasIncorrectas = [];
                                attemptData.questions.forEach(question => {
                                    var preguntaMatch = question.html.match(/<div class="qtext">(.*?)<\/div>/is);
                                    var pregunta = preguntaMatch ? preguntaMatch[1] : 'No se pudo extraer la pregunta';

                                    var numeroPregunta = question.questionnumber || 'Desconocido';

                                    var estado = question.status || 'Desconocido';
                                    var estadoInterno = question.state || 'unknown';

                                    var respuestaSeleccionadaMatch = question.html.match(/<input[^>]+checked="checked"[^>]*>.*?<div class="flex-fill ms-1">([^<]+)</is);
                                    var respuestaSeleccionada = respuestaSeleccionadaMatch ? respuestaSeleccionadaMatch[1] : 'No se pudo extraer la respuesta seleccionada';

                                    var respuestaCorrectaMatch = question.html.match(/<div class="rightanswer">La respuesta correcta es: ([^<]+)</is);
                                    var respuestaCorrecta = respuestaCorrectaMatch ? respuestaCorrectaMatch[1] : 'No se pudo extraer la respuesta correcta';

                                    var opciones = [];
                                    var opcionesMatches = question.html.matchAll(/<div class="flex-fill ms-1">([^<]+)<\/div>/gis);
                                    for (let match of opcionesMatches) {
                                        opciones.push(match[1]);
                                    }

                                    if (estado === 'Incorrecta' || estadoInterno === 'gradedwrong') {
                                        preguntasIncorrectas.push({
                                            numero: numeroPregunta,
                                            pregunta: pregunta,
                                            respuestaSeleccionada: respuestaSeleccionada,
                                            respuestaCorrecta: respuestaCorrecta,
                                            opciones: opciones,
                                            estado: estado
                                        });
                                    }
                                });

                                actividadData.preguntasIncorrectas = preguntasIncorrectas;

                                if (preguntasIncorrectas.length === 0) {
                                    messagesDiv.append('<p><strong>Tutor:</strong> ¡Felicidades! Respondiste todas las preguntas correctamente.</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                } else {
                                    enviarDatosParaRetroalimentacion(actividadData);
                                }
                            },
                            error: function() {
                                removeTutorLoader();
                                messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener datos del intento.</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            }
                        });
                    },
                    error: function() {
                        removeTutorLoader();
                        messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener intentos.</p>');
                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                    }
                });
            }

            /**
             * Obtiene el contenido enviado por el estudiante para una tarea.
             */
            function obtenerDatosTarea(actividadData) {
                var paramsAssignment = {
                    wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                    wsfunction: 'mod_assign_get_assignments',
                    moodlewsrestformat: 'json',
                    courseids: [courseid]
                };

                var queryStringAssignment = $.param(paramsAssignment);
                var fullUrlAssignment = `${API_Moodle}?${queryStringAssignment}`;

                showTutorLoader();
                $.ajax({
                    url: fullUrlAssignment,
                    method: 'GET',
                    dataType: 'json',
                    success: function(assignmentData) {
                        removeTutorLoader();

                        var assignment = null;
                        if (assignmentData.courses && assignmentData.courses.length > 0) {
                            assignmentData.courses.forEach(course => {
                                course.assignments.forEach(assign => {
                                    if (assign.cmid == cmid) {
                                        assignment = assign;
                                    }
                                });
                            });
                        }

                        if (!assignment) {
                            messagesDiv.append('<p><strong>Tutor:</strong> No se encontró información sobre la tarea.</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            return;
                        }

                        actividadData.title = assignment.name;
                        actividadData.description = assignment.intro || 'Sin descripción disponible.';
                        actividadData.introformat = assignment.introformat || 0;

                        if (actividadData.introformat === 1) {
                            var tempDiv = $('<div>').html(actividadData.description);
                            actividadData.description = tempDiv.text();
                        }

                        var paramsSubmission = {
                            wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                            wsfunction: 'mod_assign_get_submissions',
                            moodlewsrestformat: 'json',
                            assignmentids: [actividadData.id]
                        };

                        var queryStringSubmission = $.param(paramsSubmission);
                        var fullUrlSubmission = `${API_Moodle}?${queryStringSubmission}`;

                        $.ajax({
                            url: fullUrlSubmission,
                            method: 'GET',
                            dataType: 'json',
                            success: function(submissionData) {
                                removeTutorLoader();

                                var entregaEstudiante = null;
                                if (submissionData.assignments && submissionData.assignments.length > 0) {
                                    var submissions = submissionData.assignments[0].submissions;
                                    entregaEstudiante = submissions.find(sub => sub.userid == userid);
                                }

                                if (!entregaEstudiante) {
                                    actividadData.status = 'pendiente';
                                    actividadData.submissionStatus = 'No entregada';
                                    enviarDatosParaRetroalimentacion(actividadData);
                                    return;
                                }

                                actividadData.status = entregaEstudiante.status || 'entregada';
                                actividadData.submissionStatus = entregaEstudiante.status === 'submitted' ? 'Entregada' : 'Borrador';

                                if (actividadData.status === 'submitted') {
                                    if (actividadData.grade > 0) {
                                        actividadData.status = 'calificada';
                                    } else {
                                        actividadData.status = 'entregada_no_calificada';
                                    }
                                }

                                enviarDatosParaRetroalimentacion(actividadData);
                            },
                            error: function() {
                                removeTutorLoader();
                                messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener entregas.</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            }
                        });
                    },
                    error: function() {
                        removeTutorLoader();
                        messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener datos de la tarea.</p>');
                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                    }
                });
            }

            /**
             * Envía los datos a la API para obtener retroalimentación detallada.
             */
            function enviarDatosParaRetroalimentacion(actividadData) {
                showTutorLoader();
                // Guardar la entrada del usuario (input)
                $.ajax({
                    url: `${API_BD_TUTOR_BASE}messages/save`,
                    method: 'POST',
                    data: JSON.stringify({
                        user_id: userid,
                        message_type: 'feed_input',
                        message_text: JSON.stringify(actividadData)
                    }),
                    contentType: 'application/json'
                });
                var instruccionRetro = `
                    Actúa como un tutor virtual especializado en Responsabilidad Social Empresarial. Tu tarea es proporcionar retroalimentación educativa a un estudiante basada en el estado de una tarea. Recibirás los datos en el formato: 
                    {
                        "userid": number, 
                        "name": string, 
                        "grade": number, 
                        "actividad": string, 
                        "title": string, 
                        "description": string, 
                        "status": string ("pendiente", "entregada_no_calificada", "calificada"), 
                        "submissionStatus": string, 
                        "feedback": string
                    }
                    
                    - Si el estado es "pendiente", analiza el título y la descripción de la tarea y proporciona recomendaciones específicas para que el estudiante la complete exitosamente.
                    - Si el estado es "entregada_no_calificada", informa al estudiante que su tarea está en proceso de evaluación y sugiere cómo puede prepararse para futuras tareas similares.
                    - Si el estado es "calificada", analiza la calificación y la retroalimentación del profesor para proporcionar retroalimentación adicional. Explica qué hizo bien el estudiante, qué puede mejorar, y sugiere pasos específicos para futuras tareas.
                    
                    Devuelve la retroalimentación en formato texto, en español, con un tono profesional y motivador.
                `;

                if (actividadData.preguntasIncorrectas && actividadData.preguntasIncorrectas.length > 0) {
                    if (actividadData.remainingAttempts > 0) {
                        // Retroalimentación de apoyo para intentos restantes
                        var promptApoyo = `
                            Eres un tutor virtual especializado en Responsabilidad Social Empresarial. Un estudiante ha respondido incorrectamente algunas preguntas en un cuestionario, pero aún tiene ${actividadData.remainingAttempts} intento(s) restante(s). Proporciona retroalimentación de apoyo que identifique los temas principales de las preguntas incorrectas y ofrezca consejos generales para mejorar, sin revelar las respuestas correctas ni detalles específicos de las preguntas.

                            Preguntas incorrectas:
                            ${actividadData.preguntasIncorrectas.map((pregunta, index) => `
                            Pregunta ${index + 1} (Número ${pregunta.numero}): ${pregunta.pregunta}
                            `).join('\n')}

                            Identifica los temas principales (por ejemplo, ética empresarial, sostenibilidad, responsabilidad social interna o externa) y sugiere cómo mejorar en ellos (máximo 150 palabras). Comienza con "¡No te preocupes, estás progresando!" y usa un tono motivador. No menciones respuestas correctas ni hagas referencia a libros o materiales externos.
                        `;

                        $.ajax({
                            url: API_tutor, // Usar variable para endpoint de generación
                            method: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                instruccion: "Proporciona retroalimentación de apoyo basada en los temas de las preguntas incorrectas.",
                                entrada: promptApoyo,
                                max_nuevos_tokens: 256
                            }),
                            success: function(response) {
                                removeTutorLoader();

                                if (response.respuesta) {
                                    var retroalimentacionFormateada = response.respuesta.replace(/\n/g, '<br>');
                                    var mensaje = `<p><strong>Tutor:</strong><br>${retroalimentacionFormateada}<br>Tienes ${actividadData.remainingAttempts} intento(s) restante(s). ¡Sigue practicando!</p>`;
                                    mostrarTextoAnimado(messagesDiv, mensaje);
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                    // Guardar la respuesta del tutor (output)
                                    $.ajax({
                                        url: `${API_BD_TUTOR_BASE}messages/save`,
                                        method: 'POST',
                                        data: JSON.stringify({
                                            user_id: userid,
                                            message_type: 'feed_output',
                                            message_text: response.respuesta
                                        }),
                                        contentType: 'application/json'
                                    });
                                } else {
                                    messagesDiv.append('<p><strong>Tutor:</strong> Error: No se pudo generar la retroalimentación de apoyo.</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                }
                            },
                            error: function() {
                                removeTutorLoader();
                                messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener retroalimentación de apoyo.</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            }
                        });
                    } else {
                        // Retroalimentación detallada y actividad de refuerzo cuando no hay intentos
                        var promesas = actividadData.preguntasIncorrectas.map(pregunta => {
                            var prompt = `
                                Eres un tutor virtual especializado en Responsabilidad Social Empresarial. Explica por qué la respuesta correcta es adecuada para la siguiente pregunta de un cuestionario, considerando el contexto y las opciones disponibles.

                                **Pregunta**: ${pregunta.pregunta}
                                **Respuesta seleccionada**: ${pregunta.respuestaSeleccionada} (incorrecta)
                                **Respuesta correcta**: ${pregunta.respuestaCorrecta}
                                **Opciones**: ${pregunta.opciones.join(', ')}

                                Explica por qué "${pregunta.respuestaCorrecta}" es correcta y por qué "${pregunta.respuestaSeleccionada}" no lo es. Usa un lenguaje claro, educativo y motivador (máximo 100 palabras).
                            `;

                            return $.ajax({
                                url: API_tutor, // Usar variable para endpoint de generación
                                method: 'POST',
                                contentType: 'application/json',
                                data: JSON.stringify({
                                    instruccion: "Proporciona una explicación clara y detallada.",
                                    entrada: prompt,
                                    max_nuevos_tokens: 256
                                }),
                                success: function(response) {
                                    removeTutorLoader();

                                    if (response.respuesta) {
                                        var mensaje = `<p><strong>Tutor:</strong> Pregunta ${pregunta.numero}: "${pregunta.pregunta}":<br>` +
                                            `<strong>Respondiste:</strong> "${pregunta.respuestaSeleccionada}" (Incorrecta).<br>` +
                                            `<strong>Correcta:</strong> "${pregunta.respuestaCorrecta}".<br>` +
                                            `<strong>Explicación:</strong> ${response.respuesta}</p>`;
                                        mostrarTextoAnimado(messagesDiv, mensaje);
                                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                        // Guardar la respuesta del tutor (output)
                                        $.ajax({
                                            url: `${API_BD_TUTOR_BASE}messages/save`,
                                            method: 'POST',
                                            data: JSON.stringify({
                                                user_id: userid,
                                                message_type: 'feed_output',
                                                message_text: response.respuesta
                                            }),
                                            contentType: 'application/json'
                                        });
                                    }
                                },
                                error: function() {
                                    removeTutorLoader();
                                    messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener retroalimentación para la Pregunta.</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                }
                            });
                        });

                        Promise.all(promesas).then(() => {
                            if (actividadData.grade < 7) {
                                var promptRefuerzo = `
                                    Eres un tutor virtual especializado en Responsabilidad Social Empresarial. Un estudiante obtuvo una calificación de ${actividadData.grade} en un cuestionario (escala 0-10). Propón una actividad de refuerzo para mejorar en los temas de los preguntas incorrectas:

                                    ${actividadData.preguntasIncorrectas.map((pregunta, index) => `
                                    Pregunta ${index + 1} (Número ${pregunta.numero}): ${pregunta.pregunta}
                                    Respuesta seleccionada: ${pregunta.respuestaSeleccionada} (incorrecta)
                                    Respuesta correcta: ${pregunta.respuestaCorrecta}
                                    `).join('\n')}

                                    Identifica los temas de los errores y propone una actividad práctica y breve (máximo 200 palabras) que aborde todos los temas. Comienza con "¡Vamos a reforzar tus conocimientos!" y usa un tono motivador. No menciones libros ni materiales externos.
                                `;

                                return $.ajax({
                                    url: API_tutor, // Usar variable para endpoint de generación
                                    method: 'POST',
                                    contentType: 'application/json',
                                    data: JSON.stringify({
                                        instruccion: "Proporciona una actividad de refuerzo basada en los errores del estudiante.",
                                        entrada: promptRefuerzo,
                                        max_nuevos_tokens: 256
                                    }),
                                    success: function(response) {
                                        removeTutorLoader();

                                        if (response.respuesta) {
                                            var actividadFormateada = response.respuesta.replace(/\n/g, '<br>');
                                            var mensaje = `<p><strong>Tutor:</strong><br><strong>Actividad de refuerzo:</strong><br>${actividadFormateada}</p>`;
                                            mostrarTextoAnimado(messagesDiv, mensaje);
                                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                            // Guardar la respuesta del tutor (output)
                                            $.ajax({
                                                url: `${API_BD_TUTOR_BASE}messages/save`,
                                                method: 'POST',
                                                data: JSON.stringify({
                                                    user_id: userid,
                                                    message_type: 'feed_output',
                                                    message_text: response.respuesta
                                                }),
                                                contentType: 'application/json'
                                            });
                                        } else {
                                            messagesDiv.append('<p><strong>Tutor:</strong> Error: No se pudo generar la actividad de refuerzo.</p>');
                                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                        }
                                    },
                                    error: function() {
                                        removeTutorLoader();
                                        messagesDiv.append('<p><strong>Tutor:</strong> Error al generar actividad de refuerzo.</p>');
                                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                    }
                                });
                            }
                            // No action is needed, just return null to satisfy arrow function return
                            return null;
                        }).catch(() => {
                            removeTutorLoader();
                            messagesDiv.append('<p><strong>Tutor:</strong> Error al procesar retroalimentaciones.</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                        });
                    }
                } else {
                    // Retroalimentación para tareas
                    $.ajax({
                        url: API_tutor, // Usar variable para endpoint de generación
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            instruccion: instruccionRetro,
                            entrada: JSON.stringify(actividadData),
                            max_nuevos_tokens: 256
                        }),
                        success: function(response) {
                            removeTutorLoader();

                            if (response.respuesta) {
                                var retroalimentacionFormateada = response.respuesta.replace(/\n/g, '<br>');
                                var mensaje = `<p><strong>Tutor:</strong> Hola ${actividadData.name}, aquí tienes la retroalimentación para "${actividadData.actividad}":<br>${retroalimentacionFormateada}</p>`;
                                mostrarTextoAnimado(messagesDiv, mensaje);
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                // Guardar la respuesta del tutor (output)
                                $.ajax({
                                    url: `${API_BD_TUTOR_BASE}messages/save`,
                                    method: 'POST',
                                    data: JSON.stringify({
                                        user_id: userid,
                                        message_type: 'feed_output',
                                        message_text: response.respuesta
                                    }),
                                    contentType: 'application/json'
                                });
                            } else {
                                messagesDiv.append('<p><strong>Tutor:</strong> Error: Respuesta inválida de la API.</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            }
                        },
                        error: function() {
                            removeTutorLoader();
                            messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener retroalimentación.</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                        }
                    });
                }
            }

            // Evento click para el botón, con control de cooldown
            if (requestBtn.length) {
                requestBtn.on('click', function() {
                    if (cooldown) {
                        messagesDiv.append('<p><strong>Espera unos segundos antes de volver a solicitar retroalimentación.</strong></p>');
                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                        return;
                    }
                    cooldown = true;
                    requestBtn.prop('disabled', true);
                    obtenerRetroalimentacion();
                    setTimeout(function() {
                        cooldown = false;
                        requestBtn.prop('disabled', false);
                    }, cooldownTime);
                });
            }

        }
    };
});