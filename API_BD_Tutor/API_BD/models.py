from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "Users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True)
    role = Column(String(50))
    userfullname = Column(String(100), nullable=True)  # Nuevo campo para el nombre completo
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "ChatMessages"

    message_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    message_type = Column(String(20))
    message_text = Column(Text)
    sent_at = Column(DateTime, default=datetime.utcnow)