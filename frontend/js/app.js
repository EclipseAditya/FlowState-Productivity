document.addEventListener('DOMContentLoaded', () => {
    console.log('FlowState Application Initialized');
    
    // Initialize each module
    if (typeof initNavigation === 'function') {
        initNavigation();
    }
    
    if (typeof initTasks === 'function') {
        initTasks();
    }
    
    if (typeof initSessions === 'function') {
        initSessions();
    }
    
    if (typeof initStatistics === 'function') {
        initStatistics();
    }
    
    if (typeof initSettings === 'function') {
        initSettings();
    }
}); 