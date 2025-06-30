/* eslint-disable brace-style */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable promise/always-return */
/* eslint-disable max-len */
define(['jquery', 'core/str'], function($, str) {
    // Definición de variables generales para las APIs
    const API_BD_TUTOR_BASE = 'http://localhost:8080/api/'; // Base URL para la API de base de datos (se añaden endpoints específicos)
    const API_tutor = 'http://localhost:8000/generar'; // API para generar respuestas del tutor

    // Función para esperar a que Chart.js esté disponible
    function waitForChart(callback) {
        if (typeof Chart !== 'undefined') {
            callback();
            return;
        }
        setTimeout(function() {
            waitForChart(callback);
        }, 100);
    }

    return {
        init: function() {
            var statisticsDiv = $('#statistics-content');
            var isLoading = false;
            // Eliminar lógica de toggle y solo cargar estadísticas automáticamente
            cargarEstadisticas();

            function cargarEstadisticas() {
                if (isLoading) {
                    return;
                }
                isLoading = true;
                // Obtener la cadena de idioma necesaria
                var strings = [
                    {key: 'no_data', component: 'block_tutor_statistics'}
                ];

                str.get_strings(strings).then(function(translations) {
                    var noDataString = translations[0];
                    waitForChart(function() {
                        // Obtener estadísticas desde la API
                        $.ajax({
                            url: `${API_BD_TUTOR_BASE}statistics`,
                            method: 'GET',
                            dataType: 'json',
                            success: function(statisticsResponse) {
                                $.ajax({
                                    url: `${API_BD_TUTOR_BASE}messages`,
                                    method: 'GET',
                                    dataType: 'json',
                                    success: function(messagesResponse) {
                                        // --- Eliminar cualquier gráfico/conclusión previo ---
                                        var topicChartContainer = $('#top-question-chart').parent();
                                        $('#top-question-chart').remove();
                                        $('#top-topic-chart').remove();
                                        statisticsDiv.find('.conclusion-container').remove();
                                        // Enviar todos los inputs al tutor para análisis de temas
                                        var inputMessages = messagesResponse.filter(function(msg) {
                                            return msg.message_type === 'input';
                                        });
                                        var allInputs = inputMessages.map(function(msg) { return msg.message_text; });
                                        var conclusionPrompt = `
                                            Actúa como un tutor virtual especializado en Responsabilidad Social Empresarial. Recibirás estadísticas y todas las preguntas realizadas por los estudiantes (inputs) en el siguiente formato JSON:
                                            {
                                                "top_user": { "userfullname": string, "total_messages": number },
                                                "total_messages": number,
                                                "peak_hour": { "hour_of_day": number, "message_count": number },
                                                "total_peak_hour_messages": number,
                                                "inputs": [string]
                                            }
                                            Analiza todas las preguntas y devuelve un objeto JSON con dos propiedades:
                                            - "temas": un array con los 3 temas principales a reforzar (solo nombres de temas, sin explicación, NO uses ejemplos genéricos ni repitas los del prompt, y NO repitas temas en el array).
                                            - "conclusion": una conclusión breve y elaborada en español (máximo 50 palabras) dirigida al profesor, explicando por qué reforzar esos temas en el curso, basada en el análisis real de las preguntas de los estudiantes.
                                            No incluyas datos personales ni preguntas exactas. No incluyas ejemplos de respuesta en tu salida.
                                        `;
                                        var tutorPayload = {
                                            top_user: statisticsResponse.top_user,
                                            total_messages: statisticsResponse.total_messages,
                                            peak_hour: statisticsResponse.peak_hour,
                                            total_peak_hour_messages: statisticsResponse.total_peak_hour_messages,
                                            inputs: allInputs
                                        };
                                        // --- Loader visual mientras el tutor analiza ---
                                        var loader = $('<div class="tutor-loader" style="margin:16px 0;text-align:center;font-style:italic;color:#28a745;">El tutor está analizando los datos...</div>');
                                        statisticsDiv.append(loader);
                                        $.ajax({
                                            url: API_tutor,
                                            method: 'POST',
                                            contentType: 'application/json',
                                            data: JSON.stringify({
                                                instruccion: conclusionPrompt,
                                                entrada: JSON.stringify(tutorPayload),
                                                max_nuevos_tokens: 256
                                            }),
                                            success: function(apiResponse) {
                                                isLoading = false;
                                                loader.remove();
                                                // Validar formato de respuesta
                                                var temas = Array.isArray(apiResponse.temas) ? apiResponse.temas : [];
                                                var conclusionText = typeof apiResponse.conclusion === 'string' ? apiResponse.conclusion : (apiResponse.respuesta || '');
                                                // Si no hay array de temas, intentar extraerlos del texto (mejorado para frases compuestas y saltos de línea)
                                                if (!temas.length && conclusionText) {
                                                    var match = conclusionText.match(/temas?:\s*([\w\s,;áéíóúÁÉÍÓÚüÜñÑ\-]+)(?:\.|\n|$)/i);
                                                    if (match && match[1]) {
                                                        temas = match[1]
                                                            .split(/,|;|\n|\r|\.|\u2022|\-/)
                                                            .map(function(t) { return t.trim(); })
                                                            .filter(Boolean);
                                                    }
                                                }
                                                // Si la respuesta viene como string JSON, parsearla correctamente
                                                if (!temas.length && conclusionText && conclusionText.trim().startsWith('{')) {
                                                    try {
                                                        var parsed = JSON.parse(conclusionText);
                                                        if (Array.isArray(parsed.temas)) {
                                                            temas = parsed.temas;
                                                        }
                                                        if (typeof parsed.conclusion === 'string') {
                                                            conclusionText = parsed.conclusion;
                                                        }
                                                    } catch (e) {
                                                        // Si falla el parseo, se mantiene el fallback
                                                    }
                                                }
                                                // Limitar a solo 3 temas
                                                if (temas.length > 3) {
                                                    temas = temas.slice(0, 3);
                                                }
                                                // Mostrar gráfico de temas SOLO con los datos del tutor
                                                topicChartContainer.find('#top-topic-chart').remove();
                                                topicChartContainer.append('<canvas id="top-topic-chart"></canvas>');
                                                var topTopicCanvas = document.getElementById('top-topic-chart');
                                                if (topTopicCanvas) {
                                                    var topTopicCtx = topTopicCanvas.getContext('2d');
                                                    new Chart(topTopicCtx, {
                                                        type: 'doughnut',
                                                        data: {
                                                            labels: temas.length ? temas : ['Sin temas detectados'],
                                                            datasets: [{
                                                                label: 'Temas a Reforzar',
                                                                data: temas.length ? temas.map(function() { return 1; }) : [1],
                                                                backgroundColor: ['#dc3545', '#007bff', '#28a745'],
                                                                borderColor: ['#c82333', '#0056b3', '#218838'],
                                                                borderWidth: 1
                                                            }]
                                                        },
                                                        options: {
                                                            plugins: {
                                                                legend: {
                                                                    position: 'bottom',
                                                                    labels: {
                                                                        font: {size: 13, weight: 'bold'}
                                                                    }
                                                                },
                                                                tooltip: {
                                                                    callbacks: {
                                                                        label: function(context) {
                                                                            return context.label;
                                                                        }
                                                                    }
                                                                }
                                                            },
                                                            animation: {
                                                                duration: 1200,
                                                                easing: 'easeOutQuart'
                                                            }
                                                        }
                                                    });
                                                }
                                                // Mostrar conclusión enfocada al profesor
                                                if (conclusionText) {
                                                    var temasList = temas.length ? temas.join(', ') : 'Sin temas detectados';
                                                    statisticsDiv.append(`
                                                        <div class="conclusion-container">
                                                            <h4>Recomendación para el Profesor/a</h4>
                                                            <p><strong>Profesor/a:</strong> Se recomienda reforzar los siguientes temas de Responsabilidad Social Empresarial: <b>${temasList}</b>.<br>Razón: ${conclusionText.replace(/\n/g, '<br>')}</p>
                                                        </div>
                                                    `);
                                                } else {
                                                    statisticsDiv.append('<p style="color:#c00;">No se pudo obtener una conclusión válida del tutor.</p>');
                                                }
                                            },
                                            error: function(xhr, status, error) {
                                                isLoading = false;
                                                loader.remove();
                                                statisticsDiv.append('<p style="color:#c00;">Error al generar la conclusión: ' + error + '</p>');
                                            }
                                        });
                                    },
                                    error: function(xhr, status, error) {
                                        isLoading = false;
                                        statisticsDiv.html('<p style="color:#c00;">Error al cargar los mensajes: ' + error + '</p>');
                                    }
                                });
                                // Gráfico para el usuario más activo (Pie Chart)
                                var topUserCtx = $('#top-user-chart')[0].getContext('2d');
                                if (statisticsResponse.top_user && statisticsResponse.total_messages > 0) {
                                    var topUserMessages = statisticsResponse.top_user.total_messages || 0;
                                    var otherMessages = statisticsResponse.total_messages - topUserMessages;
                                    new Chart(topUserCtx, {
                                        type: 'pie',
                                        data: {
                                            labels: [statisticsResponse.top_user.userfullname || 'Usuario Desconocido', 'Otros Usuarios'],
                                            datasets: [{
                                                label: 'Número de Mensajes',
                                                data: [topUserMessages, otherMessages],
                                                backgroundColor: ['#007bff', '#d3d3d3'],
                                                borderColor: ['#0056b3', '#a9a9a9'],
                                                borderWidth: 1
                                            }]
                                        },
                                        options: {
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                    labels: {
                                                        font: {size: 12}
                                                    }
                                                },
                                                tooltip: {
                                                    callbacks: {
                                                        label: function(context) {
                                                            return context.label + ': ' + context.raw + ' mensajes';
                                                        }
                                                    }
                                                }
                                            },
                                            animation: {
                                                duration: 1000,
                                                easing: 'easeOutQuart'
                                            }
                                        }
                                    });
                                } else {
                                    $('#top-user-chart').replaceWith('<p>' + noDataString + ' (Usuario Más Activo)</p>');
                                }

                                // Gráfico para la hora de mayor uso (Pie Chart)
                                var peakHourCtx = $('#peak-hour-chart')[0].getContext('2d');
                                if (statisticsResponse.peak_hour && statisticsResponse.total_peak_hour_messages > 0) {
                                    var peakHourMessages = statisticsResponse.peak_hour.message_count || 0;
                                    var otherHourMessages = statisticsResponse.total_peak_hour_messages - peakHourMessages;
                                    new Chart(peakHourCtx, {
                                        type: 'pie',
                                        data: {
                                            labels: ['Hora ' + statisticsResponse.peak_hour.hour_of_day, 'Otras Horas'],
                                            datasets: [{
                                                label: 'Mensajes en Hora Pico',
                                                data: [peakHourMessages, otherHourMessages],
                                                backgroundColor: ['#28a745', '#d3d3d3'],
                                                borderColor: ['#218838', '#a9a9a9'],
                                                borderWidth: 1
                                            }]
                                        },
                                        options: {
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                    labels: {
                                                        font: {size: 12}
                                                    }
                                                },
                                                tooltip: {
                                                    callbacks: {
                                                        label: function(context) {
                                                            return context.label + ': ' + context.raw + ' mensajes';
                                                        }
                                                    }
                                                }
                                            },
                                            animation: {
                                                duration: 1000,
                                                easing: 'easeOutQuart'
                                            }
                                        }
                                    });
                                } else {
                                    $('#peak-hour-chart').replaceWith('<p>' + noDataString + ' (Hora de Mayor Uso)</p>');
                                }
                            },
                            error: function(xhr, status, error) {
                                isLoading = false;
                                statisticsDiv.html('<p style="color:#c00;">Error al cargar las estadísticas: ' + error + '</p>');
                            }
                        });
                    });
                }).fail(function(error) {
                    isLoading = false;
                    statisticsDiv.html('<p style="color:#c00;">Error al cargar las estadísticas: No se pudieron cargar las traducciones.</p>');
                });
            }
        }
    };
});