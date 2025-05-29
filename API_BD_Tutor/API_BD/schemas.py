from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    user_id: int
    username: str
    role: str

class MessageCreate(BaseModel):
    user_id: int
    message_type: str
    message_text: str

class StatisticsResponse(BaseModel):
    top_user: Optional[dict] = None
    peak_hour: Optional[dict] = None
    top_question: Optional[dict] = None