import uvicorn
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import json
from datetime import datetime, timedelta

# Local imports
from . import models, schemas
from .database import SessionLocal, engine, init_db

# Create tables
init_db()

app = FastAPI(title="FlowState API", description="API for FlowState productivity application")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development. In production, specify your domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API routes
@app.get("/")
def read_root():
    return {"message": "Welcome to FlowState API"}

# Task endpoints
@app.post("/tasks/", response_model=schemas.Task, status_code=status.HTTP_201_CREATED)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.get("/tasks/", response_model=List[schemas.Task])
def read_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    tasks = db.query(models.Task)
    
    if status:
        tasks = tasks.filter(models.Task.status == status)
    if priority:
        tasks = tasks.filter(models.Task.priority == priority)
        
    return tasks.all()

@app.get("/tasks/{task_id}", response_model=schemas.Task)
def read_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@app.put("/tasks/{task_id}", response_model=schemas.Task)
def update_task(task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update task attributes
    for key, value in task.dict(exclude_unset=True).items():
        setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task

@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(db_task)
    db.commit()
    return {"detail": "Task deleted"}

# Session endpoints
@app.post("/sessions/", response_model=schemas.Session, status_code=status.HTTP_201_CREATED)
def create_session(session: schemas.SessionCreate, db: Session = Depends(get_db)):
    db_session = models.Session(**session.dict())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@app.get("/sessions/", response_model=List[schemas.Session])
def read_sessions(db: Session = Depends(get_db)):
    return db.query(models.Session).all()

@app.get("/sessions/{session_id}", response_model=schemas.Session)
def read_session(session_id: int, db: Session = Depends(get_db)):
    db_session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return db_session

@app.put("/sessions/{session_id}", response_model=schemas.Session)
def update_session(session_id: int, session: schemas.SessionUpdate, db: Session = Depends(get_db)):
    db_session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update session attributes
    for key, value in session.dict(exclude_unset=True).items():
        setattr(db_session, key, value)
    
    db.commit()
    db.refresh(db_session)
    return db_session

# Statistics endpoints
@app.get("/statistics/")
def get_statistics(db: Session = Depends(get_db)):
    # Get all tasks
    tasks = db.query(models.Task).all()
    
    # Get all sessions
    sessions = db.query(models.Session).all()
    
    # Calculate statistics
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == "completed"])
    
    # Calculate total focus time (in minutes)
    total_focus_time = sum(s.duration for s in sessions if s.duration) if sessions else 0
    
    # Calculate average session duration
    avg_session_duration = total_focus_time / len(sessions) if sessions else 0
    
    # Calculate productivity score (percentage of completed tasks)
    productivity_score = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Get sessions for the last 7 days
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    sessions_by_day = {(today - timedelta(days=i)).strftime('%Y-%m-%d'): 0 for i in range(7)}
    
    for session in sessions:
        session_date = session.start_time.date()
        if session_date >= week_ago and session_date <= today:
            date_str = session_date.strftime('%Y-%m-%d')
            if date_str in sessions_by_day:
                sessions_by_day[date_str] += session.duration if session.duration else 0
    
    # Return statistics
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "total_focus_time": total_focus_time,
        "avg_session_duration": avg_session_duration,
        "productivity_score": productivity_score,
        "sessions_by_day": sessions_by_day
    }

# Settings endpoints
@app.get("/settings/")
def get_settings():
    # Check if settings file exists, if not create default settings
    settings_file = os.path.join(os.path.dirname(__file__), "settings.json")
    
    if not os.path.exists(settings_file):
        default_settings = {
            "notification_enabled": True,
            "theme": "light",
            "pomodoro_duration": 25,
            "break_duration": 5
        }
        
        with open(settings_file, "w") as f:
            json.dump(default_settings, f)
        
        return default_settings
    
    # Read settings from file
    with open(settings_file, "r") as f:
        settings = json.load(f)
    
    return settings

@app.post("/settings/")
def update_settings(settings: dict):
    # Save settings to file
    settings_file = os.path.join(os.path.dirname(__file__), "settings.json")
    
    with open(settings_file, "w") as f:
        json.dump(settings, f)
    
    return settings

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 