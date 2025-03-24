// sessions.js - Handles focus session functionality

// Session state
let sessionState = {
    active: false,
    paused: false,
    startTime: null,
    pauseTime: null,
    totalPausedTime: 0,
    elapsedTime: 0,
    intervalId: null,
    
    // Multi-task tracking
    activeTasks: [],
    
    // Mode settings
    mode: 'standard', // 'standard' or 'pomodoro'
    pomodoroPhase: 'focus', // 'focus' or 'break'
    pomodoroCount: 0,
    
    // Pomodoro timers
    focusDuration: 25 * 60, // 25 minutes in seconds
    shortBreakDuration: 5 * 60, // 5 minutes in seconds
    longBreakDuration: 15 * 60, // 15 minutes in seconds
    pomodorosUntilLongBreak: 4,
    currentPhaseDuration: 25 * 60, // Default to focus duration
    
    // Break management
    breakActive: false,
    breakStartTime: null,
    breakElapsedTime: 0,
    breakIntervalId: null,
    
    // Stats
    breaksTaken: 0,
    totalFocusTime: 0,
    totalBreakTime: 0
};

// Initialize sessions module
function initSessions() {
    console.log('Sessions module initialized');
    
    // Set up event listeners for main session controls
    document.getElementById('start-session-btn').addEventListener('click', startSession);
    document.getElementById('pause-session-btn').addEventListener('click', pauseSession);
    document.getElementById('resume-session-btn').addEventListener('click', resumeSession);
    document.getElementById('end-session-btn').addEventListener('click', endSession);
    
    // Set up event listeners for break management
    document.getElementById('start-break-btn').addEventListener('click', startBreak);
    document.getElementById('skip-break-btn').addEventListener('click', skipBreak);
    document.getElementById('end-break-btn').addEventListener('click', endBreak);
    
    // Set up task management in session
    document.getElementById('add-task-to-session').addEventListener('click', addTaskToSession);
    
    // Set up timer mode selection
    const timerModeSelect = document.getElementById('timer-mode');
    timerModeSelect.addEventListener('change', function(e) {
        sessionState.mode = e.target.value;
        updateUIForMode(sessionState.mode);
    });
    
    // Load session history
    loadSessionHistory();
    
    // Load settings
    loadSessionSettings();
}

// Load session settings from application settings
async function loadSessionSettings() {
    try {
        // We'll use the settings API to get the configured durations
        let settings;
        
        if (window.electron) {
            settings = await window.electron.invoke('get-settings');
        } else {
            // Use fetch API for web
            const res = await fetch('http://localhost:8000/api/settings/');
            if (!res.ok) throw new Error(`Failed to load settings: ${res.status}`);
            settings = await res.json();
        }
        
        // Update session state with settings
        if (settings) {
            sessionState.focusDuration = (settings.pomodoro_duration || 25) * 60;
            sessionState.shortBreakDuration = (settings.break_duration || 5) * 60;
            sessionState.longBreakDuration = (settings.long_break_duration || 15) * 60;
            
            console.log('Loaded session settings:', {
                focusDuration: sessionState.focusDuration,
                shortBreakDuration: sessionState.shortBreakDuration,
                longBreakDuration: sessionState.longBreakDuration
            });
        }
    } catch (error) {
        console.error('Error loading session settings:', error);
        // Continue with defaults if there's an error
    }
}

// Update UI based on timer mode
function updateUIForMode(mode) {
    const pomodoroStats = document.getElementById('pomodoro-stats');
    const breakManagement = document.querySelector('.break-management');
    
    if (mode === 'pomodoro') {
        pomodoroStats.classList.add('visible');
        breakManagement.classList.add('visible');
        
        // Update session state for pomodoro
        sessionState.currentPhaseDuration = sessionState.focusDuration;
        sessionState.pomodoroPhase = 'focus';
        
        // Update UI
        updatePomodoroUI();
    } else {
        pomodoroStats.classList.remove('visible');
        breakManagement.classList.remove('visible');
    }
}

// Update Pomodoro UI elements
function updatePomodoroUI() {
    // Update pomodoro stats
    document.getElementById('pomodoros-completed').textContent = sessionState.pomodoroCount;
    document.getElementById('breaks-taken').textContent = sessionState.breaksTaken;
    
    // Calculate and update focus ratio
    const totalTime = sessionState.totalFocusTime + sessionState.totalBreakTime;
    const focusRatio = totalTime > 0 ? Math.round((sessionState.totalFocusTime / totalTime) * 100) : 0;
    document.getElementById('focus-ratio').textContent = `${focusRatio}%`;
    
    // Update mode display
    const currentMode = document.getElementById('current-mode');
    if (sessionState.pomodoroPhase === 'focus') {
        currentMode.textContent = 'Focus';
        currentMode.parentElement.className = 'session-mode focus';
    } else {
        currentMode.textContent = 'Break';
        currentMode.parentElement.className = 'session-mode break';
    }
}

// Initialize the active tasks list
function initializeActiveTasksList() {
    const activeTasksList = document.getElementById('active-tasks-list');
    if (!activeTasksList) return;
    
    if (sessionState.activeTasks.length === 0) {
        activeTasksList.innerHTML = '<li class="empty-state">No tasks selected</li>';
    } else {
        renderActiveTasksList();
    }
}

// Render the list of tasks currently being tracked in this session
function renderActiveTasksList() {
    const activeTasksList = document.getElementById('active-tasks-list');
    if (!activeTasksList) return;
    
    activeTasksList.innerHTML = '';
    
    sessionState.activeTasks.forEach(task => {
        const taskItem = document.createElement('li');
        taskItem.className = 'active-task-item';
        taskItem.innerHTML = `
            <span>${task.title}</span>
            <button class="remove-task" data-id="${task.id}">×</button>
        `;
        activeTasksList.appendChild(taskItem);
        
        // Add event listener to remove button
        const removeBtn = taskItem.querySelector('.remove-task');
        removeBtn.addEventListener('click', () => removeTaskFromSession(task.id));
    });
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
            console.log('Fetching sessions from API...');
            const res = await fetch('http://localhost:8000/api/sessions/');
            if (!res.ok) {
                const errorText = await res.text();
                console.error('Error response:', res.status, errorText);
                throw new Error(`API returned ${res.status}: ${errorText}`);
            }
            response = await res.json();
            console.log('Sessions loaded:', response);
        }
        
        renderSessionHistory(response);
    } catch (error) {
        console.error('Error loading session history:', error);
        showNotification('Failed to load session history: ' + error.message, 'error');
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
        const date = new Date(session.start_time);
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
        
        // Determine session mode
        let sessionMode = session.mode || 'Standard';
        if (session.notes && session.notes.includes('Mode: Pomodoro')) {
            sessionMode = 'Pomodoro';
        }
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${taskName}</td>
            <td>${formattedDuration}</td>
            <td>${sessionMode}</td>
            <td>${session.notes ? formatSessionNotes(session.notes) : '-'}</td>
        `;
        
        sessionsTableBody.appendChild(row);
    });
}

// Format session notes for display
function formatSessionNotes(notes) {
    // If notes contain multiple tasks, format them nicely
    if (notes.includes('Tasks worked on:')) {
        // Split into sections
        const parts = notes.split('Tasks worked on:');
        const basicInfo = parts[0].trim();
        const tasksList = parts[1].trim();
        
        // Format as HTML
        return `
            <div class="session-notes">
                <div class="basic-info">${basicInfo.replace(/\n/g, '<br>')}</div>
                <div class="tasks-list">
                    <strong>Tasks worked on:</strong>
                    ${tasksList.replace(/- /g, '• ').replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
    }
    
    // Otherwise, just replace newlines with <br>
    return notes.replace(/\n/g, '<br>');
}

// Get human-readable time format from seconds
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${secs}s`;
}

// Start a new focus session
function startSession() {
    // Check if a task is selected
    const taskSelect = document.getElementById('session-task');
    const taskId = taskSelect ? taskSelect.value : null;
    
    // If task is selected, add it to active tasks
    if (taskId && taskId !== '') {
        const selectedTask = window.tasks ? window.tasks.find(t => t.id == taskId) : null;
        
        if (selectedTask && !sessionState.activeTasks.some(t => t.id == taskId)) {
            sessionState.activeTasks.push(selectedTask);
            renderActiveTasksList();
        }
    }
    
    // Set timer mode and phase
    const timerMode = document.getElementById('timer-mode').value;
    sessionState.mode = timerMode;
    
    if (timerMode === 'pomodoro') {
        sessionState.pomodoroPhase = 'focus';
        sessionState.currentPhaseDuration = sessionState.focusDuration;
        updatePomodoroUI();
    }
    
    // Update session state
    sessionState.active = true;
    sessionState.paused = false;
    sessionState.startTime = new Date();
    sessionState.pauseTime = null;
    sessionState.totalPausedTime = 0;
    sessionState.elapsedTime = 0;
    
    // Start the timer
    sessionState.intervalId = setInterval(updateTimer, 1000);
    
    // Update UI
    document.getElementById('start-session-btn').disabled = true;
    document.getElementById('pause-session-btn').disabled = false;
    document.getElementById('resume-session-btn').disabled = true;
    document.getElementById('end-session-btn').disabled = false;
    document.getElementById('session-status').textContent = 'Session in progress';
    
    // Enable break button if in pomodoro mode
    if (timerMode === 'pomodoro') {
        document.getElementById('start-break-btn').disabled = false;
    }
    
    // Disable task selection during the session
    if (taskSelect) {
        taskSelect.disabled = true;
    }
    
    // Disable mode selection during session
    document.getElementById('timer-mode').disabled = true;
    
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
    
    // Clear the intervals
    clearInterval(sessionState.intervalId);
    if (sessionState.breakIntervalId) {
        clearInterval(sessionState.breakIntervalId);
    }
    
    // Calculate the final duration
    let endTime;
    if (sessionState.paused) {
        endTime = sessionState.pauseTime;
    } else {
        endTime = new Date();
    }
    
    const totalSeconds = Math.floor((endTime - sessionState.startTime) / 1000) - sessionState.totalPausedTime;
    
    // Update stats for pomodoro mode
    if (sessionState.mode === 'pomodoro') {
        sessionState.totalFocusTime += totalSeconds;
    }
    
    // Create session data
    const sessionData = {
        duration: totalSeconds,
        task_id: sessionState.activeTasks.length > 0 ? sessionState.activeTasks[0].id : null,
        notes: generateSessionNotes(),
        mode: sessionState.mode,
        pomodoro_count: sessionState.pomodoroCount,
        breaks_taken: sessionState.breaksTaken
    };
    
    try {
        // Save the session
        if (window.electron) {
            await window.electron.invoke('add-session', sessionData);
        } else {
            console.log('Saving session data:', sessionData);
            const response = await fetch('http://localhost:8000/api/sessions/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                console.error(`Server error (${response.status}):`, errorData);
                throw new Error(`Server returned ${response.status}: ${errorData}`);
            }
            
            const result = await response.json();
            console.log('Session saved:', result);
        }
        
        // Reset session state
        resetSessionState();
        
        // Update UI
        updateSessionUI();
        
        // Show notification
        showNotification('Session completed and saved', 'success');
        
        // Reload session history
        await loadSessionHistory();
        
    } catch (error) {
        console.error('Error saving session:', error);
        showNotification(`Failed to save session: ${error.message}`, 'error');
    }
}

// Reset session state to defaults
function resetSessionState() {
    sessionState = {
        active: false,
        paused: false,
        startTime: null,
        pauseTime: null,
        totalPausedTime: 0,
        elapsedTime: 0,
        intervalId: null,
        
        activeTasks: [],
        
        mode: document.getElementById('timer-mode').value,
        pomodoroPhase: 'focus',
        pomodoroCount: 0,
        
        focusDuration: sessionState.focusDuration,
        shortBreakDuration: sessionState.shortBreakDuration,
        longBreakDuration: sessionState.longBreakDuration,
        pomodorosUntilLongBreak: 4,
        currentPhaseDuration: sessionState.focusDuration,
        
        breakActive: false,
        breakStartTime: null,
        breakElapsedTime: 0,
        breakIntervalId: null,
        
        breaksTaken: 0,
        totalFocusTime: 0,
        totalBreakTime: 0
    };
}

// Update session UI after state changes
function updateSessionUI() {
    // Reset main session controls
    document.getElementById('start-session-btn').disabled = false;
    document.getElementById('pause-session-btn').disabled = true;
    document.getElementById('resume-session-btn').disabled = true;
    document.getElementById('end-session-btn').disabled = true;
    document.getElementById('timer-display').textContent = '00:00:00';
    document.getElementById('session-status').textContent = 'Ready to start';
    
    // Reset break controls
    document.getElementById('start-break-btn').disabled = true;
    document.getElementById('skip-break-btn').disabled = true;
    document.getElementById('end-break-btn').disabled = true;
    document.getElementById('break-status').textContent = 'No active break';
    document.getElementById('break-timer').textContent = '00:00';
    
    // Enable task selection
    const taskSelect = document.getElementById('session-task');
    if (taskSelect) {
        taskSelect.disabled = false;
        taskSelect.value = '';
    }
    
    // Enable mode selection
    document.getElementById('timer-mode').disabled = false;
    
    // Reset active tasks list
    initializeActiveTasksList();
    
    // Update pomodoro UI if in pomodoro mode
    if (sessionState.mode === 'pomodoro') {
        updatePomodoroUI();
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
    
    // For pomodoro mode, check if it's time for a break
    if (sessionState.mode === 'pomodoro' && sessionState.pomodoroPhase === 'focus') {
        // Display remaining time
        const remainingSeconds = sessionState.focusDuration - elapsedSeconds;
        if (remainingSeconds >= 0) {
            const remainingMinutes = Math.floor(remainingSeconds / 60);
            const remainingSecs = remainingSeconds % 60;
            const remainingTime = `${remainingMinutes}:${String(remainingSecs).padStart(2, '0')}`;
            document.getElementById('time-remaining').textContent = `(${remainingTime} remaining)`;
        }
        
        // Check if pomodoro interval is complete
        if (elapsedSeconds >= sessionState.focusDuration) {
            // Pause the timer
            pauseSession();
            
            // Suggest a break
            showNotification('Pomodoro complete! Time for a break.', 'success');
            
            // Start a break automatically
            startBreak();
        }
    }
}

// Utility function to show notifications
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

// Start a break
function startBreak() {
    if (sessionState.breakActive) return;
    
    // Pause the main session if it's active
    if (sessionState.active && !sessionState.paused) {
        pauseSession();
    }
    
    // Set break state
    sessionState.breakActive = true;
    sessionState.breakStartTime = new Date();
    sessionState.breakElapsedTime = 0;
    
    // Determine break duration based on Pomodoro technique
    let breakDuration = sessionState.shortBreakDuration;
    
    if (sessionState.mode === 'pomodoro') {
        // Check if it's time for a long break
        if (sessionState.pomodoroCount > 0 && sessionState.pomodoroCount % sessionState.pomodorosUntilLongBreak === 0) {
            breakDuration = sessionState.longBreakDuration;
            showNotification('Time for a long break!', 'info');
        } else {
            showNotification('Time for a short break!', 'info');
        }
    }
    
    // Start the break timer
    sessionState.breakIntervalId = setInterval(updateBreakTimer, 1000);
    
    // Update UI
    document.getElementById('start-break-btn').disabled = true;
    document.getElementById('skip-break-btn').disabled = false;
    document.getElementById('end-break-btn').disabled = false;
    document.getElementById('break-status').textContent = 'Break in progress';
    
    // Update pomodoro UI if in pomodoro mode
    if (sessionState.mode === 'pomodoro') {
        sessionState.pomodoroPhase = 'break';
        updatePomodoroUI();
    }
    
    // Show random break suggestion
    showBreakSuggestion();
    
    // Show notification
    showNotification('Break started', 'info');
}

// Skip the current break
function skipBreak() {
    if (!sessionState.breakActive) return;
    
    endBreak(true);
    showNotification('Break skipped', 'info');
}

// End the current break
function endBreak(skipped = false) {
    if (!sessionState.breakActive) return;
    
    // Clear the break interval
    clearInterval(sessionState.breakIntervalId);
    
    // Calculate break duration
    const breakDuration = skipped ? 0 : Math.floor((new Date() - sessionState.breakStartTime) / 1000);
    
    // Update stats
    sessionState.breaksTaken++;
    sessionState.totalBreakTime += breakDuration;
    
    // Reset break state
    sessionState.breakActive = false;
    sessionState.breakStartTime = null;
    sessionState.breakElapsedTime = 0;
    sessionState.breakIntervalId = null;
    
    // Update UI
    document.getElementById('start-break-btn').disabled = false;
    document.getElementById('skip-break-btn').disabled = true;
    document.getElementById('end-break-btn').disabled = true;
    document.getElementById('break-status').textContent = 'Break ended';
    document.getElementById('break-timer').textContent = '00:00';
    
    // If in pomodoro mode, increment pomodoro count and update phase
    if (sessionState.mode === 'pomodoro') {
        sessionState.pomodoroCount++;
        sessionState.pomodoroPhase = 'focus';
        updatePomodoroUI();
    }
    
    // Show notification
    if (!skipped) {
        showNotification('Break ended', 'success');
    }
}

// Update the break timer display
function updateBreakTimer() {
    if (!sessionState.breakActive) return;
    
    // Calculate elapsed time
    const now = new Date();
    const elapsedSeconds = Math.floor((now - sessionState.breakStartTime) / 1000);
    sessionState.breakElapsedTime = elapsedSeconds;
    
    // Format the time
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    const formattedTime = 
        String(minutes).padStart(2, '0') + ':' + 
        String(seconds).padStart(2, '0');
    
    // Update the display
    document.getElementById('break-timer').textContent = formattedTime;
    
    // For pomodoro breaks, check if the break should end automatically
    if (sessionState.mode === 'pomodoro') {
        const breakDuration = (sessionState.pomodoroCount > 0 && 
                             sessionState.pomodoroCount % sessionState.pomodorosUntilLongBreak === 0) 
                            ? sessionState.longBreakDuration 
                            : sessionState.shortBreakDuration;
        
        // If the break time is up, end it automatically
        if (elapsedSeconds >= breakDuration) {
            endBreak();
            
            // Prompt user to start next pomodoro
            showNotification('Break time is up! Ready for the next pomodoro?', 'info');
        }
    }
}

// Show a random break suggestion
function showBreakSuggestion() {
    const suggestions = [
        "Stand up and stretch for a minute",
        "Take a short walk around your workspace",
        "Do some quick breathing exercises",
        "Get a glass of water",
        "Rest your eyes by looking at something far away",
        "Do some wrist and hand stretches",
        "Organize your desk quickly",
        "Do 10 jumping jacks to get your blood flowing",
        "Practice good posture for a moment",
        "Close your eyes and meditate for a minute"
    ];
    
    // Pick a random suggestion
    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    
    // Show a notification with the suggestion
    showNotification(`Break suggestion: ${suggestion}`, 'info');
}

// Add a task to the current session
function addTaskToSession() {
    const taskSelect = document.getElementById('session-task');
    const taskId = taskSelect ? taskSelect.value : null;
    
    if (!taskId || taskId === '') {
        showNotification('Please select a task first', 'error');
        return;
    }
    
    // Find the task in the global tasks array
    const selectedTask = window.tasks ? window.tasks.find(t => t.id == taskId) : null;
    
    if (!selectedTask) {
        showNotification('Task not found', 'error');
        return;
    }
    
    // Check if task is already added
    if (sessionState.activeTasks.some(t => t.id == taskId)) {
        showNotification('This task is already added to the session', 'info');
        return;
    }
    
    // Add task to active tasks
    sessionState.activeTasks.push(selectedTask);
    
    // Reset select value
    taskSelect.value = '';
    
    // Render the active tasks
    renderActiveTasksList();
    
    // Show notification
    showNotification(`Task "${selectedTask.title}" added to session`, 'success');
}

// Remove a task from the current session
function removeTaskFromSession(taskId) {
    // Remove the task from active tasks
    sessionState.activeTasks = sessionState.activeTasks.filter(task => task.id != taskId);
    
    // Render the updated list
    renderActiveTasksList();
    
    // If there are no tasks, show the empty state
    if (sessionState.activeTasks.length === 0) {
        document.getElementById('active-tasks-list').innerHTML = '<li class="empty-state">No tasks selected</li>';
    }
}

// Generate notes for the session record
function generateSessionNotes() {
    let notes = '';
    
    // Add information about the session mode
    notes += `Mode: ${sessionState.mode === 'pomodoro' ? 'Pomodoro' : 'Standard'}\n`;
    
    // For pomodoro, add stats
    if (sessionState.mode === 'pomodoro') {
        notes += `Pomodoros completed: ${sessionState.pomodoroCount}\n`;
        notes += `Breaks taken: ${sessionState.breaksTaken}\n`;
    }
    
    // Add information about tasks worked on
    if (sessionState.activeTasks.length > 0) {
        notes += '\nTasks worked on:\n';
        sessionState.activeTasks.forEach(task => {
            notes += `- ${task.title}\n`;
        });
    }
    
    return notes;
} 