(function() {
    const elements = {
        terminalContent: document.getElementById('terminal-content'),
        terminalInput: document.getElementById('terminal-input'),
        terminalCursorPrefix: document.getElementById('terminal-cursor-prefix'),
        browserContent: document.getElementById('chat-messages'),
        browserInput: document.getElementById('browser-input'),
        terminalWindow: document.getElementById('terminal'),
        browserWindow: document.getElementById('browser'),
        currentStepEl: document.getElementById('current-step'),
        playPauseBtn: document.getElementById('play-pause-btn'),
        nextBtn: document.getElementById('next-btn'),
        prevBtn: document.getElementById('prev-btn')
    };

    let currentStep = 0;
    let isPlaying = true;
    let animationTimeout = null;
    let animationRun = 0;
    let instantRender = false;

    const TIMING = {
        initialBlink: 1000,
        shortPause: 800,
        mediumPause: 1200,
        longPause: 3600,
        pasteHintPause: 2800,
        loadingDot: 500,
        clickFlash: 400,
        clickLabelDuration: 1500,
        hintDuration: 4000,
        hintFade: 500
    };

    function renderHeader(active) {
        const headerRule = "────────────────────────────────────────";
        const pipeline = ["Map", "Extract", "Apply"].map((s, i) => 
            i < active ? `<span class="success">✓</span> ${s}` : (i === active ? `[${s}]` : s)
        ).join(" → ");
        
        return `${headerRule}\n /\\_/\\     🦡 AIBADGER\n( o.o )    Local-first code context\n > ^ <     Pipeline: ${pipeline}\n${headerRule}`;
    }

    const steps = [
        {
            setup: () => {
                setTerminalScreen(`${renderHeader(0)}\n\nType a goal or paste a diff for review, then press Enter.\n`, "> ");
                elements.browserContent.innerHTML = "";
                switchWindow('terminal');
            },
            action: async (runId) => {
                await wait(TIMING.initialBlink, runId);
                showHint(elements.terminalInput, "Enter your coding task; Badger will use this to build initial project context.");
                await wait(TIMING.longPause / 2, runId);
                await typeText(elements.terminalInput, " Fix all bugs, make no misskates", runId);
                await wait(600, runId);
                await backspace(elements.terminalInput, 6, runId);
                await wait(400, runId);
                await typeText(elements.terminalInput, "takes!", runId);
                await wait(TIMING.mediumPause, runId);
                nextStep();
            }
        },
        {
            setup: () => {
                setTerminalScreen(`${renderHeader(0)}\n\nScan complete! Here's what Badger found:\n\n─────────────────────────────────────────────────\nProject:   demo-app\nStack:     Go + Node.js\nModules:   handler, service, server\nTotal:     28 source files\n─────────────────────────────────────────────────\n\nReady to copy Prompt 1: Topology to your clipboard.\nPrivacy: Structure only - no source code.\n\nCopy Prompt 1: Topology to clipboard? (y/N) `);
                switchWindow('terminal');
            },
            action: async (runId) => {
                await wait(TIMING.shortPause, runId);
                showHint(elements.terminalInput, "Badger has analyzed your project. Press 'y' to copy the context for the AI.");
                await wait(TIMING.longPause, runId);
                await typeText(elements.terminalInput, "y", runId);
                await wait(1500, runId);
                nextStep();
            }
        },
        {
            setup: () => {
                elements.browserContent.innerHTML = "";
                elements.browserInput.textContent = "";
                switchWindow('browser');
            },
            action: async (runId) => {
                await wait(TIMING.shortPause, runId);
                showHint(elements.browserInput, "Paste the prompt from AIBadger to provide the AI with project context and your task.");
                await wait(TIMING.pasteHintPause, runId);
                await simulatePaste(elements.browserInput, "Project: demo-app | Languages: Go, TypeScript\nStack: Go + Node.js | 28 source files\nModules: handler, service, server\n\nGoal: Fix all bugs, make no mistakes!", runId);
                await wait(TIMING.mediumPause, runId);
                addChatMessage('user', `<span class="pasted-block">Project: demo-app | Languages: Go, TypeScript<br>Stack: Go + Node.js | 28 source files<br>Modules: handler, service, server<br><br>Goal: Fix all bugs, make no mistakes!</span>`, true);
                elements.browserInput.textContent = "";
                nextStep();
            }
        },
        {
            setup: () => switchWindow('browser'),
            action: async (runId) => {
                const loadingMsg = addChatMessage('ai', "Loading");
                await simulateLoading(loadingMsg, runId);
                loadingMsg.innerHTML = `<br>I can help fix those bugs. First, I need more context. Extract these files:<br><br><span id="step4-files">FILE:internal/handler/order.go<br>FILE:internal/service/order.go</span><br><br><button class="copy-btn">Copy Response</button>`;
                showHint(document.getElementById('step4-files'), "The AI identifies the specific files it needs to build context.");
                await wait(TIMING.longPause, runId);
                await simulateClick(loadingMsg.querySelector('.copy-btn'), runId);
                await wait(TIMING.initialBlink, runId);
                nextStep();
            }
        },
        {
            setup: () => {
                setTerminalScreen(`${renderHeader(1)}\n\n<span class="success">✓</span>  Prompt 1: Topology copied. Paste it into any LLM chat interface, then paste extraction commands.\n\nPaste extraction commands from your AI chat.\n[text 0B] paste submits, Enter fallback\n\n    Paste FILE/PREFIX/NEAR commands here. `);
                switchWindow('terminal');
            },
            action: async (runId) => {
                await wait(TIMING.mediumPause, runId);
                elements.terminalContent.innerHTML = elements.terminalContent.innerHTML.replace("Paste FILE/PREFIX/NEAR commands here.", "[Pasted text]");
                await wait(TIMING.mediumPause, runId);
                nextStep();
            }
        },
        {
            setup: () => {
                setTerminalScreen(`${renderHeader(1)}\n\nReady to copy Prompt 2: Code Context to your clipboard.\n\n<span class="warning">⚠️</span>  This WILL include actual source code from:\n   • internal/handler/order.go\n   • internal/service/order.go\n\nCopy Prompt 2: Code Context to clipboard? (y/N) `);
                switchWindow('terminal');
            },
            action: async (runId) => {
                await wait(TIMING.mediumPause, runId);
                await typeText(elements.terminalInput, "y", runId);
                await wait(TIMING.initialBlink, runId);
                nextStep();
            }
        },
        {
            setup: () => switchWindow('browser'),
            action: async (runId) => {
                await wait(TIMING.shortPause, runId);
                showHint(elements.browserInput, "Paste the second prompt from AIBadger to extract the required code context.");
                await wait(TIMING.pasteHintPause, runId);
                await simulatePaste(elements.browserInput, "FILE:internal/handler/order.go\nFILE:internal/service/order.go\n[code context from 2 files, 5KB total]", runId);
                await wait(TIMING.initialBlink, runId);
                addChatMessage('user', `<span class="pasted-block">FILE:internal/handler/order.go<br>FILE:internal/service/order.go<br>[code context from 2 files, 5KB total]</span>`, true);
                elements.browserInput.textContent = "";
                const loadingMsg = addChatMessage('ai', "Loading");
                await simulateLoading(loadingMsg, runId);
                loadingMsg.innerHTML = `<br><span id="step7-text">All mistakes were fixed. Enjoy your bug-free life! 🚀<br><br>[write] internal/definitely_not_buggy.go<br>--- a/internal/definitely_not_buggy.go<br>+++ b/internal/definitely_not_buggy.go<br>@@ -15,7 +15,7 @@<br>-func handleOrder() { return nil }<br>+func handleOrder() error { ... }</span><br><br><button class="copy-btn">Copy Response</button>`;
                scrollBrowserToBottom();
                showHint(document.getElementById('step7-text'), "Badger parses the AI response to surgically apply changes to your project.");
                await wait(TIMING.longPause, runId);
                await simulateClick(loadingMsg.querySelector('.copy-btn'), runId);
                await wait(TIMING.initialBlink, runId);
                nextStep();
            }
        },
        {
            setup: () => {
                setTerminalScreen(`${renderHeader(2)}\n\n<span class="success">✓</span>  Prompt 2: Code Context copied. Next: paste the final AI response.\n\nPaste the final AI response.\n[text 0B] paste submits, Enter fallback\n\n    Paste the final AI response here. `);
                switchWindow('terminal');
            },
            action: async (runId) => {
                await wait(TIMING.mediumPause, runId);
                elements.terminalContent.innerHTML = elements.terminalContent.innerHTML.replace("Paste the final AI response here.", "[Pasted text]");
                await wait(TIMING.mediumPause, runId);
                nextStep();
            }
        },
        {
            setup: () => {
                setTerminalScreen(`${renderHeader(2)}\n\n<span class="success">✓</span>  Parsed 1 file update(s).\n\n<span class="warning">⚠️</span>  About to write changes to disk:\n\n    [write] internal/definitely_not_buggy.go\n\nApply these changes? (y/N) `);
                switchWindow('terminal');
            },
            action: async (runId) => {
                await wait(TIMING.mediumPause, runId);
                await typeText(elements.terminalInput, "y", runId);
                await wait(1800, runId);
                isPlaying = false;
                updatePlayPauseUI();
            }
        }
    ];

    function wait(ms, runId = animationRun) {
        if (runId === null) return Promise.resolve();
        return new Promise(resolve => {
            animationTimeout = setTimeout(() => {
                if (runId === animationRun) resolve();
            }, ms);
        });
    }

    function setTerminalScreen(text, prefix = "") {
        elements.terminalContent.innerHTML = text;
        elements.terminalCursorPrefix.textContent = prefix;
        elements.terminalInput.textContent = "";
        const body = elements.terminalWindow.querySelector('.window-body');
        if (body) body.scrollTop = 0;
    }

    async function typeText(element, text, runId, speed = 50) {
        for (let char of text) {
            element.textContent += char;
            await wait(speed + Math.random() * 50, runId);
        }
    }

    async function backspace(element, count, runId, speed = 40) {
        for (let i = 0; i < count; i++) {
            element.textContent = element.textContent.slice(0, -1);
            await wait(speed + Math.random() * 30, runId);
        }
    }

    async function simulateLoading(element, runId) {
        for (let i = 0; i < 3; i++) {
            await wait(TIMING.loadingDot, runId);
            element.innerText += ".";
        }
        await wait(TIMING.loadingDot, runId);
    }

    async function simulateClick(element, runId) {
        const label = document.createElement('span');
        label.className = 'clicked-label';
        label.innerText = 'Copied!';
        element.parentNode.appendChild(label);
        element.classList.add('clicked');
        await wait(TIMING.clickFlash, runId);
        element.classList.remove('clicked');
        setTimeout(() => label.remove(), TIMING.clickLabelDuration);
    }

    async function simulatePaste(element, label, runId) {
        const parent = element.closest('.chat-input-area');
        parent.classList.add('flash');
        element.innerHTML = `<span class="pasted-block">${label}</span>`;
        await wait(TIMING.loadingDot, runId);
        parent.classList.remove('flash');
    }

    function showHint(anchor, text, duration = TIMING.hintDuration) {
        if (!anchor) return;
        const rect = anchor.getBoundingClientRect();
        const hint = document.createElement('div');
        hint.className = 'feature-hint';
        hint.innerText = text;
        document.body.appendChild(hint);
        
        const hRect = hint.getBoundingClientRect();
        const padding = 20;
        
        let left = rect.left + (rect.width / 2) - (hRect.width / 2);
        let top = rect.top - hRect.height - 15;
        
        // Keep within viewport horizontally
        if (left < padding) left = padding;
        if (left + hRect.width > window.innerWidth - padding) {
            left = window.innerWidth - hRect.width - padding;
        }
        
        // If too high, show below anchor
        if (top < padding) {
            top = rect.bottom + 15;
            hint.classList.add('below');
        }
        
        hint.style.left = `${left}px`;
        hint.style.top = `${top + window.scrollY}px`;
        
        setTimeout(() => hint.classList.add('visible'), 50);
        setTimeout(() => {
            hint.classList.remove('visible');
            setTimeout(() => hint.remove(), TIMING.hintFade);
        }, duration);
    }

    function addChatMessage(type, text, isHTML = false) {
        const msg = document.createElement('div');
        msg.className = `chat-message ${type}-message`;
        msg[isHTML ? 'innerHTML' : 'innerText'] = text;
        elements.browserContent.appendChild(msg);
        scrollBrowserToBottom();
        return msg;
    }

    function scrollBrowserToBottom() {
        const body = elements.browserWindow.querySelector('.window-body');
        if (body) body.scrollTop = body.scrollHeight;
    }

    function switchWindow(target) {
        elements.terminalWindow.classList.toggle('active', target === 'terminal');
        elements.browserWindow.classList.toggle('active', target === 'browser');
    }

    function updatePlayPauseUI() {
        elements.playPauseBtn.innerText = isPlaying ? "Pause" : "Play";
    }

    function renderStep() {
        stopAnimation();
        const step = steps[currentStep];
        elements.currentStepEl.innerText = currentStep + 1;
        step.setup();
        if (isPlaying) {
            step.action(animationRun);
        } else {
            instantRender = true;
            Promise.resolve(step.action(null)).then(() => { instantRender = false; });
        }
    }

    function stopAnimation() {
        animationRun++;
        if (animationTimeout) clearTimeout(animationTimeout);
        document.querySelectorAll('.feature-hint').forEach(el => el.remove());
    }

    function nextStep() {
        if (!instantRender && currentStep < steps.length - 1) {
            currentStep++;
            renderStep();
        }
    }

    elements.playPauseBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        updatePlayPauseUI();
        if (isPlaying) renderStep(); else stopAnimation();
    });

    elements.nextBtn.addEventListener('click', () => {
        isPlaying = false;
        updatePlayPauseUI();
        nextStep();
    });

    elements.prevBtn.addEventListener('click', () => {
        isPlaying = false;
        updatePlayPauseUI();
        if (currentStep > 0) {
            currentStep--;
            renderStep();
        }
    });

    renderStep();
})();
