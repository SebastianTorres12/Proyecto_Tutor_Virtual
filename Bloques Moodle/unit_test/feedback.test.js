const { analizarPreguntasCuestionario, generarRetroalimentacionActividad } = require('./feedback-utils');

describe('analizarPreguntasCuestionario', () => {
    it('debe extraer preguntas incorrectas correctamente', () => {
        const attemptData = {
            questions: [
                {
                    html: '<div class="qtext">¿Qué es RSE?</div>' +
                          '<input checked="checked"><div class="flex-fill ms-1">Respuesta A</div>' +
                          '<div class="rightanswer">La respuesta correcta es: Respuesta B</div>' +
                          '<div class="flex-fill ms-1">Respuesta A</div><div class="flex-fill ms-1">Respuesta B</div>',
                    questionnumber: 1,
                    status: 'Incorrecta',
                    state: 'gradedwrong'
                },
                {
                    html: '<div class="qtext">¿Qué es ética empresarial?</div>' +
                          '<input checked="checked"><div class="flex-fill ms-1">Respuesta Correcta</div>' +
                          '<div class="rightanswer">La respuesta correcta es: Respuesta Correcta</div>' +
                          '<div class="flex-fill ms-1">Respuesta Correcta</div><div class="flex-fill ms-1">Respuesta Incorrecta</div>',
                    questionnumber: 2,
                    status: 'Correcta',
                    state: 'gradedright'
                }
            ]
        };
        const resultado = analizarPreguntasCuestionario(attemptData);
        expect(resultado.length).toBe(1);
        expect(resultado[0].pregunta).toContain('¿Qué es RSE?');
        expect(resultado[0].respuestaSeleccionada).toBe('Respuesta A');
        expect(resultado[0].respuestaCorrecta).toBe('Respuesta B');
        expect(resultado[0].opciones).toEqual(['Respuesta A', 'Respuesta B']);
        expect(resultado[0].estado).toBe('Incorrecta');
    });

    it('debe devolver un array vacío si no hay preguntas incorrectas', () => {
        const attemptData = {
            questions: [
                {
                    html: '<div class="qtext">¿Qué es RSE?</div>' +
                          '<input checked="checked"><div class="flex-fill ms-1">Respuesta Correcta</div>' +
                          '<div class="rightanswer">La respuesta correcta es: Respuesta Correcta</div>' +
                          '<div class="flex-fill ms-1">Respuesta Correcta</div><div class="flex-fill ms-1">Respuesta Incorrecta</div>',
                    questionnumber: 1,
                    status: 'Correcta',
                    state: 'gradedright'
                }
            ]
        };
        const resultado = analizarPreguntasCuestionario(attemptData);
        expect(resultado).toEqual([]);
    });
});

describe('generarRetroalimentacionActividad', () => {
    it('genera retroalimentación simulada para cuestionario con preguntas incorrectas', () => {
        const actividadData = {
            tipo: 'quiz',
            attemptData: {
                questions: [
                    {
                        html: '<div class="qtext">¿Qué es RSE?</div>' +
                              '<input checked="checked"><div class="flex-fill ms-1">Respuesta A</div>' +
                              '<div class="rightanswer">La respuesta correcta es: Respuesta B</div>' +
                              '<div class="flex-fill ms-1">Respuesta A</div><div class="flex-fill ms-1">Respuesta B</div>',
                        questionnumber: 1,
                        status: 'Incorrecta',
                        state: 'gradedwrong'
                    }
                ]
            }
        };
        const retro = generarRetroalimentacionActividad(actividadData);
        expect(retro).toContain('Retroalimentación simulada para cuestionario: 1 preguntas incorrectas.');
    });

    it('genera retroalimentación simulada para cuestionario sin preguntas incorrectas', () => {
        const actividadData = {
            tipo: 'quiz',
            attemptData: {
                questions: [
                    {
                        html: '<div class="qtext">¿Qué es ética empresarial?</div>' +
                              '<input checked="checked"><div class="flex-fill ms-1">Respuesta Correcta</div>' +
                              '<div class="rightanswer">La respuesta correcta es: Respuesta Correcta</div>' +
                              '<div class="flex-fill ms-1">Respuesta Correcta</div><div class="flex-fill ms-1">Respuesta Incorrecta</div>',
                        questionnumber: 2,
                        status: 'Correcta',
                        state: 'gradedright'
                    }
                ]
            }
        };
        const retro = generarRetroalimentacionActividad(actividadData);
        expect(retro).toContain('¡Felicidades! Respondiste todas las preguntas correctamente.');
    });

    it('genera retroalimentación simulada para tarea', () => {
        const actividadData = {
            tipo: 'assign',
            title: 'Ensayo sobre RSE'
        };
        const retro = generarRetroalimentacionActividad(actividadData);
        expect(retro).toContain('Retroalimentación simulada para tarea: Ensayo sobre RSE.');
    });

    it('devuelve mensaje para tipo de actividad no soportado', () => {
        const actividadData = {
            tipo: 'otro'
        };
        const retro = generarRetroalimentacionActividad(actividadData);
        expect(retro).toBe('Tipo de actividad no soportado.');
    });
});
