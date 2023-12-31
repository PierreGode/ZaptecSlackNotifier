# ZaptecSlackNotifier


![image](https://github.com/PierreGode/ZaptecSlackNotifier/assets/8579922/badc54dc-ca64-4c54-9ad3-786d857eadc3)



Send notifications of availible Zaptec chargers that are availible in your Zaptec account to Slack


Node.js & npm: This is the runtime environment for executing JavaScript code server-side.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/J3J2EARPK)

Slack application is required for the enterprise version of Slack and depending on security permissions slack token might be required<p>
For personal Slack, webhook app can be configured directly without any tokens



## Clone this repository
```
git clone https://github.com/PierreGode/ZaptecSlackNotifier.git
```
```
cd ZaptecSlackNotifier
```
## Prerequisites
Before you proceed, ensure you have the following:
```
sudo apt-get install npm
```
```
npm install axios @slack/web-api
```

```
npm install dotenv
```

## Setup
Create a .env file: At the root of your project, create a file named .env
```
touch .env
```

Add your secrets/configuration: Inside this file, you can set your environment variables as key-value pairs:

```
ZAPTEC_USERNAME=myUsername
ZAPTEC_PASSWORD=myPassword
SLACKBOT_NAME=ZaptecBot
SLACKBOT_ICON=https://raw.githubusercontent.com/PierreGode/ZaptecSlackNotifier/2b1f8830cd258a5f73a67ece179bbba17b4332de/images/zaptec.png
SLACK_WEBHOOK_URL=myWebhookURL
SLACK_TOKEN=BotUserOAuthToken
SLACK_WEBHOOK_PRIVATE_URL=myPrivateWebhookURL
COMPANY_NAME=word
EXCLUDE_DEVICES=devicename1,devicename2
```

COMPANY_NAME= comapany name or word to be removed from status eg api presents your chargers as company 01 company 02 company 03 company 04 you can remove the word company by adding it to .env COMPANY_NAME=company and the result will be 01 02 03 04<p>
Access in code: With the help of libraries like dotenv, you can easily load these variables into your application's environment. For Node.js applications, after setting up dotenv, you can access these variables using process.env.VARIABLE_NAME.<p>
note that it is never a good practice to store passwords in clear text on a file, this example is to get started locally.
SLACK_WEBHOOK_PRIVATE_URL= can be used to post charge complete notifications to another channel (private message) than normal charge station update notifications. If not configured, all notifications will be sent to the SLACK_WEBHOOK_URL.
SLACKBOT_ICON / SLACKBOT_NAME allows you to control the appearance of the messages from the app instead of having to do it in the slack setup.
EXCLUDE_DEVICES= can be used to ignore devices that you have access to, but don't want to have included in the slack notifications

## Running the Notifier
Once you've set up the configurations, run the notifier using:
```
node node.js
```
preferably setup an @reboot sleep 60 && /usr/local/bin/node /home/pi/ZaptecSlackNotifier/node.js >> /var/log/slack.log 2>&1 in crontab

ZaptecSlackNotifier will send notifications about a charger when it becomes available, updates are pulled every 5 minutes but notifications will not be repeated until the status is changed.
notifocation is only sent when OperatingMode == 1 and 1 = Charger is available! and OperatingMode == 3 Charger has stopped charging<p>
Notifications are silenced after work hours 16-06 and weekends. This can be configured in config.js<p>
//@Created By  [Pierre Gode](https://github.com/PierreGode), Updated by [Jonas Högström](https://github.com/jonashogstrom)
