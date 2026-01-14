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

    function updateUI(isActive) {
        toggle.checked = isActive;
        const activeText = window.i18n ? window.i18n('statusActive') : 'Active';
        const inactiveText = window.i18n ? window.i18n('statusInactive') : 'Inactive';
        statusText.textContent = isActive ? activeText : inactiveText;
        statusText.style.color = isActive ? "var(--success-color)" : "var(--text-secondary)";
    }
});
