// settings.js - Handles application settings

// Default settings
const defaultSettings = {
    theme: 'light',
    pomodoro_duration: 25,
    break_duration: 5,
    notification_enabled: true
};

// Current settings
let currentSettings = {...defaultSettings};

// Initialize settings module
function initSettings() {
    console.log('Settings module initialized');
    
    // Load settings
    loadSettings();
    
    // Set up event listeners
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSettings();
        });
        
        // Reset button
        const resetButton = settingsForm.querySelector('button[type="reset"]');
        if (resetButton) {
            resetButton.addEventListener('click', function(e) {
                e.preventDefault();
                resetSettings();
            });
        }
    }
    
    // Theme selector
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            applyTheme(themeSelect.value);
        });
    }
}

// Load settings from API or localStorage
async function loadSettings() {
    try {
        let settings;
        
        // Check if we're in Electron or web environment
        if (window.electron) {
            settings = await window.electron.invoke('get-settings');
        } else {
            // Use fetch API for web version or fall back to localStorage
            try {
                console.log('Fetching settings from API...');
                const res = await fetch('http://localhost:8000/api/settings/');
                if (!res.ok) {
                    throw new Error(`Failed to fetch settings: ${res.status}`);
                }
                settings = await res.json();
                console.log('Settings loaded:', settings);
            } catch (error) {
                console.warn('Failed to load settings from API, falling back to localStorage:', error);
                // Fall back to localStorage
                const savedSettings = localStorage.getItem('flowstate_settings');
                if (savedSettings) {
                    settings = JSON.parse(savedSettings);
                }
            }
        }
        
        // If no settings found, use defaults
        if (!settings) {
            settings = {...defaultSettings};
        }
        
        // Update current settings
        currentSettings = settings;
        
        // Apply settings to UI
        applySettingsToUI();
        
        // Apply theme
        applyTheme(settings.theme);
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Failed to load settings, using defaults', 'error');
        
        // Use defaults
        currentSettings = {...defaultSettings};
        applySettingsToUI();
    }
}

// Apply current settings to UI form
function applySettingsToUI() {
    // Theme selector
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
        themeSelect.value = currentSettings.theme || 'light';
    }
    
    // Pomodoro duration
    const pomodoroDuration = document.getElementById('pomodoro-duration');
    if (pomodoroDuration) {
        pomodoroDuration.value = currentSettings.pomodoro_duration || 25;
    }
    
    // Break duration
    const breakDuration = document.getElementById('break-duration');
    if (breakDuration) {
        breakDuration.value = currentSettings.break_duration || 5;
    }
    
    // Notification enabled
    const notificationEnabled = document.getElementById('notification-enabled');
    if (notificationEnabled) {
        notificationEnabled.checked = currentSettings.notification_enabled !== false;
    }
}

// Save settings
async function saveSettings() {
    try {
        // Get values from form
        const theme = document.getElementById('theme').value;
        const pomodoroDuration = parseInt(document.getElementById('pomodoro-duration').value);
        const breakDuration = parseInt(document.getElementById('break-duration').value);
        const notificationEnabled = document.getElementById('notification-enabled').checked;
        
        // Validate values
        if (isNaN(pomodoroDuration) || pomodoroDuration < 1 || pomodoroDuration > 120) {
            showNotification('Pomodoro duration must be between 1 and 120 minutes', 'error');
            return;
        }
        
        if (isNaN(breakDuration) || breakDuration < 1 || breakDuration > 60) {
            showNotification('Break duration must be between 1 and 60 minutes', 'error');
            return;
        }
        
        // Create settings object
        const settings = {
            theme,
            pomodoro_duration: pomodoroDuration,
            break_duration: breakDuration,
            notification_enabled: notificationEnabled
        };
        
        // Save settings
        if (window.electron) {
            await window.electron.invoke('save-settings', settings);
        } else {
            // Use fetch API for web version
            try {
                console.log('Saving settings to API:', settings);
                const response = await fetch('http://localhost:8000/api/settings/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                });
                
                if (!response.ok) {
                    const errorData = await response.text();
                    console.error(`Server error (${response.status}):`, errorData);
                    throw new Error(`Server returned ${response.status}: ${errorData}`);
                }
                
                const result = await response.json();
                console.log('Settings saved:', result);
            } catch (error) {
                console.error('Error saving settings to API:', error);
                // Fall back to localStorage
                localStorage.setItem('flowstate_settings', JSON.stringify(settings));
            }
        }
        
        // Update current settings
        currentSettings = settings;
        
        // Apply theme
        applyTheme(settings.theme);
        
        // Show success notification
        showNotification('Settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification(`Failed to save settings: ${error.message}`, 'error');
    }
}

// Reset settings to defaults
function resetSettings() {
    // Update form with default values
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
        themeSelect.value = defaultSettings.theme;
    }
    
    const pomodoroDuration = document.getElementById('pomodoro-duration');
    if (pomodoroDuration) {
        pomodoroDuration.value = defaultSettings.pomodoro_duration;
    }
    
    const breakDuration = document.getElementById('break-duration');
    if (breakDuration) {
        breakDuration.value = defaultSettings.break_duration;
    }
    
    const notificationEnabled = document.getElementById('notification-enabled');
    if (notificationEnabled) {
        notificationEnabled.checked = defaultSettings.notification_enabled;
    }
    
    // Show notification
    showNotification('Settings reset to defaults', 'info');
    
    // Apply theme
    applyTheme(defaultSettings.theme);
}

// Apply theme to the application
function applyTheme(theme) {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    
    // Add CSS variables for theme colors
    const style = document.getElementById('theme-styles') || document.createElement('style');
    style.id = 'theme-styles';
    
    if (theme === 'dark') {
        style.textContent = `
            :root {
                --bg-primary: #121212;
                --bg-secondary: #1e1e1e;
                --text-primary: #ffffff;
                --text-secondary: #b3b3b3;
                --border-color: #333333;
                --accent-color: #bb86fc;
                --success-color: #03dac6;
                --error-color: #cf6679;
                --card-bg: #1e1e1e;
                --hover-color: rgba(255, 255, 255, 0.08);
            }
        `;
    } else {
        style.textContent = `
            :root {
                --bg-primary: #f8f9fa;
                --bg-secondary: #ffffff;
                --text-primary: #343a40;
                --text-secondary: #6c757d;
                --border-color: #dee2e6;
                --accent-color: #007bff;
                --success-color: #28a745;
                --error-color: #dc3545;
                --card-bg: #ffffff;
                --hover-color: rgba(0, 0, 0, 0.05);
            }
        `;
    }
    
    document.head.appendChild(style);
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