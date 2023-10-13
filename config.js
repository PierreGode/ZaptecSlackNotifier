module.exports = {
    startSilentHour: 16,  // Begin silent period at 16:00 (4 PM)
    endSilentHour: 6,    // End silent period at 6:00 (6 AM)
    timeZone: 'Europe/Stockholm', // Set timezone for logging
    loudStart: 'false', // on service start set if the initial run should be promoting notifications
    silentDays: ['Saturday', 'Sunday'] // No notifications on Saturday and Sunday
};
