const DEFAULT_SETTINGS = {
    masterToggle: true,
    blacklist: ["*youtube.com*", "*twitter.com*", "*reddit.com*"],
    whitelist: ["https://wikipedia.org", "https://stackoverflow.com", "https://github.com"],
    schedule: {
        enabled: false,
        start: "09:00",
        end: "17:00"
    }
};

let settings = { ...DEFAULT_SETTINGS };

// Load settings on startup
chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    settings = items;
    console.log("TimeHole: Loaded settings", settings);
});

// Update settings when changed
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        for (let [key, { newValue }] of Object.entries(changes)) {
            settings[key] = newValue;
        }
        console.log("TimeHole: Updated settings", settings);
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
function handleNavigation(details) {
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
        const redirectUrl = getSafeUrl();
        chrome.tabs.update(details.tabId, { url: redirectUrl });
    }
}

// Listen for navigation
chrome.webNavigation.onBeforeNavigate.addListener(handleNavigation);

// Also listen for history state updates (SPA navigations like YouTube)
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);
