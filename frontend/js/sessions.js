// sessions.js - Handles focus session functionality

// Session state
let sessionState = {
    active: false,
    paused: false,
    startTime: null,
    pauseTime: null,
    totalPausedTime: 0,
    taskId: null,
    elapsedTime: 0,
    intervalId: null
};

// Initialize sessions module
function initSessions() {
    console.log('Sessions module initialized');
    
    // Set up event listeners
    document.getElementById('start-session-btn').addEventListener('click', startSession);
    document.getElementById('pause-session-btn').addEventListener('click', pauseSession);
    document.getElementById('resume-session-btn').addEventListener('click', resumeSession);
    document.getElementById('end-session-btn').addEventListener('click', endSession);
    
    // Load session history
    loadSessionHistory();
}

// Load session history from API
async function loadSessionHistory() {
    try {
        let response;
        
        // Check if we're in Electron or web environment
        if (window.electron) {
            response = await window.electron.invoke('get-sessions');
        } else {
            // Use fetch API for web version
            const res = await fetch('http://localhost:8000/api/sessions');
            response = await res.json();
        }
        
        renderSessionHistory(response);
    } catch (error) {
        console.error('Error loading session history:', error);
        showNotification('Failed to load session history', 'error');
    }
}

// Render session history
function renderSessionHistory(sessions) {
    const sessionsTableBody = document.getElementById('sessions-table-body');
    const noSessionsMessage = document.getElementById('no-sessions-message');
    
    if (!sessionsTableBody) return;
    
    sessionsTableBody.innerHTML = '';
    
    if (sessions.length === 0) {
        if (noSessionsMessage) noSessionsMessage.style.display = 'block';
        return;
    }
    
    if (noSessionsMessage) noSessionsMessage.style.display = 'none';
    
    sessions.forEach(session => {
        const row = document.createElement('tr');
        
        // Format the date
        const date = new Date(session.created_at);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Format the duration
        const hours = Math.floor(session.duration / 3600);
        const minutes = Math.floor((session.duration % 3600) / 60);
        const seconds = session.duration % 60;
        const formattedDuration = `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
        
        // Get task name if available
        let taskName = 'No task';
        if (session.task_id) {
            const task = window.tasks ? window.tasks.find(t => t.id == session.task_id) : null;
            if (task) {
                taskName = task.title;
            } else {
                taskName = `Task #${session.task_id}`;
            }
        }
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${taskName}</td>
            <td>${formattedDuration}</td>
            <td>${session.notes || '-'}</td>
        `;
        
        sessionsTableBody.appendChild(row);
    });
}

// Start a new focus session
function startSession() {
    // Check if a task is selected
    const taskSelect = document.getElementById('session-task');
    const taskId = taskSelect ? taskSelect.value : null;
    
    // Update session state
    sessionState = {
        active: true,
        paused: false,
        startTime: new Date(),
        pauseTime: null,
        totalPausedTime: 0,
        taskId: taskId,
        elapsedTime: 0,
        intervalId: null
    };
    
    // Start the timer
    sessionState.intervalId = setInterval(updateTimer, 1000);
    
    // Update UI
    document.getElementById('start-session-btn').disabled = true;
    document.getElementById('pause-session-btn').disabled = false;
    document.getElementById('end-session-btn').disabled = false;
    document.getElementById('session-status').textContent = 'Session in progress';
    
    // Disable task selection during the session
    if (taskSelect) {
        taskSelect.disabled = true;
    }
    
    // Show notification
    showNotification('Focus session started', 'success');
}

// Pause the current session
function pauseSession() {
    if (!sessionState.active || sessionState.paused) return;
    
    // Update session state
    sessionState.paused = true;
    sessionState.pauseTime = new Date();
    
    // Clear the interval
    clearInterval(sessionState.intervalId);
    
    // Update UI
    document.getElementById('pause-session-btn').disabled = true;
    document.getElementById('resume-session-btn').disabled = false;
    document.getElementById('session-status').textContent = 'Session paused';
    
    // Show notification
    showNotification('Session paused', 'info');
}

// Resume the paused session
function resumeSession() {
    if (!sessionState.active || !sessionState.paused) return;
    
    // Calculate the time spent in pause
    const pauseDuration = (new Date() - sessionState.pauseTime) / 1000;
    sessionState.totalPausedTime += pauseDuration;
    
    // Update session state
    sessionState.paused = false;
    sessionState.pauseTime = null;
    
    // Restart the timer
    sessionState.intervalId = setInterval(updateTimer, 1000);
    
    // Update UI
    document.getElementById('pause-session-btn').disabled = false;
    document.getElementById('resume-session-btn').disabled = true;
    document.getElementById('session-status').textContent = 'Session in progress';
    
    // Show notification
    showNotification('Session resumed', 'success');
}

// End the current session
async function endSession() {
    if (!sessionState.active) return;
    
    // Clear the interval
    clearInterval(sessionState.intervalId);
    
    // Calculate the final duration
    let endTime;
    if (sessionState.paused) {
        endTime = sessionState.pauseTime;
    } else {
        endTime = new Date();
    }
    
    const totalSeconds = Math.floor((endTime - sessionState.startTime) / 1000) - sessionState.totalPausedTime;
    
    // Create session data
    const sessionData = {
        duration: totalSeconds,
        task_id: sessionState.taskId,
        notes: ''
    };
    
    try {
        // Save the session
        if (window.electron) {
            await window.electron.invoke('add-session', sessionData);
        } else {
            await fetch('http://localhost:8000/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });
        }
        
        // Reset session state
        sessionState = {
            active: false,
            paused: false,
            startTime: null,
            pauseTime: null,
            totalPausedTime: 0,
            taskId: null,
            elapsedTime: 0,
            intervalId: null
        };
        
        // Update UI
        document.getElementById('start-session-btn').disabled = false;
        document.getElementById('pause-session-btn').disabled = true;
        document.getElementById('resume-session-btn').disabled = true;
        document.getElementById('end-session-btn').disabled = true;
        document.getElementById('timer-display').textContent = '00:00:00';
        document.getElementById('session-status').textContent = 'Ready to start';
        
        // Enable task selection
        const taskSelect = document.getElementById('session-task');
        if (taskSelect) {
            taskSelect.disabled = false;
            taskSelect.value = '';
        }
        
        // Show notification
        showNotification('Session completed and saved', 'success');
        
        // Reload session history
        await loadSessionHistory();
        
    } catch (error) {
        console.error('Error saving session:', error);
        showNotification('Failed to save session', 'error');
    }
}

// Update the timer display
function updateTimer() {
    if (!sessionState.active || sessionState.paused) return;
    
    // Calculate the elapsed time
    const now = new Date();
    const elapsedSeconds = Math.floor((now - sessionState.startTime) / 1000) - sessionState.totalPausedTime;
    sessionState.elapsedTime = elapsedSeconds;
    
    // Format the time
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    
    const formattedTime = 
        String(hours).padStart(2, '0') + ':' + 
        String(minutes).padStart(2, '0') + ':' + 
        String(seconds).padStart(2, '0');
    
    // Update the display
    document.getElementById('timer-display').textContent = formattedTime;
}

// Utility function to show notifications (same as in tasks.js)
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
        
        // Add styles if not already in CSS
        const style = document.createElement('style');
        style.textContent = `
            #notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 24px;
                border-radius: 4px;
                color: white;
                font-weight: 500;
                z-index: 9999;
                transform: translateY(-100px);
                transition: transform 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            #notification.visible {
                transform: translateY(0);
            }
            #notification.success {
                background-color: #4CAF50;
            }
            #notification.error {
                background-color: #F44336;
            }
            #notification.info {
                background-color: #2196F3;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Set notification content and type
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Show notification
    notification.classList.add('visible');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('visible');
    }, 3000);
} 