from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import logging
import traceback

app = FastAPI(title="API NVIDIA Llama 8b Instruct",)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NVIDIA_API_URL = '*************************'
NVIDIA_API_KEY = '*******************************************************'

logging.basicConfig(level=logging.INFO, force=True)

class GenerationRequest(BaseModel):
    instruccion: str
    entrada: str = ""
    max_nuevos_tokens: int = 1024
    stream: bool = False

@app.post("/generar")
async def generar(request: GenerationRequest):
    payload = {
        "model": "meta/llama3-8b-instruct",
        "messages": [
            {"role": "user", "content": request.instruccion + (f"\n{request.entrada}" if request.entrada else "")}
        ],
        "temperature": 0.5,
        "top_p": 1,
        "max_tokens": request.max_nuevos_tokens,
        "stream": request.stream
    }

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }

    logging.info(f"Payload enviado a NVIDIA API: {payload}")

    try:
        response = requests.post(NVIDIA_API_URL + '/chat/completions', json=payload, headers=headers)
        logging.info(f"Respuesta cruda de NVIDIA API: {response.text}")
        response.raise_for_status()
        result = response.json()
        if result.get('choices') and len(result['choices']) > 0:
            content = result['choices'][0]['message']['content']
            return {"respuesta": content}
        else:
            raise HTTPException(status_code=500, detail="Respuesta inválida de la API")
    except Exception as e:
        logging.error("Error en la petición a NVIDIA API")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al generar texto: {str(e)}")

@app.get("/")
async def raiz():
    return {"mensaje": "La API NVIDIA Llama3 está funcionando. Usa POST /generar para generar texto."}
