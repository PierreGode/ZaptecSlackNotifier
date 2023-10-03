const { 
    refreshBearerToken, 
    checkChargerAvailability, 
    rotateSlackToken 
} = require('./ZaptecSlackNotifier.js');

(async () => {
    console.log("Starting Zaptec Slack Notifier...");

    // Rotate the Slack token immediately on startup to ensure a fresh token
    await rotateSlackToken();

    await refreshBearerToken();

    console.log("Setting up intervals for checking charger availability, token refresh, and Slack token rotation...");

    // Check charger availability every 5 minutes
    setInterval(async () => {
        await checkChargerAvailability();
    }, 300000); // 5 minutes

    // Refresh Zaptec token every 24 hours
    setInterval(async () => {
        await refreshBearerToken();
    }, 86400000); // 24 hours

    // Rotate Slack token every 9 hours
    setInterval(async () => {
        await rotateSlackToken();
    }, 32400000); // 9 hours

    console.log("Zaptec Slack Notifier is now running!");
})();
