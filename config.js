module.exports = {
    startSilentHour: 16,  // Begin silent period at 16:00 (4 PM)
    endSilentHour: 6,    // End silent period at 6:00 (6 AM)
    timeZone: 'Europe/Stockholm', // Set timezone for logging
    silentStart: true, // on service start set if the initial run should be promoting notifications
    Zaptechupdateinterval: 180000, // set the time between api calls to Zaptec portal: 180000 is 3 minutes between calls 
    silentDays: ['Saturday', 'Sunday'] // No notifications on Saturday and Sunday
};
