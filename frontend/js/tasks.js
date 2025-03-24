// tasks.js - Handles task management operations

// Global task list
let tasks = [];

// Initialize tasks module
function initTasks() {
    console.log('Tasks module initialized');
    
    // Load tasks on initialization
    loadTasks();
    
    // Set up event listeners for both add task buttons
    document.getElementById('add-task-btn').addEventListener('click', showTaskModal);
    
    // The second add task button in the tasks section
    const addTaskBtn2 = document.getElementById('add-task-btn-2');
    if (addTaskBtn2) {
        addTaskBtn2.addEventListener('click', showTaskModal);
    }
    
    // Set up form submission handler
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveTask();
        });
    }
    
    // Set up modal close buttons
    const closeModalButtons = document.querySelectorAll('.close-modal, .close-modal-btn');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', hideTaskModal);
    });
    
    // Task search functionality (if exists)
    const searchInput = document.getElementById('task-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterTasks(searchTerm);
        });
    }
    
    // Filter dropdowns (if they exist)
    const statusFilter = document.getElementById('status-filter');
    const priorityFilter = document.getElementById('priority-filter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    
    if (priorityFilter) {
        priorityFilter.addEventListener('change', applyFilters);
    }
}

// Load tasks from API
async function loadTasks() {
    try {
        let response;
        
        // Check if we're in Electron or web environment
        if (window.electron) {
            response = await window.electron.invoke('get-tasks');
        } else {
            // Use fetch API for web version
            console.log('Fetching tasks from API...');
            const res = await fetch('http://localhost:8000/api/tasks/');
            if (!res.ok) {
                const errorText = await res.text();
                console.error('Error response:', res.status, errorText);
                throw new Error(`API returned ${res.status}: ${errorText}`);
            }
            response = await res.json();
            console.log('Tasks loaded:', response);
        }
        
        tasks = response;
        renderTasks();
        updateRecentTasks();
        updateDashboardStats();
        
        // Also update session task selector if it exists
        updateSessionTaskSelector();
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Failed to load tasks: ' + error.message, 'error');
    }
}

// Render tasks to the tasks table
function renderTasks() {
    const tasksTableBody = document.getElementById('tasks-table-body');
    const noTasksMessage = document.getElementById('no-tasks-message');
    
    if (!tasksTableBody) {
        console.error('Tasks table body element not found');
        return;
    }
    
    tasksTableBody.innerHTML = '';
    
    if (tasks.length === 0) {
        if (noTasksMessage) noTasksMessage.style.display = 'block';
        return;
    }
    
    if (noTasksMessage) noTasksMessage.style.display = 'none';
    
    tasks.forEach(task => {
        const row = document.createElement('tr');
        
        // Format the due date
        let dueDateDisplay = 'No date set';
        if (task.due_date) {
            const dueDate = new Date(task.due_date);
            dueDateDisplay = dueDate.toLocaleDateString();
        }
        
        row.innerHTML = `
            <td>${task.title}</td>
            <td><span class="status-badge ${task.status}">${task.status.replace('_', ' ')}</span></td>
            <td><span class="priority-badge ${task.priority}">${task.priority}</span></td>
            <td>${dueDateDisplay}</td>
            <td class="actions">
                <button class="btn-icon edit-task" data-id="${task.id}"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete-task" data-id="${task.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        
        tasksTableBody.appendChild(row);
    });
    
    // Add event listeners for edit and delete buttons
    const editButtons = document.querySelectorAll('.edit-task');
    const deleteButtons = document.querySelectorAll('.delete-task');
    
    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const taskId = button.getAttribute('data-id');
            editTask(taskId);
        });
    });
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const taskId = button.getAttribute('data-id');
            deleteTask(taskId);
        });
    });
}

// Update recent tasks list on dashboard
function updateRecentTasks() {
    const recentTasksList = document.getElementById('recent-tasks-list');
    
    if (!recentTasksList) return;
    
    recentTasksList.innerHTML = '';
    
    if (tasks.length === 0) {
        recentTasksList.innerHTML = '<p class="empty-state">No tasks available. Click \'Add Task\' to create one.</p>';
        return;
    }
    
    // Sort tasks by due date (most recent first) and get the first 5
    const recentTasks = [...tasks]
        .sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date) - new Date(b.due_date);
        })
        .slice(0, 5);
    
    recentTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        
        // Format the due date
        let dueDateDisplay = '';
        if (task.due_date) {
            const dueDate = new Date(task.due_date);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            if (dueDate.toDateString() === today.toDateString()) {
                dueDateDisplay = 'Today';
            } else if (dueDate.toDateString() === tomorrow.toDateString()) {
                dueDateDisplay = 'Tomorrow';
            } else {
                dueDateDisplay = dueDate.toLocaleDateString();
            }
        }
        
        taskElement.innerHTML = `
            <div class="task-content">
                <h3 class="task-title">${task.title}</h3>
                <div class="task-meta">
                    <span class="priority-badge ${task.priority}">${task.priority}</span>
                    ${dueDateDisplay ? `<span class="due-date">${dueDateDisplay}</span>` : ''}
                </div>
            </div>
            <div class="task-status">
                <span class="status-badge ${task.status}">${task.status.replace('_', ' ')}</span>
            </div>
        `;
        
        recentTasksList.appendChild(taskElement);
    });
}

// Update dashboard stats
function updateDashboardStats() {
    const completedTasksCount = document.getElementById('completed-tasks-count');
    const totalTasksCount = document.getElementById('total-tasks-count');
    
    if (completedTasksCount) {
        const completed = tasks.filter(task => task.status === 'completed').length;
        completedTasksCount.textContent = completed;
    }
    
    if (totalTasksCount) {
        totalTasksCount.textContent = tasks.length;
    }
}

// Update session task selector
function updateSessionTaskSelector() {
    const sessionTaskSelect = document.getElementById('session-task');
    
    if (!sessionTaskSelect) return;
    
    // Clear current options except for the default
    const defaultOption = sessionTaskSelect.options[0];
    sessionTaskSelect.innerHTML = '';
    sessionTaskSelect.appendChild(defaultOption);
    
    // Add task options
    const pendingTasks = tasks.filter(task => task.status !== 'completed');
    
    pendingTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.title;
        sessionTaskSelect.appendChild(option);
    });
}

// Show the task modal
function showTaskModal() {
    const taskModal = document.getElementById('task-modal');
    if (taskModal) {
        // Reset form
        document.getElementById('task-form').reset();
        document.getElementById('task-id').value = '';
        
        // Update modal title
        document.getElementById('task-modal-title').textContent = 'Add New Task';
        
        // Show modal
        taskModal.style.display = 'block';
    }
}

// Hide the task modal
function hideTaskModal() {
    const taskModal = document.getElementById('task-modal');
    if (taskModal) {
        taskModal.style.display = 'none';
    }
}

// Save a new task or update existing task
async function saveTask() {
    const taskId = document.getElementById('task-id').value;
    const isNewTask = !taskId;
    
    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        status: document.getElementById('task-status').value,
        priority: document.getElementById('task-priority').value,
        due_date: document.getElementById('task-due-date').value || null
    };
    
    // Validate task data
    if (!taskData.title) {
        showNotification('Task title is required', 'error');
        return;
    }
    
    console.log('Saving task data:', taskData);
    
    try {
        let response;
        
        if (window.electron) {
            // Use Electron IPC
            console.log('Using Electron IPC for saving task');
            if (isNewTask) {
                response = await window.electron.invoke('add-task', taskData);
            } else {
                response = await window.electron.invoke('update-task', { id: parseInt(taskId), ...taskData });
            }
        } else {
            // Use fetch API for web version
            console.log('Using Fetch API for saving task');
            const url = isNewTask 
                ? 'http://localhost:8000/api/tasks/' 
                : `http://localhost:8000/api/tasks/${taskId}`;
                
            const method = isNewTask ? 'POST' : 'PUT';
            
            console.log(`Sending ${method} request to ${url}`, taskData);
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData)
            });
            
            if (!res.ok) {
                const errorData = await res.text();
                console.error(`Server error (${res.status}):`, errorData);
                throw new Error(`Server returned ${res.status}: ${errorData}`);
            }
            
            response = await res.json();
            console.log('Server response:', response);
        }
        
        // Hide the modal and reload tasks
        hideTaskModal();
        await loadTasks();
        
        // Show success notification
        showNotification(
            isNewTask ? 'Task added successfully' : 'Task updated successfully', 
            'success'
        );
    } catch (error) {
        console.error('Error saving task:', error);
        showNotification(`Failed to save task: ${error.message}`, 'error');
    }
}

// Delete a task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        if (window.electron) {
            await window.electron.invoke('delete-task', taskId);
        } else {
            const response = await fetch(`http://localhost:8000/api/tasks/${taskId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                console.error(`Server error (${response.status}):`, errorData);
                throw new Error(`Server returned ${response.status}: ${errorData}`);
            }
        }
        
        // Reload tasks to refresh the UI
        await loadTasks();
        showNotification('Task deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification(`Failed to delete task: ${error.message}`, 'error');
    }
}

// Edit an existing task
function editTask(taskId) {
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;
    
    // Fill the form with task data
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-status').value = task.status;
    document.getElementById('task-priority').value = task.priority;
    
    if (task.due_date) {
        // Format date for the input field (YYYY-MM-DDTHH:MM)
        const dueDate = new Date(task.due_date);
        const formattedDate = dueDate.toISOString().slice(0, 16);
        document.getElementById('task-due-date').value = formattedDate;
    } else {
        document.getElementById('task-due-date').value = '';
    }
    
    // Update modal title
    document.getElementById('task-modal-title').textContent = 'Edit Task';
    
    // Show the modal
    document.getElementById('task-modal').style.display = 'block';
}

// Apply filters to tasks
function applyFilters() {
    const statusFilter = document.getElementById('status-filter');
    const priorityFilter = document.getElementById('priority-filter');
    
    const statusValue = statusFilter ? statusFilter.value : '';
    const priorityValue = priorityFilter ? priorityFilter.value : '';
    
    // Filter tasks based on selected values
    let filteredTasks = [...tasks];
    
    if (statusValue) {
        filteredTasks = filteredTasks.filter(task => task.status === statusValue);
    }
    
    if (priorityValue) {
        filteredTasks = filteredTasks.filter(task => task.priority === priorityValue);
    }
    
    // Temporarily override the tasks array for rendering
    const originalTasks = tasks;
    tasks = filteredTasks;
    renderTasks();
    tasks = originalTasks; // Restore original tasks
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