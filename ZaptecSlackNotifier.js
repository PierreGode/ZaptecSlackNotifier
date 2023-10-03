const axios = require("axios");
const { WebClient } = require('@slack/web-api');
require('dotenv').config(); // Load environment variables from a .env file.

// Get configuration from environment variables
const USERNAME = process.env.ZAPTEC_USERNAME;
const PASSWORD = process.env.ZAPTEC_PASSWORD;
const INITIAL_SLACK_TOKEN = process.env.INITIAL_SLACK_TOKEN;
const SLACK_REFRESH_TOKEN = process.env.SLACK_REFRESH_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;

let bearerToken;
let previousChargerStatuses = {};

async function rotateSlackToken() {
    console.log("Attempting to rotate Slack token...");
    try {
        const result = await slackClient.auth.revoke();
        console.log("Revoke result:", result);
        if (result.ok) {
            const refreshedTokenData = await slackClient.oauth.v2.access({
                client_id: SLACK_CLIENT_ID,
                client_secret: SLACK_CLIENT_SECRET,
                refresh_token: SLACK_REFRESH_TOKEN,
            });
            slackClient.token = refreshedTokenData.access_token;
            console.log("Successfully rotated Slack token.");
        }
    } catch (error) {
        console.error("Failed to rotate Slack token:", error);
    }
}

async function refreshBearerToken() {
    console.log("Attempting to refresh Zaptec bearer token...");
    const encodedCredentials = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

    try {
        let response = await axios.post("https://api.zaptec.com/oauth/token", 
            `grant_type=password&username=${encodeURIComponent(USERNAME)}&password=${encodeURIComponent(PASSWORD)}`, {
            headers: {
                "accept": "application/json",
                "content-type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${encodedCredentials}`
            }
        });

        bearerToken = response.data.access_token;
        console.log("Successfully refreshed Zaptec bearer token.");
    } catch (error) {
        console.error("Failed to refresh Zaptec token:", error);
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
            const previousStatus = previousChargerStatuses[charger.Id];
            if (previousStatus !== charger.OperatingMode) {
                if (charger.OperatingMode == 1) {
                    const message = `:zaptec-free: Charger ${charger.Name} is available!`;
                    console.log(message);
                    await notifySlack(message).catch(err => console.error("Failed to send Slack notification:", err));
                } else if (charger.OperatingMode == 5) {
                    const message = `:zaptec-charge-complete: Charger ${charger.Name} has stopped charging.`;
                    console.log(message);
                    await notifySlack(message).catch(err => console.error("Failed to send Slack notification:", err));
                }
                previousChargerStatuses[charger.Id] = charger.OperatingMode;
            }
        }
    } catch (error) {
        console.error("Failed to fetch charger data:", error);
    }
}

async function notifySlack(message) {
    const currentHour = new Date().getHours();

    // If it's between 17:00 and 06:00, don't send to Slack.
    if (currentHour >= 23 || currentHour < 6) {
        console.log("Skipped Slack notification due to current time restrictions.");
        return;
    }

    try {
        await axios.post(SLACK_WEBHOOK_URL, {
            text: message
        });
        console.log("Sent Slack notification:", message);
    } catch (error) {
        console.error("Failed to send Slack notification:", error);
    }
}

(async () => {
    await refreshBearerToken().catch(err => console.error("Initial token refresh failed:", err));
    await checkChargerAvailability().catch(err => console.error("Initial charger check failed:", err));

    // Check charger availability every 5 minutes
    setInterval(async () => {
        await checkChargerAvailability().catch(err => console.error("Periodic charger check failed:", err));
    }, 300000); // 5 minutes

    // Refresh token every 24 hours
    setInterval(async () => {
        await refreshBearerToken().catch(err => console.error("Periodic Zaptec token refresh failed:", err));
    }, 86400000); // 24 hours

    // Rotate Slack token every 9 hours
    setInterval(async () => {
        await rotateSlackToken().catch(err => console.error("Periodic Slack token rotation failed:", err));
    }, 32400000); // 9 hours

    console.log("Setting up intervals for checking charger availability and token refresh...");
    console.log("Zaptec Slack Notifier is now running!");
})();

module.exports = {
    refreshBearerToken,
    checkChargerAvailability
};
