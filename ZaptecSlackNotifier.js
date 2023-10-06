const axios = require("axios");
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

// Get configuration from environment variables
const USERNAME = process.env.ZAPTEC_USERNAME;
const PASSWORD = process.env.ZAPTEC_PASSWORD;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const slackClient = new WebClient(SLACK_TOKEN);

let bearerToken;
let previousChargerStatuses = {};
let previousFreeChargerCount = 0;

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

    const notifications = [];
    const statusIcons = {
        1: ":zaptec-free:",
        3: ":zaptec-charging:",
        5: ":zaptec-charge-complete:"
    };

    try {
        const response = await axios.get("https://api.zaptec.com/api/chargers", {
            headers: {
                "Authorization": `Bearer ${bearerToken}`,
                "accept": "text/plain"
            }
        });

        const chargers = response.data.Data;
        console.log(`Found ${chargers.length} chargers.`);

        let allChargerStatuses = ""; 
        let freeChargersCount = 0;
        let chargingStatusChanged = false;

        for (let charger of chargers) {
            const chargerName = charger.Name.replace(" Tobii", "");
            const previousStatus = previousChargerStatuses[charger.Id];

            allChargerStatuses += `${statusIcons[charger.OperatingMode]} `;

            if (previousStatus !== charger.OperatingMode) {
                if (charger.OperatingMode == 1) {
                    freeChargersCount++;
                    notifications.push(`:zaptec-free: ${chargerName} is available!`);
                } else if (charger.OperatingMode == 5) {
                    notifications.push(`:zaptec-charge-complete: ${chargerName} has stopped charging.`);
                } else if (charger.OperatingMode == 3) {
                    chargingStatusChanged = true; // Set the flag if a charger starts charging
                }

                previousChargerStatuses[charger.Id] = charger.OperatingMode;
            } else if (charger.OperatingMode == 1) {
                freeChargersCount++;
            }
        }

        // Notification condition specific to when a charger is taken
        if (chargingStatusChanged && previousFreeChargerCount > freeChargersCount) {
            const summaryMessage = `:zaptec-free: ${freeChargersCount} charger(s) free.`;
            notifications.push(summaryMessage);
        }

        // Update the previous free charger count for the next cycle
        previousFreeChargerCount = freeChargersCount;

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
    if (currentHour >= 16 || currentHour < 6) {
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
