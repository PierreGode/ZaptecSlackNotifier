const { refreshBearerToken, checkChargerAvailability } = require('./ZaptecSlackNotifier.js');

(async () => {
    console.log("Starting Zaptec Slack Notifier...");

    await refreshBearerToken();

    console.log("Setting up intervals for checking charger availability and token refresh...");

    // Check charger availability every 5 minutes
    setInterval(async () => {
        await checkChargerAvailability();
    }, 300000); // 5 minutes

    // Refresh token every 24 hours
    setInterval(async () => {
        await refreshBearerToken();
    }, 86400000); // 24 hours

    console.log("Zaptec Slack Notifier is now running!");
})();
