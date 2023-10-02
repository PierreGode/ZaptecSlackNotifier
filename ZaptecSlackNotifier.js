const axios = require("axios");
const { WebClient } = require('@slack/web-api');

const USERNAME = "your_username_here";
const PASSWORD = "your_password_here";
let bearerToken;

const SLACK_TOKEN = 'your_slack_token_here';
const slackClient = new WebClient(SLACK_TOKEN);
const SLACK_CHANNEL = 'your_slack_channel_id';

async function refreshBearerToken() {
    console.log("Attempting to refresh Zaptec bearer token...");
    const encodedCredentials = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

    try {
        let response = await axios.post("https://api.zaptec.com/oauth/token", `grant_type=password&username=${encodeURIComponent(USERNAME)}&password=${encodeURIComponent(PASSWORD)}`, {
            headers: {
                "accept": "application/json",
                "content-type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${encodedCredentials}`
            }
        });

        bearerToken = response.data.access_token;
        console.log("Successfully refreshed bearer token.");
    } catch (error) {
        console.error("Failed to refresh token:", error);
    }
}

async function checkChargerAvailability() {
    console.log("Checking charger availability...");

    try {
        let response = await axios.get("https://api.zaptec.com/api/chargers", {
            headers: {
                "Authorization": `Bearer ${bearerToken}`,
                "accept": "text/plain"
            }
        });

        const chargers = response.data.Data;
        console.log(`Found ${chargers.length} chargers.`);

        for (let charger of chargers) {
            if (charger.OperatingMode == 1) {
                const message = `Charger ${charger.Id} is available!`;
                console.log(message); // Log to console
                await notifySlack(message); // Send to Slack
            }
        }
    } catch (error) {
        console.error("Failed to fetch charger data:", error);
    }
}

async function notifySlack(message) {
    try {
        await slackClient.chat.postMessage({
            channel: SLACK_CHANNEL,
            text: message
        });
        console.log("Sent Slack notification:", message);
    } catch (error) {
        console.error("Failed to send Slack notification:", error);
    }
}

// Main Execution
(async () => {
    await refreshBearerToken();

    // Set initial charger check
    await checkChargerAvailability();

    // Check charger availability every 5 minutes
    setInterval(async () => {
        await checkChargerAvailability();
    }, 300000); // 5 minutes

    // Refresh token every 24 hours
    setInterval(async () => {
        await refreshBearerToken();
    }, 86400000); // 24 hours

    console.log("Setting up intervals for checking charger availability and token refresh...");
    console.log("Zaptec Slack Notifier is now running!");
})();
