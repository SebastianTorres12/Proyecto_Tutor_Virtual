// Extrae los temas principales y la conclusión de la respuesta del tutor
function extraerTemasYConclusion(apiResponse) {
    let temas = Array.isArray(apiResponse.temas) ? apiResponse.temas : [];
    let conclusionText = typeof apiResponse.conclusion === 'string' ? apiResponse.conclusion : (apiResponse.respuesta || '');
    // Si no hay array de temas, intentar extraerlos del texto
    if (!temas.length && conclusionText) {
        var match = conclusionText.match(/temas?:\s*([\w\s,áéíóúÁÉÍÓÚüÜñÑ-]+)/i);
        if (match && match[1]) {
            temas = match[1].split(',').map(function(t) { return t.trim(); }).filter(Boolean);
        }
    }
    return {
        temas,
        conclusion: conclusionText
    };
}

module.exports = { extraerTemasYConclusion };
