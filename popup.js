document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('popupToggle');
    const statusText = document.getElementById('statusText');
    const openOptionsBtn = document.getElementById('openOptions');

    // Sync State
    chrome.storage.sync.get(['masterToggle'], (result) => {
        const isActive = result.masterToggle !== false; // Default true
        updateUI(isActive);
    });

    // Handle Toggle
    toggle.addEventListener('change', (e) => {
        const newState = e.target.checked;
        chrome.storage.sync.set({ masterToggle: newState }, () => {
            updateUI(newState);
        });
    });

    // Handle Options Link
    openOptionsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    function updateUI(isActive) {
        toggle.checked = isActive;
        statusText.textContent = isActive ? "Active" : "Inactive";
        statusText.style.color = isActive ? "var(--success-color)" : "var(--text-secondary)";
    }
});
