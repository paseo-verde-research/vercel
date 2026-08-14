(() => {
    const steps = Array.from(document.querySelectorAll('[data-step]'));
    const progress = Array.from(document.querySelectorAll('[data-progress]'));
    const copyButton = document.querySelector('.vscode-copy-icon');
    let revealTimer;

    function hintCopyButton() {
        if (!copyButton) {
            return;
        }
        copyButton.classList.remove('attention');
        requestAnimationFrame(() => copyButton.classList.add('attention'));
    }

    function showStep(index) {
        window.clearTimeout(revealTimer);
        steps.forEach((step, stepIndex) => {
            const active = stepIndex === index;
            step.hidden = !active;
            step.classList.toggle('active', active);
            step.classList.toggle('reveal-result', active && index === 2);
            step.classList.remove('result-visible');
        });

        progress.forEach((item, itemIndex) => {
            const active = itemIndex === index;
            item.classList.toggle('active', active);
            if (active) {
                item.setAttribute('aria-current', 'step');
            } else {
                item.removeAttribute('aria-current');
            }
        });

        if (index === 2) {
            revealTimer = window.setTimeout(() => {
                steps[2]?.classList.add('result-visible');
            }, 520);
        }
    }

    document.addEventListener('click', event => {
        const next = event.target.closest('[data-next]');
        const restart = event.target.closest('[data-restart]');
        const focusCopy = event.target.closest('[data-focus-copy]');

        if (next) {
            showStep(Number(next.dataset.next));
        } else if (focusCopy && copyButton) {
            copyButton.classList.remove('attention');
            copyButton.focus({ preventScroll: true });
            requestAnimationFrame(() => copyButton.classList.add('attention'));
        } else if (restart) {
            showStep(0);
            hintCopyButton();
        }
    });

    showStep(0);
    hintCopyButton();
})();
