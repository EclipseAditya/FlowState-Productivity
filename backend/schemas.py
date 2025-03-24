from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Task schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "pending"
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None

class Task(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Session schemas
class SessionBase(BaseModel):
    task_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    notes: Optional[str] = None
    is_completed: Optional[bool] = False
    mode: Optional[str] = "standard"  # 'standard' or 'pomodoro'
    pomodoro_count: Optional[int] = 0
    breaks_taken: Optional[int] = 0

class SessionCreate(SessionBase):
    pass

class SessionUpdate(SessionBase):
    pass

class Session(SessionBase):
    id: int

    class Config:
        orm_mode = True 