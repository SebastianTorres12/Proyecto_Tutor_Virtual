from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import models
from database import SessionLocal, engine

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir solicitudes desde cualquier origen
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class UserCreate(BaseModel):
    user_id: int
    username: str
    role: str
    userfullname: Optional[str] = None

class UserResponse(BaseModel):
    user_id: int
    username: str
    role: str
    userfullname: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    user_id: int
    message_type: str
    message_text: str

class MessageResponse(BaseModel):
    message_id: int
    user_id: int
    message_type: str
    message_text: str
    sent_at: datetime

    class Config:
        from_attributes = True

class StatisticsResponse(BaseModel):
    top_user: Optional[dict] = None
    total_messages: Optional[int] = None
    peak_hour: Optional[dict] = None
    total_peak_hour_messages: Optional[int] = None
    top_question: Optional[dict] = None
    total_questions: Optional[int] = None

@app.post("/api/users/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.user_id == user.user_id).first()
    if db_user:
        return {"message": "User already exists"}
    
    new_user = models.User(
        user_id=user.user_id,
        username=user.username,
        role=user.role,
        userfullname=user.userfullname
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/api/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return users

@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/api/messages/save")
def save_message(message: MessageCreate, db: Session = Depends(get_db)):
    new_message = models.Message(
        user_id=message.user_id,
        message_type=message.message_type,
        message_text=message.message_text
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    return {"message": "Message saved successfully", "message_id": new_message.message_id}

@app.get("/api/messages", response_model=List[MessageResponse])
def get_messages(db: Session = Depends(get_db)):
    messages = db.query(models.Message).all()
    return messages

@app.get("/api/statistics", response_model=StatisticsResponse)
def get_statistics(db: Session = Depends(get_db)):
    # Top user with userfullname
    top_user_query = (
        db.query(models.User.userfullname, func.count(models.Message.message_id).label('total_messages'))
        .join(models.Message, models.User.user_id == models.Message.user_id)
        .group_by(models.User.user_id, models.User.userfullname)
        .order_by(func.count(models.Message.message_id).desc())
        .first()
    )
    top_user = None
    if top_user_query:
        top_user = {
            "userfullname": top_user_query.userfullname,
            "total_messages": top_user_query.total_messages
        }

    # Total messages
    total_messages_query = db.query(func.count(models.Message.message_id)).scalar()
    total_messages = total_messages_query if total_messages_query is not None else 0

    # Peak hour
    peak_hour_query = (
        db.query(
            extract('hour', models.Message.sent_at).label('hour_of_day'),
            func.count(models.Message.message_id).label('message_count')
        )
        .group_by(extract('hour', models.Message.sent_at))
        .order_by(func.count(models.Message.message_id).desc())
        .first()
    )
    peak_hour = None
    if peak_hour_query:
        peak_hour = {
            "hour_of_day": int(peak_hour_query.hour_of_day),
            "message_count": peak_hour_query.message_count
        }

    # Total messages grouped by hour (for peak hour comparison)
    total_peak_hour_messages_query = db.query(func.count(models.Message.message_id)).scalar()
    total_peak_hour_messages = total_peak_hour_messages_query if total_peak_hour_messages_query is not None else 0

    # Top question
    top_question_query = (
        db.query(models.Message.message_text, func.count(models.Message.message_id).label('frequency'))
        .filter(models.Message.message_type == 'input')
        .group_by(models.Message.message_text)
        .order_by(func.count(models.Message.message_id).desc())
        .first()
    )
    top_question = None
    if top_question_query:
        top_question = {
            "message_text": top_question_query.message_text,
            "frequency": top_question_query.frequency
        }

    # Total questions (messages of type 'input')
    total_questions_query = db.query(func.count(models.Message.message_id)).filter(models.Message.message_type == 'input').scalar()
    total_questions = total_questions_query if total_questions_query is not None else 0

    return {
        "top_user": top_user,
        "total_messages": total_messages,
        "peak_hour": peak_hour,
        "total_peak_hour_messages": total_peak_hour_messages,
        "top_question": top_question,
        "total_questions": total_questions
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)