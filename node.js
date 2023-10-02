const { 
    refreshBearerToken, 
    checkChargerAvailability, 
    rotateSlackToken 
} = require('./ZaptecSlackNotifier.js');

(async () => {
    console.log("Starting Zaptec Slack Notifier...");

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

    // Rotate Slack token every 23 hours (you can adjust this as per your needs)
    setInterval(async () => {
        await rotateSlackToken();
    }, 82800000); // 23 hours

    console.log("Zaptec Slack Notifier is now running!");
})();
