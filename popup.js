document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('popupToggle');
    const statusText = document.getElementById('statusText');
    const openOptionsBtn = document.getElementById('openOptions');
    const countdownContainer = document.getElementById('countdownContainer');
    const countdownTimer = document.getElementById('countdownTimer');

    // Verification Modal Elements
    const modal = document.getElementById('verificationModal');
    const challengeCodeEl = document.getElementById('challengeCode');
    const verifyInput = document.getElementById('verifyInput');
    const verifyError = document.getElementById('verifyError');
    const cancelBtn = document.getElementById('cancelVerify');
    const confirmBtn = document.getElementById('confirmVerify');

    let currentChallenge = '';
    let countdownInterval = null;

    // Generate random challenge code
    function generateChallenge() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
        let code = '';
        const length = 6;
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Show verification modal
    function showVerificationModal() {
        currentChallenge = generateChallenge();
        challengeCodeEl.textContent = currentChallenge;
        verifyInput.value = '';
        verifyError.textContent = '';
        modal.classList.add('show');
        verifyInput.focus();
    }

    // Hide verification modal
    function hideVerificationModal() {
        modal.classList.remove('show');
        currentChallenge = '';
        verifyInput.value = '';
        verifyError.textContent = '';
    }

    // Format remaining time as MM:SS
    function formatTime(ms) {
        if (ms <= 0) return '00:00';
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Update countdown display
    function updateCountdown() {
        chrome.storage.local.get(['reenableTime'], (result) => {
            const reenableTime = result.reenableTime;

            if (reenableTime) {
                const remaining = reenableTime - Date.now();

                if (remaining > 0) {
                    countdownContainer.style.display = 'block';
                    countdownTimer.textContent = formatTime(remaining);
                } else {
                    // Timer expired, hide countdown
                    countdownContainer.style.display = 'none';
                    countdownTimer.textContent = '--:--';
                }
            } else {
                countdownContainer.style.display = 'none';
                countdownTimer.textContent = '--:--';
            }
        });
    }

    // Start countdown interval
    function startCountdownInterval() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
    }

    // Stop countdown interval
    function stopCountdownInterval() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        countdownContainer.style.display = 'none';
    }

    // Sync State
    chrome.storage.sync.get(['masterToggle'], (result) => {
        const isActive = result.masterToggle !== false; // Default true
        updateUI(isActive);

        // Start countdown if protection is disabled
        if (!isActive) {
            startCountdownInterval();
        }
    });

    // Listen for storage changes to update countdown in real-time
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.masterToggle) {
            const isActive = changes.masterToggle.newValue;
            updateUI(isActive);

            if (isActive) {
                stopCountdownInterval();
            } else {
                startCountdownInterval();
            }
        }

        if (namespace === 'local' && changes.reenableTime) {
            if (changes.reenableTime.newValue) {
                startCountdownInterval();
            } else {
                stopCountdownInterval();
            }
        }
    });

    // Handle Toggle
    toggle.addEventListener('change', (e) => {
        const newState = e.target.checked;

        // If user is trying to DISABLE protection, show verification
        if (!newState) {
            // Revert the toggle immediately while verification is pending
            e.target.checked = true;
            showVerificationModal();
        } else {
            // Enabling protection - no verification needed
            chrome.storage.sync.set({ masterToggle: newState }, () => {
                updateUI(newState);
                stopCountdownInterval();
            });
        }
    });

    // Cancel verification
    cancelBtn.addEventListener('click', () => {
        hideVerificationModal();
    });

    // Confirm verification
    confirmBtn.addEventListener('click', () => {
        attemptVerification();
    });

    // Handle Enter key in input
    verifyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            attemptVerification();
        }
    });

    // Clear error on input
    verifyInput.addEventListener('input', () => {
        verifyError.textContent = '';
    });

    // Attempt to verify the input
    function attemptVerification() {
        const userInput = verifyInput.value.trim().toUpperCase();

        if (userInput === currentChallenge) {
            // Success - disable protection
            chrome.storage.sync.set({ masterToggle: false }, () => {
                updateUI(false);
                hideVerificationModal();
                startCountdownInterval();
            });
        } else {
            // Failed - show error and generate new code
            verifyError.textContent = window.i18n ? window.i18n('incorrectCode') : 'Incorrect code. Try again with the new code.';
            verifyInput.value = '';
            currentChallenge = generateChallenge();
            challengeCodeEl.textContent = currentChallenge;
            verifyInput.focus();

            // Add shake animation
            challengeCodeEl.style.animation = 'none';
            challengeCodeEl.offsetHeight; // Trigger reflow
            challengeCodeEl.style.animation = 'shake 0.5s ease';
        }
    }

    // Handle Options Link
    openOptionsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Stats Elements
    const totalRedirectsCount = document.getElementById('totalRedirectsCount');
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
    const statsModal = document.getElementById('statsModal');
    const statsList = document.getElementById('statsList');
    const closeStatsX = document.getElementById('closeStats');
    const closeStatsBtn = document.getElementById('closeStatsBtn');

    // Update stats display
    function updateStatsDisplay() {
        chrome.storage.local.get(['stats'], (result) => {
            const stats = result.stats || { total: 0 };
            totalRedirectsCount.textContent = stats.total;
        });
    }

    // Call on load
    updateStatsDisplay();

    // View Details Click
    viewDetailsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showStatsModal();
    });

    // Show Stats Modal
    function showStatsModal() {
        chrome.storage.local.get(['stats'], (result) => {
            const stats = result.stats || { total: 0, urls: {} };

            // Clear list
            statsList.innerHTML = '';

            const urls = Object.entries(stats.urls);

            if (urls.length === 0) {
                const noData = document.createElement('div');
                noData.className = 'no-stats';
                noData.style.padding = '1rem';
                noData.style.textAlign = 'center';
                noData.style.color = 'var(--text-secondary)';
                noData.textContent = window.i18n ? window.i18n('noStats') : 'No redirects yet.';
                statsList.appendChild(noData);
            } else {
                // Sort by count descending
                urls.sort((a, b) => b[1] - a[1]);

                // Create table-like structure
                const table = document.createElement('div');
                table.style.display = 'flex';
                table.style.flexDirection = 'column';
                table.style.gap = '0.5rem';

                urls.forEach(([url, count]) => {
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.justifyContent = 'space-between';
                    row.style.alignItems = 'center';
                    row.style.padding = '0.5rem';
                    row.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    row.style.borderRadius = '4px';

                    const urlEl = document.createElement('div');
                    urlEl.style.flex = '1';
                    urlEl.style.overflow = 'hidden';
                    urlEl.style.textOverflow = 'ellipsis';
                    urlEl.style.whiteSpace = 'nowrap';
                    urlEl.style.marginRight = '1rem';
                    urlEl.style.fontSize = '0.9rem';
                    urlEl.title = url; // Tooltip
                    urlEl.textContent = url;

                    const countEl = document.createElement('div');
                    countEl.style.fontWeight = 'bold';
                    countEl.style.color = 'var(--primary-color)';
                    countEl.textContent = count;

                    row.appendChild(urlEl);
                    row.appendChild(countEl);
                    table.appendChild(row);
                });

                statsList.appendChild(table);
            }

            statsModal.classList.add('show');
        });
    }

    // Hide Stats Modal
    function hideStatsModal() {
        statsModal.classList.remove('show');
    }

    closeStatsX.addEventListener('click', hideStatsModal);
    closeStatsBtn.addEventListener('click', hideStatsModal);

    // Clear Stats
    const clearStatsBtn = document.getElementById('clearStatsBtn');
    clearStatsBtn.addEventListener('click', () => {
        chrome.storage.local.get(['stats'], (result) => {
            const stats = result.stats || {};

            // Reset daily stats
            stats.today = 0;
            stats.urls = {};
            // We keep stats.total as is (lifetime count)
            // Or should we? "Clear records to give stats a chance".
            // Since the badge is today's count, clearing today is enough.

            chrome.storage.local.set({ stats: stats }, () => {
                // Update UI
                showStatsModal(); // Refresh the list (will show empty)

                // Clear badge
                const action = chrome.action || chrome.browserAction;
                if (action) {
                    action.setBadgeText({ text: '' });
                }
            });
        });
    });

    function updateUI(isActive) {
        toggle.checked = isActive;
        const activeText = window.i18n ? window.i18n('statusActive') : 'Active';
        const inactiveText = window.i18n ? window.i18n('statusInactive') : 'Inactive';
        statusText.textContent = isActive ? activeText : inactiveText;
        statusText.style.color = isActive ? "var(--success-color)" : "var(--text-secondary)";
    }
});
