from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # Importar el middleware CORS
from pydantic import BaseModel
from unsloth import FastLanguageModel
import torch
from transformers import TextStreamer
import traceback

app = FastAPI(title="API de Modelo Afinado")

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost", 
        "http://192.168.67.76"],  # Permitir solicitudes desde Moodle
    allow_credentials=True,
    allow_methods=["*"],  # Permitir todos los métodos (GET, POST, etc.)
    allow_headers=["*"],  # Permitir todos los encabezados
)

class GenerationRequest(BaseModel):
    instruccion: str
    entrada: str = ""
    max_nuevos_tokens: int = 200

# Cargar el modelo y tokenizador
max_seq_length = 2048
dtype = None
load_in_4bit = True

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="lora_model_3Instruct_bnb_new",
    max_seq_length=max_seq_length,
    dtype=dtype,
    load_in_4bit=load_in_4bit,
)

FastLanguageModel.for_inference(model)

alpaca_prompt = """A continuación hay una instrucción que describe una tarea, junto con una entrada que proporciona más contexto. Escribe una respuesta que complete adecuadamente la solicitud.

### Instrucción:
{}

### Entrada:
{}

### Respuesta:
{}"""

@app.post("/generar")
async def generar_texto(request: GenerationRequest):
    try:
        prompt = alpaca_prompt.format(request.instruccion, request.entrada, "")
        inputs = tokenizer([prompt], return_tensors="pt").to("cuda")
        text_streamer = TextStreamer(tokenizer)
        outputs = model.generate(
            **inputs,
            max_new_tokens=request.max_nuevos_tokens,
            use_cache=True,
            streamer=text_streamer
        )
        texto_generado = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
        inicio_respuesta = texto_generado.find("### Respuesta:") + len("### Respuesta:\n")
        respuesta = texto_generado[inicio_respuesta:].strip()
        return {"respuesta": respuesta}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al generar texto: {str(e)}")

@app.get("/")
async def raiz():
    return {"mensaje": "La API está funcionando. Usa POST /generar para generar texto."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)