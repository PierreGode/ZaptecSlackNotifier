const axios = require("axios");
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

// Get configuration from environment variables
const USERNAME = process.env.ZAPTEC_USERNAME;
const PASSWORD = process.env.ZAPTEC_PASSWORD;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const INITIAL_SLACK_TOKEN = process.env.INITIAL_SLACK_TOKEN;
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const slackClient = new WebClient(SLACK_TOKEN);

let bearerToken;
let previousChargerStatuses = {};

async function refreshBearerToken() {
    console.log("Attempting to refresh Zaptec bearer token...");
    const encodedCredentials = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

    try {
        const response = await axios.post("https://api.zaptec.com/oauth/token",
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

    let freeChargersCount = 0; // Counter for free chargers

    try {
        const response = await axios.get("https://api.zaptec.com/api/chargers", {
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
                const chargerName = charger.Name.replace(" Tobii", ""); // Remove " Tobii" from the name
                if (charger.OperatingMode == 1) {
                    freeChargersCount++; // Increment free charger counter
                    const message = `:zaptec-free: ${chargerName} is available!`;
                    console.log(message);
                    await notifySlack(message).catch(err => console.error("Failed to send Slack notification:", err));
                } else if (charger.OperatingMode == 5) {
                    const message = `:zaptec-charge-complete: ${chargerName} has stopped charging.`;
                    console.log(message);
                    await notifySlack(message).catch(err => console.error("Failed to send Slack notification:", err));
                } else if (charger.OperatingMode == 3) {
                    const message = `:zaptec-free: ${freeChargersCount} chargers free.`;
                    console.log(message);
                    await notifySlack(message).catch(err => console.error("Failed to send Slack notification:", err));
                }
                previousChargerStatuses[charger.Id] = charger.OperatingMode;
            } else if (charger.OperatingMode == 1) {
                freeChargersCount++; // Increment free charger counter for unchanged free status
            }
        }
    } catch (error) {
        console.error("Failed to fetch charger data:", error);
    }
}

async function notifySlack(message) {
    const currentHour = new Date().getHours();
    if (currentHour >= 16 || currentHour < 7) {
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

    setInterval(async () => {
        await checkChargerAvailability().catch(err => console.error("Periodic charger check failed:", err));
    }, 300000);

    setInterval(async () => {
        await refreshBearerToken().catch(err => console.error("Periodic Zaptec token refresh failed:", err));
    }, 86400000);

    console.log("Setting up intervals for checking charger availability and token refresh...");
    console.log("Zaptec Slack Notifier is now running!");
})();

module.exports = {
    refreshBearerToken,
    checkChargerAvailability,
};
