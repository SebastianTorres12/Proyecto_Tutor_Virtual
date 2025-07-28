/* eslint-disable no-console */
/* eslint-disable complexity */
/* eslint-disable no-redeclare */
/* eslint-disable block-scoped-var */
/* eslint-disable @babel/object-curly-spacing */
/* eslint-disable promise/no-nesting */
/* eslint-disable brace-style */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable promise/always-return */
/* eslint-disable max-len */
define(['jquery', 'core/str'], function($, str) {
    // Definición de variables generales para las APIs
    const API_BD_TUTOR_BASE = 'http://localhost:8080/api/';
    const API_tutor = 'http://localhost:8000/generar';

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

    // Función para llamar a la API local
    function llamarAPITutor(instruccion, entrada, maxTokens) {
        return new Promise(function(resolve, reject) {
            $.ajax({
                url: API_tutor,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    instruccion: instruccion,
                    entrada: entrada,
                    max_nuevos_tokens: maxTokens || 256
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
                                            Actúa como un tutor virtual especializado en la enseñanza de Análisis y Diseño de Software. Recibirás estadísticas y todas las preguntas realizadas por los estudiantes (inputs) en el siguiente formato JSON:
                                            {
                                                "top_user": { "userfullname": string, "total_messages": number },
                                                "total_messages": number,
                                                "peak_hour": { "hour_of_day": number, "message_count": number },
                                                "total_peak_hour_messages": number,
                                                "inputs": [string]
                                            }
                                            Analiza todas las preguntas y responde SOLO con un objeto JSON válido, sin explicaciones ni formato adicional, con estas tres propiedades:
                                            - "temas": un array con los 3 temas generales principales a reforzar (por ejemplo, "Modelado UML", "Patrones de Diseño", "Metodologías de Desarrollo de Software", "Requisitos", "Arquitectura de Software", "Testing", etc. Elige los más representativos y evita temas demasiado específicos o repetidos).
                                            - "temasCount": un array con el número de mensajes detectados para cada tema, en el mismo orden que el array de temas (por ejemplo, [5, 3, 2]).
                                            - "conclusion": una conclusión breve y elaborada en español (máximo 50 palabras) dirigida al profesor, explicando por qué reforzar esos temas en el curso, basada en el análisis real de las preguntas de los estudiantes.
                                            No incluyas datos personales ni preguntas exactas. No incluyas ejemplos de respuesta en tu salida. NO uses formato Markdown ni listas, SOLO el JSON.
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
                                        llamarAPITutor(conclusionPrompt, JSON.stringify(tutorPayload), 256)
                                            .then(function(apiResponse) {
                                                isLoading = false;
                                                loader.remove();
                                                try {
                                                    var jsonString = apiResponse.respuesta;
                                                    // console.log('Respuesta del tutor (apiResponse.respuesta):', jsonString);
                                                    var temas = [];
                                                    var temasCount = [];
                                                    var conclusionText = '';
                                                    var trimmed = (typeof jsonString === 'string') ? jsonString.trim() : '';
                                                    // Si el string empieza con '{', intenta buscar la última '}' y parsear ese bloque
                                                    if (trimmed.startsWith('{')) {
                                                        var lastBrace = trimmed.lastIndexOf('}');
                                                        var jsonBlock = '';
                                                        if (lastBrace !== -1) {
                                                            jsonBlock = trimmed.substring(0, lastBrace + 1);
                                                        } else {
                                                            // Si no hay llave de cierre, la agregamos
                                                            jsonBlock = trimmed + '}';
                                                        }
                                                        try {
                                                            var parsed = JSON.parse(jsonBlock);
                                                            temas = Array.isArray(parsed.temas) ? parsed.temas : [];
                                                            temasCount = Array.isArray(parsed.temasCount) ? parsed.temasCount : [];
                                                            conclusionText = typeof parsed.conclusion === 'string' ? parsed.conclusion : '';
                                                        } catch (jsonError) {
                                                            statisticsDiv.append('<p style="color:#c00;">Error: El bloque JSON no se pudo parsear, incluso agregando la llave de cierre.</p>');
                                                            return;
                                                        }
                                                    } else {
                                                        var jsonMatch = (typeof jsonString === 'string') ? jsonString.match(/{[\s\S]*}/) : null;
                                                        if (jsonMatch) {
                                                            var cleanJson = jsonMatch[0];
                                                            var parsed = JSON.parse(cleanJson);
                                                            temas = Array.isArray(parsed.temas) ? parsed.temas : [];
                                                            temasCount = Array.isArray(parsed.temasCount) ? parsed.temasCount : [];
                                                            conclusionText = typeof parsed.conclusion === 'string' ? parsed.conclusion : '';
                                                        } else {
                                                            statisticsDiv.append('<p style="color:#c00;">Error: No se encontró bloque JSON en la respuesta del tutor.</p>');
                                                            return;
                                                        }
                                                    }
                                                } catch (e) {
                                                    statisticsDiv.append('<p style="color:#c00;">Error: No se pudo parsear la respuesta del tutor.</p>');
                                                    return;
                                                }
                                                // Limitar a solo 3 temas
                                                if (temas.length > 3) {
                                                    temas = temas.slice(0, 3);
                                                    temasCount = temasCount.slice(0, 3);
                                                }
                                                // Mostrar gráfico de temas SOLO con los datos del tutor
                                                topicChartContainer.find('#top-topic-chart').remove();
                                                topicChartContainer.append('<canvas id="top-topic-chart"></canvas>');
                                                var topTopicCanvas = document.getElementById('top-topic-chart');
                                                if (topTopicCanvas) {
                                                    var topTopicCtx = topTopicCanvas.getContext('2d');
                                                    // Paleta de colores ampliada
                                                    var palette = [
                                                        '#dc3545', '#007bff', '#28a745', '#ffc107', '#17a2b8', '#6610f2', '#fd7e14', '#6f42c1', '#20c997', '#e83e8c'
                                                    ];
                                                    var borderPalette = [
                                                        '#c82333', '#0056b3', '#218838', '#e0a800', '#117a8b', '#520dc2', '#e8590c', '#5a189a', '#198754', '#d63384'
                                                    ];
                                                    var colorCount = temas.length > 0 ? temas.length : 1;
                                                    var chartColors = palette.slice(0, colorCount);
                                                    var chartBorders = borderPalette.slice(0, colorCount);
                                                    // Los labels muestran el nombre y el conteo
                                                    var chartLabels = temas.length ? temas.map(function(t, i) { return t + ' (' + (temasCount[i] || 0) + ')'; }) : ['Sin temas detectados'];
                                                    new Chart(topTopicCtx, {
                                                        type: 'doughnut',
                                                        data: {
                                                            labels: chartLabels,
                                                            datasets: [{
                                                                label: 'Temas a Reforzar',
                                                                data: temasCount,
                                                                backgroundColor: chartColors,
                                                                borderColor: chartBorders,
                                                                borderWidth: 2
                                                            }]
                                                        },
                                                        options: {
                                                            plugins: {
                                                                legend: {
                                                                    position: 'bottom',
                                                                    labels: {
                                                                        font: {size: 10, weight: 'bold'}, // Reducido de 16 a 12
                                                                        color: '#222',
                                                                        padding: 12, // Reducido de 18 a 12
                                                                        boxWidth: 18 // Reducido de 22 a 18
                                                                    }
                                                                },
                                                                tooltip: {
                                                                    callbacks: {
                                                                        label: function(context) {
                                                                            var label = context.label || '';
                                                                            var value = context.raw || 0;
                                                                            return 'Tema: ' + label + ' - ' + value + ' mensajes';
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
                                                            <p><strong>Profesor/a:</strong> Se recomienda reforzar los siguientes temas: <b>${temasList}</b>.<br>Razón: ${conclusionText.replace(/\n/g, '<br>')}</p>
                                                        </div>
                                                    `);
                                                } else {
                                                    statisticsDiv.append('<p style="color:#c00;">No se pudo obtener una conclusión válida del tutor.</p>');
                                                }
                                            })
                                            .catch(function(error) {
                                                isLoading = false;
                                                loader.remove();
                                                statisticsDiv.append('<p style="color:#c00;">Error al generar la conclusión: ' + error.message + '</p>');
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