(function () {
    const elements = {
        terminalContent: document.getElementById('terminal-content'),
        terminalInput: document.getElementById('terminal-input'),
        terminalCursorPrefix: document.getElementById('terminal-cursor-prefix'),
        browserContent: document.getElementById('chat-messages'),
        browserInput: document.getElementById('browser-input'),
        terminalWindow: document.getElementById('terminal'),
        browserWindow: document.getElementById('browser'),
        browserBody: document.querySelector('#browser .window-body'),
        currentStep: document.getElementById('current-step'),
        stepTotal: document.getElementById('step-total'),
        title: document.getElementById('review-demo-title'),
        subtitle: document.getElementById('demo-subtitle'),
        note: document.getElementById('demo-note'),
        modeButtons: document.querySelectorAll('[data-demo-mode]'),
        playPause: document.getElementById('play-pause-btn'),
        next: document.getElementById('next-btn'),
        previous: document.getElementById('prev-btn')
    };

    let stepIndex = 0;
    let playing = true;
    let run = 0;
    let timer = null;
    let instant = false;

    const reviewSteps = [
        {
            setup: function () {
                setTerminal('demo-app  git:feature/order-validation\n\nStart a review of your current Git changes.', '$ ');
                elements.browserContent.innerHTML = '';
                elements.browserInput.textContent = '';
                switchWindow('terminal');
            },
            action: async function (runId) {
                await wait(700, runId);
                await typeText(elements.terminalInput, 'badger review', runId);
                await wait(900, runId);
                nextStep();
            }
        },
        {
            setup: function () {
                setTerminal('🦡 AIBADGER  ·  Review\n────────────────────────────────────────\n\n<span class="success">✓</span> Git changes collected\n<span class="success">✓</span> Relevant source context added\n<span class="success">✓</span> Review instructions prepared\n\n<span class="review-summary">2 changed files · 46 diff lines · 3 supporting files</span>\n\nThe review payload is ready. It includes the authoritative diff and bounded local context.\n\nCopy review context to clipboard? (y/N) ');
                switchWindow('terminal');
            },
            action: async function (runId) {
                await wait(900, runId);
                await typeText(elements.terminalInput, 'y', runId);
                await wait(700, runId);
                elements.terminalContent.innerHTML += '\n\n<span class="success">✓ Review context copied</span>';
                await wait(1000, runId);
                nextStep();
            }
        },
        {
            setup: function () {
                resetBrowserChat();
                switchWindow('browser');
            },
            action: async function (runId) {
                await wait(700, runId);
                elements.browserInput.innerHTML = '<span class="pasted-block">AI Badger review payload</span>';
                elements.browserInput.closest('.chat-input-area').classList.add('flash');
                await wait(600, runId);
                elements.browserInput.closest('.chat-input-area').classList.remove('flash');
                addMessage('user', '<span class="pasted-block"><strong>AI Badger review payload</strong><br>Review instructions · authoritative Git diff · relevant source context<br>2 changed files · 3 supporting files</span>');
                elements.browserInput.textContent = '';
                await wait(900, runId);
                nextStep();
            }
        },
        {
            setup: function () {
                resetBrowserChat();
                addInitialReviewPayload();
                switchWindow('browser');
            },
            action: async function (runId) {
                const loading = addMessage('ai', 'Reviewing changes…');
                await wait(1300, runId);
                loading.innerHTML = 'I need one more file to confirm this finding:<br><br>' +
                    '<span class="finding-location">FILE:internal/service/order.go</span>';
                scrollBrowser();
                await wait(1200, runId);
                nextStep();
            }
        },
        {
            setup: function () {
                setTerminal('🦡 AIBADGER  ·  Review\n────────────────────────────────────────\n\n<span class="success">✓</span> Prompt 1: Topology + Git diff copied. Paste it into any AI chat. If the AI requests additional context, paste only its FILE:, PREFIX:, or NEAR: selectors here. Final findings require no continuation.\n\nOptional review continuation. Paste selectors only if the AI requested additional context; final findings require no continuation.\n<span id="review-selector-size" class="review-summary">[text 0B] paste submits, Enter fallback</span>\n', '    1 ');
                elements.terminalInput.innerHTML = '<span class="review-summary">Optional: paste FILE/PREFIX/NEAR selectors here.</span>';
                switchWindow('terminal');
            },
            action: async function (runId) {
                await wait(900, runId);
                elements.terminalInput.textContent = 'FILE:internal/service/order.go';
                document.getElementById('review-selector-size').textContent = '[text 30B] paste submits, Enter fallback';
                await wait(2000, runId);
                nextStep();
            }
        },
        {
            setup: function () {
                setTerminal('🦡 AIBADGER  ·  Review\n────────────────────────────────────────\n\nCode context ready. Review the file list before copying Prompt 2: Code Context.\n\nReady to copy Prompt 2: Code Context to your clipboard.\n\n<span class="warning">⚠️  This WILL include the actual source code from:</span>\n  - internal/service/order.go\n\nCopy Prompt 2: Code Context to clipboard (payload: 18KB)? (y/N) ');
                switchWindow('terminal');
            },
            action: async function (runId) {
                await wait(900, runId);
                await typeText(elements.terminalInput, 'y', runId);
                await wait(700, runId);
                elements.terminalContent.innerHTML += '\n\n<span class="success">✓ Prompt 2: Code Context copied</span>';
                await wait(1000, runId);
                nextStep();
            }
        },
        {
            setup: function () {
                resetBrowserChat();
                addInitialReviewPayload();
                addFollowupRequest();
                switchWindow('browser');
            },
            action: async function (runId) {
                await wait(700, runId);
                elements.browserInput.innerHTML = '<span class="pasted-block">Prompt 2: Code Context</span>';
                elements.browserInput.closest('.chat-input-area').classList.add('flash');
                await wait(600, runId);
                elements.browserInput.closest('.chat-input-area').classList.remove('flash');
                addMessage('user', '<span class="pasted-block"><strong>Prompt 2: Code Context</strong><br>1 requested file · original diff not resent</span>');
                elements.browserInput.textContent = '';
                await wait(900, runId);
                nextStep();
            }
        },
        {
            setup: function () {
                resetBrowserChat();
                addInitialReviewPayload();
                addFollowupRequest();
                addFollowupContext();
                switchWindow('browser');
            },
            action: async function (runId) {
                const loading = addMessage('ai', 'Finishing the review with the requested file…');
                await wait(1300, runId);
                loading.innerHTML = '<span class="finding-title">P1 · Validation can be bypassed for amended orders</span><br>' +
                    '<span class="finding-location">internal/service/order.go:84</span><br><br>' +
                    'The new validation runs only when an order is created. Updates can change the quantity to zero and reach <code>Save</code> without the same guard. Apply the validation before both write paths.<br><br>' +
                    '<strong>Everything else in the supplied changes looks sound.</strong>';
                scrollBrowser();
                playing = false;
                updatePlayPause();
            }
        }
    ];

    const designSteps = [
        {
            setup: function () {
                setTerminal('🦡 AIBADGER  ·  Design\n────────────────────────────────────────\n\nWhat do you want to explore or design?', '> ');
                elements.browserContent.innerHTML = '';
                elements.browserInput.textContent = '';
                switchWindow('terminal');
            },
            action: async function (runId) {
                await wait(700, runId);
                await typeText(elements.terminalInput, 'Design rate limiting for the public API', runId);
                await wait(900, runId);
                nextStep();
            }
        },
        {
            setup: function () {
                setTerminal('🦡 AIBADGER  ·  Design\n────────────────────────────────────────\n\n<span class="success">✓</span> Project structure mapped\n<span class="success">✓</span> Languages and modules identified\n\n<span class="review-summary">Structure only · no source code included</span>\n\nCopy Design prompt to clipboard? (y/N) ');
                switchWindow('terminal');
            },
            action: async function (runId) {
                await wait(800, runId);
                await typeText(elements.terminalInput, 'y', runId);
                await wait(700, runId);
                elements.terminalContent.innerHTML += '\n\n<span class="success">✓ Design prompt copied</span>';
                await wait(900, runId);
                nextStep();
            }
        },
        {
            setup: function () {
                elements.browserContent.innerHTML = '';
                elements.browserInput.textContent = '';
                switchWindow('browser');
            },
            action: async function (runId) {
                await wait(650, runId);
                elements.browserInput.innerHTML = '<span class="pasted-block">Design goal + project topology</span>';
                elements.browserInput.closest('.chat-input-area').classList.add('flash');
                await wait(550, runId);
                elements.browserInput.closest('.chat-input-area').classList.remove('flash');
                addMessage('user', '<span class="pasted-block">Design rate limiting for the public API.<br>Project topology · modules · source tree</span>');
                elements.browserInput.textContent = '';
                await wait(900, runId);
                nextStep();
            }
        },
        {
            setup: function () {
                switchWindow('browser');
                if (!elements.browserContent.children.length) {
                    addMessage('user', '<span class="pasted-block">Design rate limiting for the public API.<br>Project topology · modules · source tree</span>');
                }
            },
            action: async function (runId) {
                const message = addMessage('ai', 'Finding the smallest relevant context…');
                await wait(1100, runId);
                message.innerHTML = 'I need these focused files before proposing the design:<br><br><span class="finding-location">FILE:internal/server/router.go<br>FILE:internal/config/config.go<br>NEAR:internal/server/middleware.go#Middleware</span>';
                scrollBrowser();
                await wait(1200, runId);
                nextStep();
            }
        },
        {
            setup: function () {
                setTerminal('🦡 AIBADGER  ·  Design\n────────────────────────────────────────\n\n<span class="success">✓</span> 3 focused selectors received\n<span class="success">✓</span> Relevant source context extracted\n\nReady to copy Prompt 2. Only the requested source context is included.\n\nCopy focused Design context? (y/N) ');
                switchWindow('terminal');
            },
            action: async function (runId) {
                await wait(800, runId);
                await typeText(elements.terminalInput, 'y', runId);
                await wait(900, runId);
                nextStep();
            }
        },
        {
            setup: function () {
                switchWindow('browser');
                elements.browserContent.innerHTML = '';
                addMessage('user', '<span class="pasted-block">Focused Design context · 3 requested files</span>');
            },
            action: async function (runId) {
                const loading = addMessage('ai', 'Designing with the supplied context…');
                await wait(1300, runId);
                loading.innerHTML = '<strong>Recommended design</strong><br><br>Add a token-bucket middleware at the existing router boundary, configured through the current config loader. Keep limits per route group and inject the clock for deterministic tests.<br><br><strong>Implementation plan</strong><br>1. Add rate-limit configuration<br>2. Implement middleware with bounded state<br>3. Attach it to public routes<br>4. Cover bursts, recovery, and cancellation';
                scrollBrowser();
                playing = false;
                updatePlayPause();
            }
        }
    ];

    const modes = {
        review: {
            title: 'Focused code review',
            subtitle: 'Badger packages your Git changes, then adds only the source context your AI chat requests.',
            note: '<strong>One paste is usually enough.</strong> If more context is needed, Badger can provide specific files.',
            steps: reviewSteps
        },
        design: {
            title: 'Design with codebase context',
            subtitle: 'Explore architecture and plan changes without uploading your repository.',
            note: '<strong>You control what leaves your machine.</strong> The first prompt contains structure only; source is included only when you copy focused context.',
            steps: designSteps
        }
    };

    let mode = new URLSearchParams(window.location.search).get('mode');
    if (!modes[mode]) mode = 'review';
    let steps = modes[mode].steps;

    function setTerminal(content, prefix) {
        elements.terminalContent.innerHTML = content;
        elements.terminalCursorPrefix.textContent = prefix || '';
        elements.terminalInput.textContent = '';
    }

    function addMessage(type, html) {
        const message = document.createElement('div');
        message.className = 'chat-message ' + type + '-message';
        message.innerHTML = html;
        elements.browserContent.appendChild(message);
        scrollBrowser();
        return message;
    }

    function resetBrowserChat() {
        elements.browserContent.innerHTML = '';
        elements.browserInput.textContent = '';
    }

    function addInitialReviewPayload() {
        addMessage('user', '<span class="pasted-block"><strong>AI Badger review payload</strong><br>Review instructions · authoritative Git diff · relevant source context<br>2 changed files · 3 supporting files</span>');
    }

    function addFollowupRequest() {
        addMessage('ai', 'I need one more file to confirm this finding:<br><br><span class="finding-location">FILE:internal/service/order.go</span>');
    }

    function addFollowupContext() {
        addMessage('user', '<span class="pasted-block"><strong>Prompt 2: Code Context</strong><br>1 requested file · original diff not resent</span>');
    }

    function scrollBrowser() {
        elements.browserBody.scrollTop = elements.browserBody.scrollHeight;
    }

    function switchWindow(target) {
        elements.terminalWindow.classList.toggle('active', target === 'terminal');
        elements.browserWindow.classList.toggle('active', target === 'browser');
    }

    function wait(milliseconds, runId) {
        if (runId === null) return Promise.resolve();
        return new Promise(function (resolve) {
            timer = setTimeout(function () {
                if (runId === run) resolve();
            }, milliseconds);
        });
    }

    async function typeText(element, text, runId) {
        for (const character of text) {
            element.textContent += character;
            await wait(55, runId);
        }
    }

    function stop() {
        run += 1;
        if (timer) clearTimeout(timer);
    }

    function render() {
        stop();
        elements.currentStep.textContent = stepIndex + 1;
        steps[stepIndex].setup();
        if (playing) {
            steps[stepIndex].action(run);
        } else {
            instant = true;
            Promise.resolve(steps[stepIndex].action(null)).then(function () { instant = false; });
        }
    }

    function nextStep() {
        if (!instant && stepIndex < steps.length - 1) {
            stepIndex += 1;
            render();
        }
    }

    function updatePlayPause() {
        elements.playPause.textContent = playing ? 'Pause' : 'Play';
    }

    function selectMode(nextMode, updateURL) {
        mode = nextMode;
        steps = modes[mode].steps;
        stepIndex = 0;
        playing = true;
        elements.title.textContent = modes[mode].title;
        elements.subtitle.textContent = modes[mode].subtitle;
        elements.note.innerHTML = modes[mode].note;
        elements.stepTotal.textContent = steps.length;
        elements.modeButtons.forEach(function (button) {
            button.setAttribute('aria-pressed', button.dataset.demoMode === mode ? 'true' : 'false');
        });
        updatePlayPause();
        if (updateURL) {
            const url = new URL(window.location.href);
            url.searchParams.set('mode', mode);
            window.history.replaceState({}, '', url);
        }
        render();
    }

    elements.playPause.addEventListener('click', function () {
        playing = !playing;
        updatePlayPause();
        if (playing) render(); else stop();
    });

    elements.next.addEventListener('click', function () {
        playing = false;
        updatePlayPause();
        stop();
        nextStep();
    });

    elements.previous.addEventListener('click', function () {
        playing = false;
        updatePlayPause();
        if (stepIndex > 0) {
            stepIndex -= 1;
            render();
        }
    });

    elements.modeButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            if (button.dataset.demoMode !== mode) selectMode(button.dataset.demoMode, true);
        });
    });

    selectMode(mode, false);
}());
