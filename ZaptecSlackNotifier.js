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
    let notifyFreeSummary = false; // Flag to notify a summary for OperatingMode 3

    try {
        const response = await axios.get("https://api.zaptec.com/api/chargers", {
            headers: {
                "Authorization": `Bearer ${bearerToken}`,
                "accept": "text/plain"
            }
        });

        const chargers = response.data.Data;
        console.log(`Found ${chargers.length} chargers.`);

        const notifications = [];
        const statusIcons = {
            1: ":zaptec-free:",
            3: ":zaptec-charging:",
            5: ":zaptec-charge-complete:"
        };

        let allChargerStatuses = ""; // To hold status icons for all chargers

        for (let charger of chargers) {
            const chargerName = charger.Name.replace(" Tobii", ""); // Remove " Tobii" from the name
            const previousStatus = previousChargerStatuses[charger.Id];

            // Update the status for all chargers
            allChargerStatuses += `${statusIcons[charger.OperatingMode]} `;

            if (previousStatus !== charger.OperatingMode) {
                if (charger.OperatingMode == 1) {
                    freeChargersCount++; // Increment free charger counter
                } else if (charger.OperatingMode == 5) {
                    notifications.push(`:zaptec-charge-complete: ${chargerName} has stopped charging.`);
                } else if (charger.OperatingMode == 3) {
                    notifyFreeSummary = true;
                }
            } else if (charger.OperatingMode == 1) {
                freeChargersCount++; // Increment free charger counter for unchanged free status
            }

            previousChargerStatuses[charger.Id] = charger.OperatingMode; // Update the status
        }

        if (freeChargersCount > 0) {
            notifications.push(`:zaptec-free: ${freeChargersCount} chargers free.`);
        }

        if (notifyFreeSummary) {
            notifications.push(`:zaptec-free: ${freeChargersCount} chargers free.`);
        }

        for (const message of notifications) {
            console.log(message + "\n" + allChargerStatuses);
            await notifySlack(message + "\n" + allChargerStatuses).catch(err => console.error("Failed to send Slack notification:", err));
        }
    } catch (error) {
        console.error("Failed to fetch charger data:", error);
    }
}

async function notifySlack(message) {
    const currentHour = new Date().getHours();
    if (currentHour >= 13 || currentHour < 7) {
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
