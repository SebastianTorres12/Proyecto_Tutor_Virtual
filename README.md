# Tutor Virtual para Análisis y Diseño de Software

## Descripción
El Tutor Virtual es una herramienta basada en inteligencia artificial diseñada para apoyar a estudiantes y profesores de la asignatura de Análisis y Diseño de Software en la Universidad de las Fuerzas Armadas ESPE. Integrado en la plataforma Moodle, ofrece un chat en tiempo real, retroalimentación personalizada en tareas y cuestionarios, análisis de desempeño para estudiantes y estadísticas con recomendaciones para profesores. Este proyecto fue desarrollado por Edwin David Cantuña Morales y Sebastián Paúl Torres Tapia como parte de su tesis.

## Características Principales
- **Chat en Tiempo Real**: Permite a los estudiantes resolver dudas sobre temas como UML, patrones de diseño y metodologías ágiles sin temor a preguntar.
- **Retroalimentación Personalizada**: Proporciona mejoras específicas en tareas y cuestionarios, basada en datos validados por el profesor.
- **Análisis de Desempeño**: Muestra a los estudiantes su progreso y sugerencias de estudio.
- **Estadísticas y Recomendaciones**: Ofrece a los profesores datos como el usuario más activo y los temas más consultados, con recomendaciones para ajustar el curso.

## Tecnologías Utilizadas
- **LLaMA 3B-Instruct**: Modelo de IA afinado con QLoRA para respuestas contextuales.
- **FastAPI**: Framework para APIs escalables que manejan solicitudes concurrentes.
- **MariaDB**: Base de datos para almacenar interacciones y estadísticas.
- **Moodle**: Plataforma de integración con bloques laterales personalizados.
- **CUDA 12.8**: Soporte para procesamiento en GPUs.

## Requisitos
- Acceso a Moodle con credenciales válidas (estudiante o profesor).
- Navegador web actualizado (Chrome 90+ o Firefox 88+).
- Conexión a internet estable.
- Hardware recomendado: 4 GB de RAM mínimo.

## Instalación
1. Clona este repositorio: `https://github.com/SebastianTorres12/Proyecto_Tutor_Virtual.git`.
2. Configura un entorno virtual: `python -m venv venv` y activa con `source venv/bin/activate` (Linux) o `venv\Scripts\activate` (Windows).
3. Instala dependencias: `pip install -r requirements.txt`.
4. Configura las variables de entorno para la API y la base de datos en un archivo `.env`.
5. Inicia la API: `python main.py`.
6. Integra el tutor en Moodle a través de los plugins proporcionados (contacta al administrador).

## Uso
- **Estudiantes**: Accede al bloque lateral en Moodle para chat, retroalimentación y análisis.
- **Profesores**: Usa el panel de estadísticas para monitorear y ajustar el curso.
- Consulta el [Manual de Usuario](Manual_Usuario_Tutor_Virtual.pdf) para instrucciones detalladas.

## Contribuciones
Agradecemos cualquier contribución. Por favor, abre un issue o envía un pull request con tus mejoras.

## Licencia
Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.

## Contacto
Para soporte o preguntas, contacta a Edwin (edwin.cantuna@espe.edu.ec) o Sebastián (sebastian.torres@espe.edu.ec).

## Estado
Última actualización: 11 de agosto de 2025, 08:51 PM -05.
