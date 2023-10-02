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

Clone this repository
```
git clone https://github.com/PierreGode/ZaptecSlackNotifier.git
```
```
cd ZaptecSlackNotifier
```
4. Configuration
Update ZaptecSlackNotifier.js with the required configurations:

Zaptec Credentials: These are your username and password for the Zaptec platform.
```
USERNAME: Your Zaptec username.
PASSWORD: Your Zaptec password.
```
Slack Configuration: These details allow you to send messages to your Slack workspace.

Slack application is required.
```
SLACK_TOKEN: Your Slack API token. You can get this from Slack API.
SLACK_CHANNEL: The Slack channel ID where the notifications should be sent.
```

Running the Notifier
Once you've set up the configurations, run the notifier using:
```
node node.js
```
preferably setup an @reboot node /home/user/ZaptecSlackNotifier/node.js in crontab

ZaptecSlackNotifier will send notifications about a charger when it becomes available, updates are pulled every 5 minutes but notifications will not be repeated until the status is changed.
notifocation is only sent when OperatingMode == 1 and 1 = Charger is available!
Notifications are silenced after work hours 17-06.



