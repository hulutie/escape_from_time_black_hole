document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('popupToggle');
    const statusText = document.getElementById('statusText');
    const openOptionsBtn = document.getElementById('openOptions');

    // Verification Modal Elements
    const modal = document.getElementById('verificationModal');
    const challengeCodeEl = document.getElementById('challengeCode');
    const verifyInput = document.getElementById('verifyInput');
    const verifyError = document.getElementById('verifyError');
    const cancelBtn = document.getElementById('cancelVerify');
    const confirmBtn = document.getElementById('confirmVerify');

    let currentChallenge = '';

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

    // Sync State
    chrome.storage.sync.get(['masterToggle'], (result) => {
        const isActive = result.masterToggle !== false; // Default true
        updateUI(isActive);
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
            });
        } else {
            // Failed - show error and generate new code
            verifyError.textContent = 'Incorrect code. Try again with the new code.';
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
        statusText.textContent = isActive ? "Active" : "Inactive";
        statusText.style.color = isActive ? "var(--success-color)" : "var(--text-secondary)";
    }
});
