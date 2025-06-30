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
 * Realiza una solicitud a la API del tutor virtual.
 * @param {string} apiUrl - URL de la API del tutor
 * @param {string} instruccion - Instrucción para el tutor
 * @param {string} entrada - Mensaje o datos de entrada
 * @param {number} maxNuevosTokens - Límite de tokens
 * @returns {Promise<any>} - Promesa con la respuesta de la API
 */
function solicitarTutorVirtual(apiUrl, instruccion, entrada, maxNuevosTokens = 1000) {
    const $ = require('jquery');
    return new Promise((resolve, reject) => {
        $.ajax({
            url: apiUrl,
            method: 'POST',
            data: JSON.stringify({
                instruccion,
                entrada,
                max_nuevos_tokens: maxNuevosTokens
            }),
            contentType: 'application/json',
            success: function(response) {
                resolve(response);
            },
            error: function(xhr, status, error) {
                reject(error);
            }
        });
    });
}

module.exports = { esSaludoOMensajeIrrelevante, solicitarTutorVirtual };