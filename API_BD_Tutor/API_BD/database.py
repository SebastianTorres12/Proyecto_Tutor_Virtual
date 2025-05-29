from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configuración de la conexión a MariaDB
DATABASE_URL = "mysql+pymysql://tutoruser:tutorpassword@localhost/tutor_db"

# Crear el motor de SQLAlchemy
engine = create_engine(DATABASE_URL, echo=True)

# Crear una fábrica de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para los modelos
Base = declarative_base()

# Dependencia para obtener una sesión de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()