const { 
    refreshBearerToken, 
    checkChargerAvailability,  
} = require('./ZaptecSlackNotifier.js');

(async () => {
    console.log("Starting Zaptec Slack Notifier...");
   
    console.log("Setting up intervals for checking charger availability, token refresh...");

    // Check charger availability every 3 minutes
    setInterval(async () => {
        await checkChargerAvailability();
    }, 180000); // 3 minutes

    // Refresh Zaptec token every 24 hours
    setInterval(async () => {
        await refreshBearerToken();
    }, 86400000); // 24 hours

    console.log("Zaptec Slack Notifier is now running!");
})();
