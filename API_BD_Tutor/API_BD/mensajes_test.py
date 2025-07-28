import pytest
from fastapi.testclient import TestClient
import main

@pytest.fixture
def client():
    return TestClient(main.app)

def test_guardar_y_consultar_mensaje(client):
    # Datos simulados para guardar un mensaje
    mensaje = {
        "user_id": 1,
        "message_type": "input",
        "message_text": "Mensaje de prueba para guardar"
    }
    # Guardar el mensaje
    response = client.post("/api/messages/save", json=mensaje)
    assert response.status_code == 200
    data = response.json()
    assert "message_id" in data
    # Consultar todos los mensajes
    response_get = client.get("/api/messages")
    assert response_get.status_code == 200
    mensajes = response_get.json()
    # Verificar que el mensaje guardado está en la lista
    assert any(m["message_text"] == mensaje["message_text"] for m in mensajes)
