// i18n helper - loads translations for HTML elements
(function () {
    // Get translated message
    function getMessage(key) {
        return chrome.i18n.getMessage(key) || key;
    }

    // Apply translations to all elements with data-i18n attribute
    function applyTranslations() {
        // Translate text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = getMessage(key);
        });

        // Translate placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = getMessage(key);
        });

        // Translate title attributes
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = getMessage(key);
        });

        // Update document title if needed
        const titleEl = document.querySelector('title[data-i18n]');
        if (titleEl) {
            document.title = getMessage(titleEl.getAttribute('data-i18n'));
        }
    }

    // Expose getMessage globally for use in other scripts
    window.i18n = getMessage;

    // Apply translations when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyTranslations);
    } else {
        applyTranslations();
    }
})();
