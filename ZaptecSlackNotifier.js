const axios = require("axios");
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const USERNAME = process.env.ZAPTEC_USERNAME;
const PASSWORD = process.env.ZAPTEC_PASSWORD;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const slackClient = new WebClient(SLACK_TOKEN);

let bearerToken;
let previousChargerStatuses = {};
let previousFreeChargerCount = 0;
let initialRun = true;  // Add this line to establish a flag for initial run

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

    const statusIcons = {
        1: ":zaptec-free:",
        3: ":zaptec-charging:",
        5: ":zaptec-charge-complete:"
    };

    let availableChargers = [];
    let completedChargers = [];
    let freeChargersCount = 0;
    let chargingStatusChanged = false;
    let allChargerStatuses = "";

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
            const chargerName = charger.Name.replace(" Tobii", "");
            const previousStatus = previousChargerStatuses[charger.Id];

            allChargerStatuses += `${statusIcons[charger.OperatingMode]} `;

            if (previousStatus !== charger.OperatingMode) {
                if (charger.OperatingMode == 1) {
                    freeChargersCount++;
                    availableChargers.push(chargerName);
                } else if (charger.OperatingMode == 5) {
                    completedChargers.push(chargerName);
                } else if (charger.OperatingMode == 3) {
                    chargingStatusChanged = true;
                }

                previousChargerStatuses[charger.Id] = charger.OperatingMode;
            } else if (charger.OperatingMode == 1) {
                freeChargersCount++;
            }
        }

        if (chargingStatusChanged && previousFreeChargerCount > freeChargersCount) {
            const summaryMessage = `${statusIcons[1]} ${freeChargersCount} charger(s) free.`;
            console.log(summaryMessage);
            await notifySlack(summaryMessage + "\n" + allChargerStatuses).catch(err => console.error("Failed to send Slack notification:", err));
        }

        if (!initialRun) {
            if (availableChargers.length) {
                const message = `${statusIcons[1]} ${availableChargers.join(", ")} is/are available!`;
                console.log(message);
                await notifySlack(message + "\n" + allChargerStatuses).catch(err => console.error("Failed to send Slack notification:", err));
            }

            if (completedChargers.length) {
                const message = `${statusIcons[5]} ${completedChargers.join(", ")} has/have stopped charging.`;
                console.log(message);
                await notifySlack(message + "\n" + allChargerStatuses).catch(err => console.error("Failed to send Slack notification:", err));
            }
        } else {
            console.log("Initial run, notifications are silenced.");
            initialRun = false;  // Reset the flag after the initial run
        }

        previousFreeChargerCount = freeChargersCount;  // Update the previous free charger count

    } catch (error) {
        console.error("Failed to fetch charger data:", error);
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
