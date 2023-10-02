const axios = require("axios");
const { WebClient } = require('@slack/web-api');

const USERNAME = "your_username_here";
const PASSWORD = "your_password_here";
let bearerToken;

// This is your initial static Slack token. If Slack's token expires, you can rotate it using the provided refresh token.
const SLACK_TOKEN = 'your_slack_token_here';
const slackClient = new WebClient(SLACK_TOKEN);
const SLACK_CHANNEL = 'your_slack_channel_id';
const SLACK_REFRESH_TOKEN = 'your_slack_refresh_token_here';

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
                const message = `Charger ${charger.Name} is available!`;
                console.log(message); // Log to console
                if (!isSilentHours()) {
                    await notifySlack(message); // Send to Slack
                }
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

function isSilentHours() {
    const currentHour = new Date().getHours();
    return currentHour >= 17 || currentHour < 6;
}

async function rotateSlackToken() {
    try {
        const newTokenData = await slackClient.oauth.v2.access({
            client_id: 'YOUR_SLACK_CLIENT_ID',
            client_secret: 'YOUR_SLACK_CLIENT_SECRET',
            grant_type: 'refresh_token',
            refresh_token: SLACK_REFRESH_TOKEN
        });

        slackClient.token = newTokenData.access_token;
        console.log("Successfully rotated Slack token.");
    } catch (error) {
        console.error("Failed to rotate Slack token:", error);
    }
}

module.exports = {
    refreshBearerToken,
    checkChargerAvailability
};
