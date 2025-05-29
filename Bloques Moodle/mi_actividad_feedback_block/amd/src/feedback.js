/* eslint-disable no-trailing-spaces */
/* eslint-disable jsdoc/require-param */
/* eslint-disable max-len */
/* eslint-disable no-console */
define(['jquery'], function ($) {
    // Definición de variables generales para las APIs
    const API_tutor = 'http://localhost:8000/generar'; // API para generar retroalimentación del tutor
    const API_Moodle = 'http://localhost/webservice/rest/server.php'; // API de Moodle para servicios web

    return {
        init: function (userid, courseid, cmid, modname) {
            var messagesDiv = $('#feedback-messages');

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

                console.log('URL generada para gradereport_user_get_grade_items:', fullUrl);

                messagesDiv.append('<p><strong>Debug:</strong> Obteniendo calificación de la actividad...</p>');
                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                $.ajax({
                    url: fullUrl,
                    method: 'GET',
                    dataType: 'json',
                    success: function (data) {
                        console.log('Respuesta de gradereport_user_get_grade_items:', data);

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

                        console.log('Datos de la actividad:', actividadData);

                        var paramsContext = {
                            wstoken: '10b97b49ec5c5119e48c566de5228f8f',
                            wsfunction: 'core_course_get_course_module',
                            moodlewsrestformat: 'json',
                            cmid: cmid
                        };

                        var queryStringContext = $.param(paramsContext);
                        var fullUrlContext = `${API_Moodle}?${queryStringContext}`;

                        console.log('URL generada para core_course_get_course_module:', fullUrlContext);

                        $.ajax({
                            url: fullUrlContext,
                            method: 'GET',
                            dataType: 'json',
                            success: function (contextData) {
                                console.log('Respuesta de core_course_get_course_module:', contextData);

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
                            error: function (xhr, status, error) {
                                console.log('Error al obtener contextid:', { xhr, status, error });
                                messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener contextid: ' + error + '</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            }
                        });
                    },
                    error: function (xhr, status, error) {
                        console.log('Error al obtener calificaciones:', { xhr, status, error });
                        messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener calificaciones: ' + error + ' (Código: ' + xhr.status + ')</p>');
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

                console.log('URL generada para mod_quiz_get_user_attempts:', fullUrl);
                console.log('Usuario ID utilizado:', userid);

                $.ajax({
                    url: fullUrl,
                    method: 'GET',
                    dataType: 'json',
                    success: function (data) {
                        console.log('Respuesta de mod_quiz_get_user_attempts:', data);

                        if (!data.attempts || data.attempts.length === 0) {
                            messagesDiv.append('<p><strong>Tutor:</strong> No se encontraron intentos para este cuestionario.</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            return;
                        }

                        var ultimoIntento = data.attempts[data.attempts.length - 1];
                        var attemptId = ultimoIntento.id;
                        console.log('Attempt ID seleccionado:', attemptId);

                        // Establecer número máximo de intentos fijo
                        var maxAttempts = 3;
                        var attemptsMade = data.attempts.length;
                        var remainingAttempts = maxAttempts - attemptsMade;

                        if (remainingAttempts < 0) {
                            remainingAttempts = 0; // Por si hay un error en los datos
                        }

                        console.log('Intentos realizados:', attemptsMade, 'Intentos máximos:', maxAttempts, 'Intentos restantes:', remainingAttempts);
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

                        console.log('URL generada para mod_quiz_get_attempt_review:', fullUrlAttempt);

                        $.ajax({
                            url: fullUrlAttempt,
                            method: 'GET',
                            dataType: 'json',
                            success: function (attemptData) {
                                console.log('Respuesta de mod_quiz_get_attempt_review:', attemptData);

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
                            error: function (xhr, status, error) {
                                console.log('Error al obtener datos del intento:', { xhr, status, error, responseText: xhr.responseText });
                                messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener datos del intento: ' + error + ' (Código: ' + xhr.status + ') - ' + (xhr.responseText || 'Sin detalles') + '</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            }
                        });
                    },
                    error: function (xhr, status, error) {
                        console.log('Error al obtener intentos:', { xhr, status, error, responseText: xhr.responseText });
                        messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener intentos: ' + error + ' (Código: ' + xhr.status + ') - ' + (xhr.responseText || 'Sin detalles') + '</p>');
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

                console.log('URL generada para mod_assign_get_assignments:', fullUrlAssignment);

                $.ajax({
                    url: fullUrlAssignment,
                    method: 'GET',
                    dataType: 'json',
                    success: function (assignmentData) {
                        console.log('Respuesta de mod_assign_get_assignments:', assignmentData);

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

                        console.log('URL generada para mod_assign_get_submissions:', fullUrlSubmission);

                        $.ajax({
                            url: fullUrlSubmission,
                            method: 'GET',
                            dataType: 'json',
                            success: function (submissionData) {
                                console.log('Respuesta de mod_assign_get_submissions:', submissionData);

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
                            error: function (xhr, status, error) {
                                console.log('Error al obtener entregas:', { xhr, status, error });
                                messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener entregas: ' + error + '</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            }
                        });
                    },
                    error: function (xhr, status, error) {
                        console.log('Error al obtener datos de la tarea:', { xhr, status, error });
                        messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener datos de la tarea: ' + error + '</p>');
                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                    }
                });
            }

            /**
             * Envía los datos a la API para obtener retroalimentación detallada.
             */
            function enviarDatosParaRetroalimentacion(actividadData) {
                var instruccionRetro = `
                    Actúa como un tutor virtual especializado en la enseñanza de Análisis y Diseño de Software. Tu tarea es proporcionar retroalimentación educativa a un estudiante basada en el estado de una tarea. Recibirás los datos en el formato: 
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

                messagesDiv.append('<p><strong>Debug:</strong> Enviando datos a la API para retroalimentación...</p>');
                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);

                if (actividadData.preguntasIncorrectas && actividadData.preguntasIncorrectas.length > 0) {
                    if (actividadData.remainingAttempts > 0) {
                        // Retroalimentación de apoyo para intentos restantes
                        var promptApoyo = `
                            Eres un tutor virtual especializado en Análisis y Diseño de Software. Un estudiante ha respondido incorrectamente algunas preguntas en un cuestionario, pero aún tiene ${actividadData.remainingAttempts} intento(s) restante(s). Proporciona retroalimentación de apoyo que identifique los temas principales de las preguntas incorrectas y ofrezca consejos generales para mejorar, sin revelar las respuestas correctas ni detalles específicos de las preguntas.

                            Preguntas incorrectas:
                            ${actividadData.preguntasIncorrectas.map((pregunta, index) => `
                            Pregunta ${index + 1} (Número ${pregunta.numero}): ${pregunta.pregunta}
                            `).join('\n')}

                            Identifica los temas principales (por ejemplo, modelado UML, casos de uso, diagramas de clases) y sugiere cómo mejorar en ellos (máximo 150 palabras). Comienza con "¡No te preocupes, estás progresando!" y usa un tono motivador. No menciones respuestas correctas ni hagas referencia a libros o materiales externos.
                        `;

                        console.log('Prompt para retroalimentación de apoyo:', promptApoyo);

                        $.ajax({
                            url: API_tutor, // Usar variable para endpoint de generación
                            method: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                instruccion: "Proporciona retroalimentación de apoyo basada en los temas de las preguntas incorrectas.",
                                entrada: promptApoyo,
                                max_nuevos_tokens: 256
                            }),
                            success: function (response) {
                                console.log('Respuesta de la API /generar (apoyo):', response);

                                if (response.respuesta) {
                                    var retroalimentacionFormateada = response.respuesta.replace(/\n/g, '<br>');
                                    var mensaje = `<p><strong>Tutor:</strong><br>${retroalimentacionFormateada}<br>Tienes ${actividadData.remainingAttempts} intento(s) restante(s). ¡Sigue practicando!</p>`;
                                    messagesDiv.append(mensaje);
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                } else {
                                    messagesDiv.append('<p><strong>Tutor:</strong> Error: No se pudo generar la retroalimentación de apoyo.</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                }
                            },
                            error: function (xhr, status, error) {
                                console.log('Error al obtener retroalimentación de apoyo:', { xhr, status, error, responseText: xhr.responseText });
                                messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener retroalimentación de apoyo: ' + error + ' (Código: ' + xhr.status + ') - ' + (xhr.responseText || 'Sin detalles') + '</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            }
                        });
                    } else {
                        // Retroalimentación detallada y actividad de refuerzo cuando no hay intentos
                        var promesas = actividadData.preguntasIncorrectas.map(pregunta => {
                            var prompt = `
                                Eres un tutor virtual especializado en Análisis y Diseño de Software. Explica por qué la respuesta correcta es adecuada para la siguiente pregunta de un cuestionario, considerando el contexto y las opciones disponibles.

                                **Pregunta**: ${pregunta.pregunta}
                                **Respuesta seleccionada**: ${pregunta.respuestaSeleccionada} (incorrecta)
                                **Respuesta correcta**: ${pregunta.respuestaCorrecta}
                                **Opciones**: ${pregunta.opciones.join(', ')}

                                Explica por qué "${pregunta.respuestaCorrecta}" es correcta y por qué "${pregunta.respuestaSeleccionada}" no lo es. Usa un lenguaje claro, educativo y motivador (máximo 100 palabras).
                            `;

                            console.log('Prompt para retroalimentación detallada:', prompt);

                            return $.ajax({
                                url: API_tutor, // Usar variable para endpoint de generación
                                method: 'POST',
                                contentType: 'application/json',
                                data: JSON.stringify({
                                    instruccion: "Proporciona una explicación clara y detallada.",
                                    entrada: prompt,
                                    max_nuevos_tokens: 256
                                }),
                                success: function (response) {
                                    console.log('Respuesta de la API /generar:', response);

                                    if (response.respuesta) {
                                        var mensaje = `<p><strong>Tutor:</strong> Pregunta ${pregunta.numero}: "${pregunta.pregunta}":<br>` +
                                            `<strong>Respondiste:</strong> "${pregunta.respuestaSeleccionada}" (Incorrecta).<br>` +
                                            `<strong>Correcta:</strong> "${pregunta.respuestaCorrecta}".<br>` +
                                            `<strong>Explicación:</strong> ${response.respuesta}</p>`;
                                        messagesDiv.append(mensaje);
                                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                    }
                                },
                                error: function (xhr, status, error) {
                                    console.log('Error al obtener retroalimentación detallada:', { xhr, status, error, responseText: xhr.responseText });
                                    messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener retroalimentación para la Pregunta ${pregunta.numero}: ' + error + ' (Código: ' + xhr.status + ') - ' + (xhr.responseText || 'Sin detalles') + '</p>');
                                    messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                }
                            });
                        });

                        Promise.all(promesas).then(() => {
                            console.log('Todas las retroalimentaciones detalladas procesadas.');

                            if (actividadData.grade < 7) {
                                var promptRefuerzo = `
                                    Eres un tutor virtual especializado en Análisis y Diseño de Software. Un estudiante obtuvo una calificación de ${actividadData.grade} en un cuestionario (escala 0-10). Propón una actividad de refuerzo para mejorar en los temas de las preguntas incorrectas:

                                    ${actividadData.preguntasIncorrectas.map((pregunta, index) => `
                                    Pregunta ${index + 1} (Número ${pregunta.numero}): ${pregunta.pregunta}
                                    Respuesta seleccionada: ${pregunta.respuestaSeleccionada} (incorrecta)
                                    Respuesta correcta: ${pregunta.respuestaCorrecta}
                                    `).join('\n')}

                                    Identifica los temas de los errores y propone una actividad práctica y breve (máximo 200 palabras) que aborde todos los temas. Comienza con "¡Vamos a reforzar tus conocimientos!" and usa un tono motivador. No menciones libros ni materiales externos.
                                `;

                                console.log('Prompt para actividad de refuerzo:', promptRefuerzo);

                                $.ajax({
                                    url: API_tutor, // Usar variable para endpoint de generación
                                    method: 'POST',
                                    contentType: 'application/json',
                                    data: JSON.stringify({
                                        instruccion: "Proporciona una actividad de refuerzo basada en los errores del estudiante.",
                                        entrada: promptRefuerzo,
                                        max_nuevos_tokens: 256
                                    }),
                                    success: function (response) {
                                        console.log('Respuesta de la API /generar (refuerzo):', response);

                                        if (response.respuesta) {
                                            var actividadFormateada = response.respuesta.replace(/\n/g, '<br>');
                                            var mensaje = `<p><strong>Tutor:</strong><br><strong>Actividad de refuerzo:</strong><br>${actividadFormateada}</p>`;
                                            messagesDiv.append(mensaje);
                                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                        } else {
                                            messagesDiv.append('<p><strong>Tutor:</strong> Error: No se pudo generar la actividad de refuerzo.</p>');
                                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                        }
                                    },
                                    error: function (xhr, status, error) {
                                        console.log('Error al obtener actividad de refuerzo:', { xhr, status, error, responseText: xhr.responseText });
                                        messagesDiv.append('<p><strong>Tutor:</strong> Error al generar actividad de refuerzo: ' + error + ' (Código: ' + xhr.status + ') - ' + (xhr.responseText || 'Sin detalles') + '</p>');
                                        messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                                    }
                                });
                            }
                        }).catch(error => {
                            console.log('Error al procesar retroalimentaciones detalladas:', error);
                            messagesDiv.append('<p><strong>Tutor:</strong> Error al procesar retroalimentaciones: ' + error + '</p>');
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
                        success: function (response) {
                            console.log('Respuesta de la API /generar (tarea):', response);

                            if (response.respuesta) {
                                var retroalimentacionFormateada = response.respuesta.replace(/\n/g, '<br>');
                                var mensaje = `<p><strong>Tutor:</strong> Hola ${actividadData.name}, aquí tienes la retroalimentación para "${actividadData.actividad}":<br>${retroalimentacionFormateada}</p>`;
                                messagesDiv.append(mensaje);
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            } else {
                                messagesDiv.append('<p><strong>Tutor:</strong> Error: Respuesta inválida de la API.</p>');
                                messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                            }
                        },
                        error: function (xhr, status, error) {
                            console.log('Error al obtener retroalimentación de tarea:', { xhr, status, error, responseText: xhr.responseText });
                            messagesDiv.append('<p><strong>Tutor:</strong> Error al obtener retroalimentación: ' + error + ' (Código: ' + xhr.status + ') - ' + (xhr.responseText || 'Sin detalles') + '</p>');
                            messagesDiv.scrollTop(messagesDiv[0].scrollHeight);
                        }
                    });
                }
            }

            // Ejecutar la obtención de retroalimentación al cargar el bloque
            obtenerRetroalimentacion();
        }
    };
});