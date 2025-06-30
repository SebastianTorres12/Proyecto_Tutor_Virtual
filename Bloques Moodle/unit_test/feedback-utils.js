function analizarPreguntasCuestionario(attemptData) {
    var preguntasIncorrectas = [];
    if (!attemptData.questions || attemptData.questions.length === 0) {
        return preguntasIncorrectas;
    }
    attemptData.questions.forEach(question => {
        var preguntaMatch = question.html.match(/<div class="qtext">(.*?)<\/div>/is);
        var pregunta = preguntaMatch ? preguntaMatch[1] : 'No se pudo extraer la pregunta';
        var numeroPregunta = question.questionnumber || 'Desconocido';
        var estado = question.status || 'Desconocido';
        var estadoInterno = question.state || 'unknown';
        var respuestaSeleccionadaMatch = question.html.match(/<input[^>]+checked="checked"[^>]*>.*?<div class="flex-fill ms-1">([^<]+)<\/div>/is);
        var respuestaSeleccionada = respuestaSeleccionadaMatch ? respuestaSeleccionadaMatch[1] : 'No se pudo extraer la respuesta seleccionada';
        var respuestaCorrectaMatch = question.html.match(/<div class="rightanswer">La respuesta correcta es: ([^<]+)<\/div>/is);
        var respuestaCorrecta = respuestaCorrectaMatch ? respuestaCorrectaMatch[1] : 'No se pudo extraer la respuesta correcta';
        var opciones = [];
        var opcionesMatches = question.html.matchAll(/<div class="flex-fill ms-1">([^<]+)<\/div>/gis);
        for (let match of opcionesMatches) {
            opciones.push(match[1]);
        }
        // Filtrar duplicados manteniendo el orden
        opciones = opciones.filter((item, idx) => opciones.indexOf(item) === idx);
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
    return preguntasIncorrectas;
}

// Simula el envío al tutor y la generación de retroalimentación
function simularEnvioAlTutor(tipo, datos) {
    if (tipo === 'quiz') {
        if (datos.preguntasIncorrectas && datos.preguntasIncorrectas.length > 0) {
            return `Retroalimentación simulada para cuestionario: ${datos.preguntasIncorrectas.length} preguntas incorrectas.`;
        } else {
            return '¡Felicidades! Respondiste todas las preguntas correctamente.';
        }
    } else if (tipo === 'assign') {
        return `Retroalimentación simulada para tarea: ${datos.title || 'Sin título'}.`;
    }
    return 'Tipo de actividad no soportado.';
}

// Lógica principal para decidir el tipo de actividad y generar retroalimentación
function generarRetroalimentacionActividad(actividadData) {
    if (actividadData.tipo === 'quiz') {
        const preguntasIncorrectas = analizarPreguntasCuestionario(actividadData.attemptData);
        return simularEnvioAlTutor('quiz', { preguntasIncorrectas });
    } else if (actividadData.tipo === 'assign') {
        // Aquí podrías agregar lógica adicional para tareas si lo necesitas
        return simularEnvioAlTutor('assign', actividadData);
    }
    return 'Tipo de actividad no soportado.';
}

module.exports = { analizarPreguntasCuestionario, generarRetroalimentacionActividad };
