// statistics.js - Handles statistics and data visualization

// Charts instances
let focusDistributionChart;
let taskCompletionChart;
let tasksPriorityChart;
let tasksStatusChart;
let focusTimeChart;

// Initialize statistics module
function initStatistics() {
    console.log('Statistics module initialized');
    
    // Load statistics data
    loadStatisticsData();
}

// Load statistics data from API
async function loadStatisticsData() {
    try {
        // First, get tasks and sessions data
        let tasksData, sessionsData;
        
        if (window.electron) {
            // Use Electron IPC
            tasksData = await window.electron.invoke('get-tasks');
            sessionsData = await window.electron.invoke('get-sessions');
        } else {
            // Use fetch API for web version
            const tasksRes = await fetch('http://localhost:8000/api/tasks');
            tasksData = await tasksRes.json();
            
            const sessionsRes = await fetch('http://localhost:8000/api/sessions');
            sessionsData = await sessionsRes.json();
        }
        
        // Process and display the statistics
        processStatistics(tasksData, sessionsData);
        
    } catch (error) {
        console.error('Error loading statistics data:', error);
        showNotification('Failed to load statistics data', 'error');
    }
}

// Process and display statistics
function processStatistics(tasks, sessions) {
    // Update summary statistics
    updateSummaryStatistics(tasks, sessions);
    
    // Create or update charts
    createFocusDistributionChart(sessions);
    createTaskCompletionChart(tasks);
    createTasksPriorityChart(tasks);
    createTasksStatusChart(tasks);
    createFocusTimeChart(sessions);
}

// Update summary statistics
function updateSummaryStatistics(tasks, sessions) {
    // Calculate average session duration
    const avgSessionDuration = document.getElementById('avg-session-duration');
    if (avgSessionDuration && sessions.length > 0) {
        const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
        const average = totalDuration / sessions.length;
        const minutes = Math.floor(average / 60);
        avgSessionDuration.textContent = `${minutes} minutes`;
    }
    
    // Calculate total focus time
    const totalFocusTime = document.getElementById('total-focus-time');
    if (totalFocusTime) {
        const totalSeconds = sessions.reduce((sum, session) => sum + session.duration, 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        totalFocusTime.textContent = `${hours} hours ${minutes} minutes`;
    }
    
    // Calculate task completion rate
    const taskCompletionRate = document.getElementById('task-completion-rate');
    if (taskCompletionRate && tasks.length > 0) {
        const completedTasks = tasks.filter(task => task.status === 'completed').length;
        const rate = Math.round((completedTasks / tasks.length) * 100);
        taskCompletionRate.textContent = `${rate}%`;
    }
    
    // Update dashboard stats
    const completedTasksCount = document.getElementById('completed-tasks-count');
    const totalTasksCount = document.getElementById('total-tasks-count');
    const focusTimeElement = document.getElementById('focus-time');
    const productivityRateElement = document.getElementById('productivity-rate');
    
    if (completedTasksCount) {
        const completed = tasks.filter(task => task.status === 'completed').length;
        completedTasksCount.textContent = completed;
    }
    
    if (totalTasksCount) {
        totalTasksCount.textContent = tasks.length;
    }
    
    if (focusTimeElement) {
        const totalSeconds = sessions.reduce((sum, session) => sum + session.duration, 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        focusTimeElement.textContent = `${hours}h ${minutes}m`;
    }
    
    if (productivityRateElement && tasks.length > 0) {
        const completedTasks = tasks.filter(task => task.status === 'completed').length;
        const rate = Math.round((completedTasks / tasks.length) * 100);
        productivityRateElement.textContent = `${rate}%`;
    }
}

// Create focus time distribution chart
function createFocusDistributionChart(sessions) {
    const ctx = document.getElementById('focus-distribution-chart');
    if (!ctx) return;
    
    // Group sessions by day of week
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const sessionsByDay = Array(7).fill(0);
    
    sessions.forEach(session => {
        const date = new Date(session.created_at);
        const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        sessionsByDay[dayIndex] += session.duration;
    });
    
    // Convert seconds to hours
    const hoursPerDay = sessionsByDay.map(seconds => Math.round(seconds / 3600 * 10) / 10);
    
    // Destroy previous chart if it exists
    if (focusDistributionChart) {
        focusDistributionChart.destroy();
    }
    
    // Create new chart
    focusDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: daysOfWeek,
            datasets: [{
                label: 'Focus Hours',
                data: hoursPerDay,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Focus Time by Day of Week'
                }
            }
        }
    });
}

// Create task completion chart
function createTaskCompletionChart(tasks) {
    const ctx = document.getElementById('task-completion-chart');
    if (!ctx) return;
    
    // Get tasks completed per day over the last 7 days
    const last7Days = [];
    const completedPerDay = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const tasksCompletedOnDay = tasks.filter(task => {
            if (!task.updated_at || task.status !== 'completed') return false;
            
            const taskDate = new Date(task.updated_at);
            return taskDate >= date && taskDate < nextDate;
        }).length;
        
        last7Days.push(date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
        completedPerDay.push(tasksCompletedOnDay);
    }
    
    // Destroy previous chart if it exists
    if (taskCompletionChart) {
        taskCompletionChart.destroy();
    }
    
    // Create new chart
    taskCompletionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Tasks Completed',
                data: completedPerDay,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Tasks Completed Per Day'
                }
            }
        }
    });
}

// Create tasks by priority chart
function createTasksPriorityChart(tasks) {
    const ctx = document.getElementById('tasks-priority-chart');
    if (!ctx) return;
    
    // Count tasks by priority
    const priorityCounts = {
        low: tasks.filter(task => task.priority === 'low').length,
        medium: tasks.filter(task => task.priority === 'medium').length,
        high: tasks.filter(task => task.priority === 'high').length
    };
    
    // Destroy previous chart if it exists
    if (tasksPriorityChart) {
        tasksPriorityChart.destroy();
    }
    
    // Create new chart
    tasksPriorityChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Low', 'Medium', 'High'],
            datasets: [{
                data: [priorityCounts.low, priorityCounts.medium, priorityCounts.high],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(255, 99, 132, 0.7)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'Tasks by Priority'
                }
            }
        }
    });
}

// Create tasks by status chart
function createTasksStatusChart(tasks) {
    const ctx = document.getElementById('tasks-status-chart');
    if (!ctx) return;
    
    // Count tasks by status
    const statusCounts = {
        pending: tasks.filter(task => task.status === 'pending').length,
        in_progress: tasks.filter(task => task.status === 'in_progress').length,
        completed: tasks.filter(task => task.status === 'completed').length
    };
    
    // Destroy previous chart if it exists
    if (tasksStatusChart) {
        tasksStatusChart.destroy();
    }
    
    // Create new chart
    tasksStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'In Progress', 'Completed'],
            datasets: [{
                data: [statusCounts.pending, statusCounts.in_progress, statusCounts.completed],
                backgroundColor: [
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(75, 192, 192, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 159, 64, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'Tasks by Status'
                }
            }
        }
    });
}

// Create focus time chart for dashboard
function createFocusTimeChart(sessions) {
    const ctx = document.getElementById('focus-time-chart');
    if (!ctx) return;
    
    // Get focus time for each of the last 7 days
    const last7Days = [];
    const focusTimePerDay = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const sessionsDuringDay = sessions.filter(session => {
            if (!session.created_at) return false;
            
            const sessionDate = new Date(session.created_at);
            return sessionDate >= date && sessionDate < nextDate;
        });
        
        const focusSeconds = sessionsDuringDay.reduce((sum, session) => sum + session.duration, 0);
        const focusHours = Math.round(focusSeconds / 3600 * 10) / 10;
        
        last7Days.push(date.toLocaleDateString(undefined, { weekday: 'short' }));
        focusTimePerDay.push(focusHours);
    }
    
    // Destroy previous chart if it exists
    if (focusTimeChart) {
        focusTimeChart.destroy();
    }
    
    // Create new chart
    focusTimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Focus Hours',
                data: focusTimePerDay,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            }
        }
    });
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