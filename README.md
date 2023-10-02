# ZaptecSlackNotifier
Send notifications of availible Zaptec chargers that are availible in your Zaptec account to Slack

Prerequisites
Before you proceed, ensure you have the following:
```
sudo apt-get install npm
```
```
npm install axios @slack/web-api
```
Node.js & npm: This is the runtime environment for executing JavaScript code server-side.
```
git clone https://github.com/PierreGode/ZaptecSlackNotifier.git
```
```
cd ZaptecSlackNotifier
```
4. Configuration
Update node.js (or whatever you named the main script) with the required configurations:

Zaptec Credentials: These are your username and password for the Zaptec platform.
```
USERNAME: Your Zaptec username.
PASSWORD: Your Zaptec password.
```
Slack Configuration: These details allow you to send messages to your Slack workspace.
```
SLACK_TOKEN: Your Slack API token. You can get this from Slack API.
SLACK_CHANNEL: The Slack channel ID where the notifications should be sent.
```
Update the placeholders ('your_username_here', 'your_password_here', etc.) in the node.js file with the actual values.

Running the Notifier
Once you've set up the configurations, run the notifier using:
```
node node.js
```
