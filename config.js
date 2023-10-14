module.exports = {
    startSilentHour: 12,  // Begin silent period at 16:00 (4 PM)
    endSilentHour: 13,    // End silent period at 6:00 (6 AM)
    silentDays: ['Friday', 'Monday'], // No notifications on assigned days
    timeZone: 'Europe/Stockholm', // Set timezone for logging
    zaptecUpdateInterval: 3*60*1000, // 3 min, the time in milliseconds between api calls to Zaptec portal
    zaptecTokenRefreshInterval: 24*60*60*1000, // 24h
    silentStart: false, // on service start set if the initial run should be promoting notifications
    showChargingdata: false,
    iconSet: 2 // 1: unicode circles, 2: unicode icons, 3: slack emojis
};
