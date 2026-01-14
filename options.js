// Default settings
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

// DOM Elements
const masterToggle = document.getElementById('masterToggle');
const blacklistArea = document.getElementById('blacklist');
const whitelistArea = document.getElementById('whitelist');
const startTime = document.getElementById('startTime');
const endTime = document.getElementById('endTime');
const enableSchedule = document.getElementById('enableSchedule');
const saveBtn = document.getElementById('saveBtn');
const statusDisplay = document.getElementById('status');

// Load settings
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
        masterToggle.checked = items.masterToggle;
        blacklistArea.value = items.blacklist.join('\n');
        whitelistArea.value = items.whitelist.join('\n');
        
        startTime.value = items.schedule.start;
        endTime.value = items.schedule.end;
        enableSchedule.checked = items.schedule.enabled;
    });
});

// Save settings
saveBtn.addEventListener('click', () => {
    // Parse list inputs
    const blacklist = blacklistArea.value.split('\n').map(s => s.trim()).filter(s => s);
    const whitelist = whitelistArea.value.split('\n').map(s => s.trim()).filter(s => s);

    // Validate simple settings
    if (whitelist.length === 0) {
        statusDisplay.style.color = 'var(--danger-color)';
        statusDisplay.textContent = 'Whitelist cannot be empty!';
        return;
    }

    const settings = {
        masterToggle: masterToggle.checked,
        blacklist: blacklist,
        whitelist: whitelist,
        schedule: {
            enabled: enableSchedule.checked,
            start: startTime.value,
            end: endTime.value
        }
    };

    chrome.storage.sync.set(settings, () => {
        statusDisplay.style.color = 'var(--success-color)';
        statusDisplay.textContent = 'Options saved successfully.';
        setTimeout(() => {
            statusDisplay.textContent = '';
        }, 3000);
    });
});
