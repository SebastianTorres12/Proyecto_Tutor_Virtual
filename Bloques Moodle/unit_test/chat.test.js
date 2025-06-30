// chat_test.js

if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

const $ = require('jquery');
const { JSDOM } = require('jsdom');
const { solicitarTutorVirtual } = require('./chat-utils');

// Simula el DOM necesario para el chat
const dom = new JSDOM(`<!DOCTYPE html><body>
  <div id="chat-messages"></div>
  <form id="chat-form"><input id="chat-input" /><button type="submit">Enviar</button></form>
  <button id="btn-iniciar-escaneo"></button>
</body>`);
global.window = dom.window;
global.document = dom.window.document;
global.$ = $(dom.window);

// Mock de AJAX para evitar llamadas reales
$.ajax = jest.fn((options) => {
  if (options.url.includes('generar')) {
    // Simula respuesta de la API del tutor
    setTimeout(() => {
      options.success && options.success({ respuesta: 'Respuesta simulada del tutor virtual.' });
    }, 0);
  } else {
    setTimeout(() => {
      options.success && options.success({});
    }, 0);
  }
});

describe('chat-utils', () => {
  it('solicitarTutorVirtual responde correctamente', async () => {
    const apiUrl = 'http://localhost:8000/generar';
    const instruccion = 'Instrucción de prueba';
    const entrada = 'Mensaje de prueba';
    const respuesta = await solicitarTutorVirtual(apiUrl, instruccion, entrada, 1000);
    expect(respuesta.respuesta).toBe('Respuesta simulada del tutor virtual.');
  });
});