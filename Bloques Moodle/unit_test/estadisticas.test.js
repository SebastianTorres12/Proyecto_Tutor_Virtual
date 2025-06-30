const { extraerTemasYConclusion } = require('./estadisticas-utils');

describe('extraerTemasYConclusion', () => {
    it('extrae temas y conclusión cuando vienen en campos separados', () => {
        const apiResponse = {
            temas: ['Ética empresarial', 'Sostenibilidad', 'Responsabilidad social interna'],
            conclusion: 'Se recomienda reforzar los temas de ética empresarial, sostenibilidad y responsabilidad social interna.'
        };
        const resultado = extraerTemasYConclusion(apiResponse);
        expect(resultado.temas).toEqual(['Ética empresarial', 'Sostenibilidad', 'Responsabilidad social interna']);
        expect(resultado.conclusion).toContain('Se recomienda reforzar');
    });

    it('extrae temas del texto si no hay array de temas', () => {
        const apiResponse = {
            respuesta: 'Temas: Ética empresarial, Sostenibilidad, Responsabilidad social interna. Se recomienda reforzar estos temas.'
        };
        const resultado = extraerTemasYConclusion(apiResponse);
        expect(resultado.temas).toEqual(['Ética empresarial', 'Sostenibilidad', 'Responsabilidad social interna']);
        expect(resultado.conclusion).toContain('Se recomienda reforzar');
    });

    it('devuelve temas vacío y conclusión vacía si no hay datos', () => {
        const apiResponse = {};
        const resultado = extraerTemasYConclusion(apiResponse);
        expect(resultado.temas).toEqual([]);
        expect(resultado.conclusion).toBe('');
    });
});
