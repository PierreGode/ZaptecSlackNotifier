//@Created By Pierre Gode
const axios = require("axios");
const { WebClient } = require('@slack/web-api');
require('dotenv').config();
const config = require('./config');


// Get configuration from environment variables
const USERNAME = process.env.ZAPTEC_USERNAME;
const PASSWORD = process.env.ZAPTEC_PASSWORD;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_WEBHOOK_PRIVATE_URL = process.env.SLACK_WEBHOOK_PRIVATE_URL;
const SLACKBOT_NAME = process.env.SLACKBOT_NAME;
const SLACKBOT_ICON = process.env.SLACKBOT_ICON;
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const slackClient = new WebClient(SLACK_TOKEN);
const COMPANY_NAME = process.env.COMPANY_NAME;
const EXCLUDE_DEVICES = process.env.EXCLUDE_DEVICES;

let bearerToken;
let previousChargerStatuses = {};

let previousFreeChargerCount = 0;
let initialRun = true;
function logWithTimestamp(message) {
    const timeDate = new Date(new Date().toLocaleString('en-US', { timeZone: config.timeZone }));
    const hours = String(timeDate.getHours()).padStart(2, '0');
    const minutes = String(timeDate.getMinutes()).padStart(2, '0');
    const timestamp = `${hours}:${minutes}`;
    console.log(`[${timestamp}] ${message}`);
}

async function refreshBearerToken() {
    logWithTimestamp("Attempting to refresh Zaptec bearer token...");
    const encodedCredentials = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

    try {
        const response = await axios.post("https://api.zaptec.com/oauth/token",
            `grant_type=password&username=${encodeURIComponent(USERNAME)}&password=${encodeURIComponent(PASSWORD)}`, {
                headers: {
                    "accept": "application/json",
                    "content-type": "application/x-www-form-urlencoded",
                    "Authorization": `Basic ${encodedCredentials}`
                }
            }
        );

        bearerToken = response.data.access_token;
        logWithTimestamp("Successfully refreshed Zaptec bearer token.");
    } catch (error) {
        console.error("Failed to refresh Zaptec token:", error);
    }
}

async function checkChargerAvailability() {
    logWithTimestamp("Checking charger availability...");

        /* Operating modes
        0 = Unknown
        1 = Disconnected
        2 = Connected_Requesting
        3 = Connected_Charging
        5 = Connected_Finished
        */

    const statusIconsCircles = {
        1: "🟢", // charger free to use
        2: "🟠", // charger authorizing
        3: "🟡", // charger in use, charging
        5: "🔴" // charge complete
    };

    const statusIconsSlack = {
        1: ":z-free:",
        2: ":z-auth:",
        3: ":z-chrg:",
        5: ":z-full:"
    };

    const statusIconsEmoji = {
        1: "🔌", // charger free to use
        2: "🔐", // charger authorizing
        3: "🪫", // charger in use, charging
        5: "🔋" // charge complete
    };

    if (config.iconSet == 1)
        statusIcons = statusIconsCircles;
    else if (config.iconSet == 2)
        statusIcons = statusIconsEmoji;
    else 
        statusIcons = statusIconsSlack;

    let availableChargers = [];
    let completedChargers = [];
    let allChargerStatuses = "";
    let freeChargersCount = 0;
    let chargingStatusChanged = false;

    try {
        const response = await axios.get("https://api.zaptec.com/api/chargers", {
            headers: {
                "Authorization": `Bearer ${bearerToken}`,
                "accept": "text/plain"
            }
        });

        const chargers = response.data.Data;
        logWithTimestamp(`Found ${chargers.length} chargers.`);

        var excludedDevices = EXCLUDE_DEVICES.split(',');
        for (let charger of chargers) {
            if (excludedDevices.includes(charger.Name)) {
                logWithTimestamp(`Ignoring ${charger.Name}.`);
                continue;
            }

            const chargerName = charger.Name.replace(` ${COMPANY_NAME}`, "");
            const previousStatus = previousChargerStatuses[charger.Id];

            allChargerStatuses += `${statusIcons[charger.OperatingMode]} `;

            if (charger.OperatingMode == 1) {
                freeChargersCount++;
            }

            if (previousStatus !== charger.OperatingMode) {
                if (charger.OperatingMode == 1) {
                    availableChargers.push(chargerName);
                } else if (charger.OperatingMode == 2) { 
                } else if (charger.OperatingMode == 5) {
                    completedChargers.push(chargerName);
                } else if (charger.OperatingMode == 3) {
                    chargingStatusChanged = true;
                }
                previousChargerStatuses[charger.Id] = charger.OperatingMode;
            }
        }

        if (chargingStatusChanged && previousFreeChargerCount > freeChargersCount) {
            let plural_s = freeChargersCount === 1 ? "" : "s";
            let icon = freeChargersCount === 0 ? "❌" : statusIcons[1];
            let summaryMessage = `${icon} ${freeChargersCount} charger${plural_s} available.`;
            console.log(summaryMessage + "\n\n" + allChargerStatuses);
            await notifySlack(summaryMessage + "\n\n" + allChargerStatuses).catch(err => console.error("Failed to send Slack notification:", err));
        }

        if (initialRun && config.silentStart) {
            logWithTimestamp("Initial run, notifications are silenced.");
        } else {
            if (availableChargers.length) {
                if (previousFreeChargerCount === 0) {
                    await notifySlack("!!! CHARGER AVAILABLE !!!").catch(err => console.error("Failed to send Slack notification:", err));
                }
                const verb = availableChargers.length === 1 ? "is" : "are";
                const message = `${statusIcons[1]} ${availableChargers.join(", ")} ${verb} available!` ;
                await notifySlack(message + "\n\n" + allChargerStatuses).catch(err => console.error("Failed to send Slack notification:", err));

            }

            if (completedChargers.length) {
                const verb = completedChargers.length === 1 ? "has" : "have";
                const message = `${statusIcons[5]} ${completedChargers.join(", ")} ${verb} stopped charging.`;
                await notifySlack(message + "\n" + allChargerStatuses).catch(err => console.error("Failed to send Slack notification:", err));
            }
        }
        initialRun = false;  // Reset the flag after the initial run

        previousFreeChargerCount = freeChargersCount;
    } catch (error) {
        console.error("Failed to fetch charger data:", error);
    }
}


let lastChargeDate;  

async function getChargeHistory() {
    if (!config.showChargingdata)
        return;

    logWithTimestamp("Fetching charge history...");

    try {
        const response = await axios.get("https://api.zaptec.com/api/chargehistory", {
            headers: {
                "Authorization": `Bearer ${bearerToken}`,
                "accept": "application/json"
            }
        });

        const currentChargeHistory = response.data.Data;  

        // If this is the initial run or the charge history has changed since the last run
        if (currentChargeHistory.length > 0 && 
            (!lastChargeDate || lastChargeDate !== currentChargeHistory[0].StartDateTime)) {
            logWithTimestamp(`Fetched charge history for ${currentChargeHistory.length} entries.`);
            lastCharge = currentChargeHistory[0];

            var startDate = new Date(lastCharge.StartDateTime + "Z");
            var endDate = new Date(lastCharge.EndDateTime + "Z");

            // Format the start date and time using 24-hour format
            const formattedStartDate = new Intl.DateTimeFormat(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(startDate);

            // Format the end date and time using 24-hour format
            const formattedEndDate = new Intl.DateTimeFormat(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(endDate);

            let chargeTime = (endDate-startDate)/1000/60;
            let chargeTimeStr = `${(chargeTime/60).toFixed(0)}h ${(chargeTime%60).toFixed(0)}m`;
            let avgChargePower = (lastCharge.Energy/(chargeTime/60));

            const message = `* *Duration:* ${(chargeTime/60).toFixed(0)}h ${(chargeTime%60).toFixed(0)}m\n`+
            `* *Time:* ${formattedStartDate} - ${formattedEndDate}\n`+
            `* *Energy charged:* ${lastCharge.Energy.toFixed(1)} kWh (avg ${avgChargePower.toFixed(2)} kW)\n`+
            `* *Charger:* ${lastCharge.DeviceName.replace(` ${COMPANY_NAME}`, "")}\n`+
            `* *Token:* ${lastCharge.TokenName}\n`+
            `* *ExternallyEnded:* ${lastCharge.ExternallyEnded}`;


            if (lastChargeDate || !config.silentStart) {
                await notifyPersonal("Your charging session is complete:"  + "\n" + message)
                .catch(err => console.error("Failed to send Slack notification:", err));
            }
            lastChargeDate = lastCharge.StartDateTime;
        }
    } catch (error) {
        console.error("Failed to fetch charge history:", error);
    }
}

async function notifyPersonal(message) {
    if (!SLACK_WEBHOOK_PRIVATE_URL) {
        notifySlack(message);
    } else {
        try {
            await axios.post(SLACK_WEBHOOK_PRIVATE_URL, {
                text: message,
                icon_url: SLACKBOT_ICON,
                username: SLACKBOT_NAME
            });
            logWithTimestamp("Sent private Slack notification:\n"+ message);
        } catch (error) {
            console.error("Failed to send private Slack notification:", error);
        } 
    }
}

async function notifySlack(message) {
    const currentHour = new Date().getHours();
    const currentDay = new Date().toLocaleString('en-us', { weekday: 'long' });

    // Determine whether we should silence the notification
    const isWithinSilentHours = (config.startSilentHour < config.endSilentHour)
        ? (currentHour >= config.startSilentHour && currentHour < config.endSilentHour)
        : (currentHour >= config.startSilentHour || currentHour < config.endSilentHour);

    const isSilentDay = config.silentDays.includes(currentDay);

    if (isWithinSilentHours || isSilentDay) {
        logWithTimestamp("Skipped Slack notification due to current time or day restrictions.");
        return;
    }

    try {
        await axios.post(SLACK_WEBHOOK_URL, {
            text: message,
            icon_url: SLACKBOT_ICON,
            username: SLACKBOT_NAME
        });
        logWithTimestamp("Sent Slack notification:\n"+ message);
    } catch (error) {
        console.error("Failed to send Slack notification:", error);
    }
}


(async () => {
    await refreshBearerToken().catch(err => console.error("Initial token refresh failed:", err));
    await checkChargerAvailability().catch(err => console.error("Initial charger check failed:", err));
    await getChargeHistory().catch(err => console.error("Initial charge history fetch failed:", err)); 

    setInterval(async () => {
        await checkChargerAvailability().catch(err => console.error("Periodic charger check failed:", err));
    }, config.zaptecUpdateInterval);

    setInterval(async () => {
        await getChargeHistory().catch(err => console.error("Periodic charge history fetch failed:", err)); 
    }, config.zaptecUpdateInterval); 

    setInterval(async () => {
        await refreshBearerToken().catch(err => console.error("Periodic Zaptec token refresh failed:", err));
    }, config.zaptecTokenRefreshInterval);

    logWithTimestamp("Zaptec Slack Notifier is now running!");
})();

module.exports = {
    refreshBearerToken,
    checkChargerAvailability,
    getChargeHistory
};
//@Created By Pierre Gode
