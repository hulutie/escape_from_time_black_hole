const DEFAULT_SETTINGS = {
    masterToggle: true,
    blacklist: ["*youtube.com*", "*twitter.com*", "*reddit.com*"],
    whitelist: ["https://wikipedia.org", "https://stackoverflow.com", "https://github.com"],
    schedule: {
        enabled: false,
        start: "09:00",
        end: "17:00"
    },
    autoReenableMinutes: 5 // Default 5 minutes
};

let settings = { ...DEFAULT_SETTINGS };
let reenableAlarmName = 'autoReenable';

// Restore badge on startup
function restoreBadge() {
    chrome.storage.local.get(['stats'], (result) => {
        if (result.stats && result.stats.today && result.stats.lastDate === new Date().toDateString()) {
            const action = chrome.action || chrome.browserAction;
            if (action) {
                action.setBadgeText({ text: result.stats.today.toString() });
                action.setBadgeBackgroundColor({ color: '#FF4444' });
            }
        }
    });
}

// Force enable protection on browser startup
chrome.runtime.onStartup.addListener(() => {
    console.log("TimeHole: Browser started, ensuring protection is enabled. Ver: Stats-Debug-v2");
    chrome.storage.sync.set({ masterToggle: true });
    // Clear any pending re-enable timestamp since we just enabled
    chrome.storage.local.remove('reenableTime');
    restoreBadge();
});

// Also force enable on extension install/update
chrome.runtime.onInstalled.addListener(() => {
    console.log("TimeHole: Extension installed/updated, ensuring protection is enabled. Ver: Stats-Debug-v2");
    chrome.storage.sync.set({ masterToggle: true });
    chrome.storage.local.remove('reenableTime');
    restoreBadge();
});

// Load settings on startup
const settingsReady = new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
        settings = items;
        console.log("TimeHole: Loaded settings", settings);
        resolve();
    });
});

// Update settings when changed
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
            settings[key] = newValue;

            // If masterToggle changed from true to false, start the re-enable timer
            if (key === 'masterToggle') {
                if (oldValue === true && newValue === false) {
                    startReenableTimer();
                } else if (newValue === true) {
                    // Protection re-enabled, clear timer
                    cancelReenableTimer();
                }
            }
        }
        console.log("TimeHole: Updated settings", settings);
    }
});

// Start the auto re-enable timer using chrome.alarms
function startReenableTimer() {
    const minutes = settings.autoReenableMinutes || 5;
    const reenableTime = Date.now() + minutes * 60 * 1000;

    // Store the re-enable timestamp for popup countdown display
    chrome.storage.local.set({ reenableTime: reenableTime });

    // Create an alarm that will fire after the specified minutes
    chrome.alarms.create(reenableAlarmName, {
        delayInMinutes: minutes
    });

    console.log(`TimeHole: Auto re-enable timer started for ${minutes} minutes`);
}

// Cancel the re-enable timer
function cancelReenableTimer() {
    chrome.alarms.clear(reenableAlarmName);
    chrome.storage.local.remove('reenableTime');
    console.log("TimeHole: Auto re-enable timer cancelled");
}

// Handle alarm firing
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === reenableAlarmName) {
        console.log("TimeHole: Auto re-enable timer fired, enabling protection");
        chrome.storage.sync.set({ masterToggle: true });
        chrome.storage.local.remove('reenableTime');
    }
});

// Helper: Convert wildcard string to Regex
function wildcardToRegex(pattern) {
    // Escape special regex characters, then replace * with .*
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regexString = '^' + escaped.replace(/\*/g, '.*') + '$';
    return new RegExp(regexString, 'i'); // Case insensitive
}

// Helper: Check if URL matches blacklist
function isBlacklisted(url) {
    if (!url || !url.startsWith('http')) return false;

    // Remove protocol and www for easier matching in some cases, 
    // but full match is safer given user inputs.
    // We will matching against the full URL for max flexibility.

    return settings.blacklist.some(pattern => {
        const regex = wildcardToRegex(pattern);
        return regex.test(url);
    });
}

// Helper: Check time schedule
function isWithinSchedule() {
    if (!settings.schedule.enabled) return true; // If schedule disabled, block is always active (handled by MasterToggle) 
    // Wait, requirement: "在生效时间段内才拦截，其余时间可以允许"
    // So if schedule is enabled, we ONLY block if current time is within range.

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = settings.schedule.start.split(':').map(Number);
    const [endH, endM] = settings.schedule.end.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight schedules (e.g. 23:00 to 06:00)
    if (endMinutes < startMinutes) {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    } else {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
}

// Helper: Get random whitelist URL
function getSafeUrl() {
    if (!settings.whitelist || settings.whitelist.length === 0) {
        return "https://google.com"; // Fallback
    }
    const randomIndex = Math.floor(Math.random() * settings.whitelist.length);
    let url = settings.whitelist[randomIndex];
    if (!url.startsWith('http')) url = 'https://' + url;
    return url;
}

// Core Interceptor
async function handleNavigation(details) {
    // Ensure settings are loaded before processing
    await settingsReady;

    // 1. Check Master Switch
    if (!settings.masterToggle) return;

    // 2. Check Schedule
    // If schedule is ENABLED, we only proceed if we are INSIDE the schedule.
    // If schedule is DISABLED, we assume constant protection (unless user logic implies otherwise? User said: "User can also customize time period... intercept ONLY within effective time period").
    // So if schedule.enabled is false, does it mean "Always active" or "Never active"?
    // Usually "Enable Schedule" implies "Restrict blocking to this time". If unchecked, it blocks 24/7.
    if (settings.schedule.enabled && !isWithinSchedule()) return;

    // 3. Check Frame: Only intercept the main frame (address bar navigation) to prevent iframes from hijacking the page.
    if (details.frameId !== 0) return;

    const url = details.url;

    // 3. Avoid redirection loops: if we are already going to a whitelisted URL, ignore.
    // Just a quick check to see if the URL exactly matches one of the whitelist items to avoid checking blacklist against whitelist sites if they overlap?
    // Actually, just check blacklist first.

    // 4. Check Blacklist
    if (isBlacklisted(url)) {
        console.log(`TimeHole: Blocking ${url}`);

        // Update statistics
        console.log("TimeHole: Fetching stats for update...");
        chrome.storage.local.get(['stats'], (result) => {
            console.log("TimeHole: Retrieved stats:", result.stats);

            let stats = result.stats || { total: 0, today: 0, lastDate: '', urls: {} };

            // Check if we need to reset for a new day
            const todayStr = new Date().toDateString();
            if (stats.lastDate !== todayStr) {
                stats.today = 0;
                stats.urls = {}; // Reset detailed stats for the new day
                stats.lastDate = todayStr;
            }

            stats.total = (stats.total || 0) + 1;
            stats.today = (stats.today || 0) + 1;
            stats.urls = stats.urls || {};
            stats.urls[url] = (stats.urls[url] || 0) + 1;

            // Update Badge Logic
            const action = chrome.action || chrome.browserAction;
            if (action) {
                action.setBadgeText({ text: stats.today.toString() });
                action.setBadgeBackgroundColor({ color: '#FF4444' }); // Alert Red
            }

            console.log("TimeHole: Saving new stats:", stats);
            chrome.storage.local.set({ stats: stats }, () => {
                console.log("TimeHole: Stats saved successfully. Executing redirect.");

                // Redirect AFTER stats are saved to ensure no race conditions
                const redirectUrl = getSafeUrl();
                chrome.tabs.update(details.tabId, { url: redirectUrl });
            });
        });

        // Return immediately to allow async processing, though standard "blocking" webRequest 
        // allows blocking. But we are using chrome.webNavigation which doesn't support blocking.
        // We are just updating the tab. The race condition suspicion is valid.
    }
}

// Listen for navigation
chrome.webNavigation.onBeforeNavigate.addListener(handleNavigation);

// Also listen for history state updates (SPA navigations like YouTube)
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);
