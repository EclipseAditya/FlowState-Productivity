#!/usr/bin/env python3
"""
Generate dummy data for FlowState application
"""
from datetime import datetime, timedelta
import random
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, init_db
from backend import models, schemas

# Initialize database
init_db()
db = SessionLocal()

# Clear existing data
print("Clearing existing data...")
db.query(models.Session).delete()
db.query(models.Task).delete()
db.commit()

# Task properties
task_titles = [
    "Create project plan", "Design user interface", "Implement login system", 
    "Write documentation", "Set up CI/CD pipeline", "Fix navigation bug",
    "Optimize database queries", "Add dark theme", "Update dependencies",
    "Review pull requests", "Write unit tests", "Improve error handling", 
    "Refactor legacy code", "Create user manual", "Deploy to production",
    "Conduct user testing", "Fix browser compatibility issues", "Add export feature",
    "Improve accessibility", "Security audit", "Performance optimization"
]

task_descriptions = [
    "Outline project goals, timeline, and resources needed",
    "Create wireframes and mockups for the application interface",
    "Implement secure authentication and authorization system",
    "Document API endpoints and usage instructions",
    "Set up continuous integration and deployment workflow",
    "Fix issues with navigation in mobile view",
    "Optimize slow database queries for better performance",
    "Implement dark theme for better user experience",
    "Update all dependencies to latest versions",
    "Review and approve pending pull requests",
    "Write comprehensive unit tests for core functionality",
    "Improve error handling and user-friendly error messages",
    "Clean up and modernize legacy code sections",
    "Create comprehensive user documentation",
    "Deploy latest version to production servers",
    "Conduct usability testing with real users",
    "Fix rendering issues in different browsers",
    "Add ability to export data in various formats",
    "Ensure application meets accessibility standards",
    "Perform thorough security audit of codebase",
    "Identify and fix performance bottlenecks"
]

statuses = ["pending", "in_progress", "completed"]
priorities = ["low", "medium", "high"]

# Generate tasks
print("Generating tasks...")
tasks = []

# Today's date
today = datetime.now()

# Create 20 tasks with various statuses, priorities, and dates
for i in range(20):
    # Randomize task attributes
    title = task_titles[i % len(task_titles)]
    description = task_descriptions[i % len(task_descriptions)]
    
    # Distribute statuses: 40% pending, 30% in progress, 30% completed
    status_weights = [0.4, 0.3, 0.3]
    status = random.choices(statuses, weights=status_weights)[0]
    
    # Distribute priorities: 30% low, 40% medium, 30% high
    priority_weights = [0.3, 0.4, 0.3]
    priority = random.choices(priorities, weights=priority_weights)[0]
    
    # Create due dates between 7 days ago and 14 days in the future
    days_offset = random.randint(-7, 14)
    due_date = today + timedelta(days=days_offset)
    
    # Create task
    task_data = {
        "title": title,
        "description": description,
        "status": status,
        "priority": priority,
        "due_date": due_date
    }
    
    db_task = models.Task(**task_data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    tasks.append(db_task)
    print(f"Added task: {db_task.title} (ID: {db_task.id})")

# Generate sessions
print("\nGenerating sessions...")
for i in range(30):
    # Random task or None (some sessions might not be associated with tasks)
    task = random.choice(tasks) if random.random() > 0.2 else None
    task_id = task.id if task else None
    
    # Create session dates between 14 days ago and today
    days_ago = random.randint(0, 14)
    session_date = today - timedelta(days=days_ago)
    
    # Random duration between 10 and 120 minutes (in seconds)
    duration = random.randint(10, 120) * 60
    
    # Create notes for some sessions
    notes = None
    if random.random() > 0.7:
        notes_options = [
            "Made good progress", 
            "Got stuck on implementation", 
            "Completed key features",
            "Researched alternative approaches",
            "Fixed major bugs",
            "Documentation complete"
        ]
        notes = random.choice(notes_options)
    
    # Create session
    session_data = {
        "task_id": task_id,
        "duration": duration,
        "notes": notes,
        "start_time": session_date,
        "end_time": session_date + timedelta(seconds=duration),
        "is_completed": True
    }
    
    db_session = models.Session(**session_data)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    task_info = f"(Task: {task.title})" if task else "(No task)"
    duration_min = duration // 60
    print(f"Added session: {session_date.strftime('%Y-%m-%d %H:%M')} - {duration_min} min {task_info}")

print("\nDummy data generation complete!")
print(f"- {len(tasks)} tasks created")
print(f"- 30 sessions created")

db.close() 