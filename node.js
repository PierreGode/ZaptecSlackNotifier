const { 
    refreshBearerToken, 
    checkChargerAvailability,  
} = require('./ZaptecSlackNotifier.js');
const config = require('./config');

const config = require('./config');
    
(async () => {
    console.log("Starting Zaptec Slack Notifier...");
   
    console.log("Setting up intervals for checking charger availability, token refresh...");

    
    // Check charger availability every 3 minutes
    setInterval(async () => {
        await checkChargerAvailability();
     }, config.zaptecUpdateInterval); // configure in config.js

    // Refresh Zaptec token every 24 hours
    setInterval(async () => {
        await refreshBearerToken();
    }, config.zaptecTokenRefreshInterval); // 24 hours

    console.log("Zaptec Slack Notifier is now running!");
})();
