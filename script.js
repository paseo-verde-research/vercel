// script.js

document.addEventListener('DOMContentLoaded', () => {
    const starCountCacheLifetime = 60 * 60 * 1000;

    function readCachedStarCount(repository) {
        try {
            const cached = JSON.parse(localStorage.getItem(`github-stars:${repository}`) || 'null');
            if (cached && Number.isInteger(cached.count) && Date.now() - cached.savedAt < starCountCacheLifetime) {
                return cached.count;
            }
        } catch (error) {
            // Storage may be unavailable or contain invalid data. Fetch a fresh count.
        }
        return null;
    }

    function cacheStarCount(repository, count) {
        try {
            localStorage.setItem(`github-stars:${repository}`, JSON.stringify({ count, savedAt: Date.now() }));
        } catch (error) {
            // The count can still be shown when storage is unavailable.
        }
    }

    function showStarCount(button, count) {
        const countElement = button.querySelector('.github-star-count');
        if (!countElement) {
            return;
        }

        const baseLabel = button.dataset.starLabel || button.textContent.replace(/\s+/g, ' ').trim();
        button.dataset.starLabel = baseLabel;
        countElement.textContent = new Intl.NumberFormat().format(count);
        countElement.hidden = false;
        button.setAttribute('aria-label', `${baseLabel}, ${count} GitHub stars`);
    }

    async function loadGitHubStars(button) {
        const repository = button.dataset.repository;
        if (!repository) {
            return;
        }

        const cachedCount = readCachedStarCount(repository);
        if (cachedCount !== null) {
            document.querySelectorAll(`.github-star[data-repository="${repository}"]`).forEach(starButton => {
                showStarCount(starButton, cachedCount);
            });
            return;
        }

        try {
            const response = await fetch(`https://api.github.com/repos/${repository}/stargazers/count`);
            if (!response.ok) {
                return;
            }

            const data = await response.json();
            if (!Number.isInteger(data.count)) {
                return;
            }

            cacheStarCount(repository, data.count);
            document.querySelectorAll(`.github-star[data-repository="${repository}"]`).forEach(starButton => {
                showStarCount(starButton, data.count);
            });
        } catch (error) {
            // Keep the original GitHub link usable when the API is unavailable.
        }
    }

    const githubStarButtons = Array.from(document.querySelectorAll('.github-star'));
    const loadedRepositories = new Set();
    githubStarButtons.forEach(button => {
        const repository = button.dataset.repository;
        if (!repository || loadedRepositories.has(repository)) {
            return;
        }
        loadedRepositories.add(repository);
        loadGitHubStars(button);
    });

    const header = document.getElementById('header');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = Array.from(document.querySelectorAll('.nav-link'));
    const sections = document.querySelectorAll('main section'); // All sections in main
    const sectionIds = new Set(Array.from(sections, section => section.id).filter(Boolean));
    const sectionNavLinks = navLinks.filter(link => {
        const href = link.getAttribute('href');
        return href && href.startsWith('#') && sectionIds.has(href.slice(1));
    });
    const hasScrollSpy = Boolean(header && sectionNavLinks.length && sections.length);
    const hasHeaderScrollEffect = Boolean(header && getComputedStyle(header).position === 'fixed');

    let sectionPositions = [];
    let activeSectionId = '';
    let resizeTicking = false;

    // --- Cache Section Positions to avoid layout thrashing ---
    function updateSectionPositions() {
        if (!hasScrollSpy) {
            return;
        }

        const headerOffset = header.offsetHeight + 60;
        sectionPositions = Array.from(sections).map(section => {
            return {
                id: section.getAttribute('id'),
                top: section.offsetTop - headerOffset, // Adjusted for header and small offset
                bottom: section.offsetTop + section.offsetHeight - headerOffset
            };
        });
    }

// --- Sticky Header with Background Change on Scroll ---
    function handleScroll() {
        if (!header) {
            return;
        }

        const scrollY = window.scrollY;

        if (hasHeaderScrollEffect) {
            header.classList.toggle('scrolled', scrollY > 50);
        }

        if (!hasScrollSpy) {
            return;
        }

// --- Active Link Highlighting on Scroll ---
        let currentSectionId = '';
        
        for (let i = 0; i < sectionPositions.length; i++) {
            const pos = sectionPositions[i];
            if (scrollY >= pos.top && scrollY < pos.bottom) {
                currentSectionId = pos.id;
                break;
            }
        }

// If no section is actively in view (e.g., at the very top or bottom beyond sections)
// default to hero or the first section if applicable.
        if (!currentSectionId && sectionPositions.length > 0 && scrollY < sectionPositions[0].top) {
            currentSectionId = sectionPositions[0].id;
        }

        if (currentSectionId === activeSectionId) {
            return;
        }

        activeSectionId = currentSectionId;
        sectionNavLinks.forEach(link => {
            const href = link.getAttribute('href');
            link.classList.toggle('active', href === `#${currentSectionId}`);
        });
    }

    if (hasHeaderScrollEffect || hasScrollSpy) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // Update positions on load and resize
    updateSectionPositions();
    handleScroll(); 

    if (hasScrollSpy) {
        window.addEventListener('load', () => {
            updateSectionPositions();
            handleScroll();
        }, { once: true });

        window.addEventListener('resize', () => {
            if (!resizeTicking) {
                window.requestAnimationFrame(() => {
                    updateSectionPositions();
                    handleScroll();
                    resizeTicking = false;
                });
                resizeTicking = true;
            }
        }, { passive: true });
    }


// --- Hamburger Menu Toggle ---
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            const isExpanded = navMenu.classList.contains('active');
            hamburger.setAttribute('aria-expanded', String(isExpanded));
            hamburger.setAttribute('aria-label', isExpanded ? 'Close navigation menu' : 'Open navigation menu');
// Optional: Prevent body scroll when mobile menu is open
            document.body.classList.toggle('no-scroll', isExpanded);
        });
    }

// --- Close Mobile Menu When a Link is Clicked ---
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (hamburger && navMenu && hamburger.classList.contains('active')) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                hamburger.setAttribute('aria-label', 'Open navigation menu');
                document.body.classList.remove('no-scroll');
            }
        });
    });

// --- Set Current Year in Footer ---
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // --- Prefill the contact form with a local triage summary ---
    const contactMessage = document.getElementById('contact-message');
    if (contactMessage) {
        try {
            const triageSummary = sessionStorage.getItem('pvrlabsTriageSummary');
            if (triageSummary) {
                contactMessage.value = triageSummary;
                sessionStorage.removeItem('pvrlabsTriageSummary');
            }
        } catch (error) {
            // Storage can be unavailable in private browsing contexts.
        }
    }

    // --- Article Topic Filters ---
    const articleFilters = Array.from(document.querySelectorAll('.article-filter'));
    const articleEntries = Array.from(document.querySelectorAll('.article-entry'));
    if (articleFilters.length && articleEntries.length) {
        articleFilters.forEach(filterButton => {
            filterButton.addEventListener('click', () => {
                const selectedFilter = filterButton.dataset.filter;

                articleFilters.forEach(button => {
                    const isActive = button === filterButton;
                    button.classList.toggle('active', isActive);
                    button.setAttribute('aria-pressed', String(isActive));
                });

                articleEntries.forEach(article => {
                    const tags = article.dataset.tags.split(/\s+/);
                    article.hidden = selectedFilter !== 'all' && !tags.includes(selectedFilter);
                });
            });
        });
    }

    // Lightweight syntax highlighting for article shell examples.
    // Add lowercase entries here to promote more product or command names.
    const articleCodeHighlightTokens = new Set([
        'ai badger',
        'badger',
        'pvrlabs',
        'statlite'
    ]);
    const bashKeywords = new Set([
        'case', 'do', 'done', 'elif', 'else', 'esac', 'export', 'fi', 'for',
        'function', 'if', 'in', 'local', 'readonly', 'then', 'until', 'while'
    ]);
    const bashTokenPattern = /#[^\n]*|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\$\{[^}\n]+\}|\$[A-Za-z_][A-Za-z0-9_]*|--?[A-Za-z0-9][A-Za-z0-9._-]*|&&|\|\||[|;]|[A-Za-z_][A-Za-z0-9_-]*/g;

    function bashTokenClass(token) {
        const normalizedToken = token.toLowerCase();

        if (articleCodeHighlightTokens.has(normalizedToken)) {
            return 'code-token-brand';
        }
        if (token.startsWith('#')) {
            return 'code-token-comment';
        }
        if (token.startsWith("'") || token.startsWith('"')) {
            return 'code-token-string';
        }
        if (token.startsWith('$')) {
            return 'code-token-variable';
        }
        if (token.startsWith('-')) {
            return 'code-token-option';
        }
        if (token === '&&' || token === '||' || token === '|' || token === ';') {
            return 'code-token-operator';
        }
        if (bashKeywords.has(normalizedToken)) {
            return 'code-token-keyword';
        }
        return '';
    }

    document.querySelectorAll('.article-body pre[data-lang="bash"] > code').forEach(codeBlock => {
        const source = codeBlock.textContent;
        const highlightedCode = document.createDocumentFragment();
        let sourceIndex = 0;

        for (const match of source.matchAll(bashTokenPattern)) {
            const token = match[0];
            const tokenIndex = match.index;

            if (tokenIndex > sourceIndex) {
                highlightedCode.append(source.slice(sourceIndex, tokenIndex));
            }

            const tokenClass = bashTokenClass(token);
            if (tokenClass) {
                const tokenElement = document.createElement('span');
                tokenElement.className = tokenClass;
                tokenElement.textContent = token;
                if (tokenClass === 'code-token-brand') {
                    tokenElement.dataset.highlight = token.toLowerCase();
                }
                highlightedCode.append(tokenElement);
            } else {
                highlightedCode.append(token);
            }

            sourceIndex = tokenIndex + token.length;
        }

        highlightedCode.append(source.slice(sourceIndex));
        codeBlock.replaceChildren(highlightedCode);
    });

    const yamlTokenPattern = /#[^\n]*|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\b(?:true|false|null)\b|\b\d+(?:\.\d+)?\b|^[ \t]*-(?=\s)|[A-Za-z_][A-Za-z0-9_-]*(?=\s*:)|:/gim;

    function yamlTokenClass(token) {
        if (token.startsWith('#')) {
            return 'code-token-comment';
        }
        if (token.startsWith("'") || token.startsWith('"')) {
            return 'code-token-string';
        }
        if (/^(?:true|false|null)$/i.test(token)) {
            return 'code-token-literal';
        }
        if (/^\d+(?:\.\d+)?$/.test(token)) {
            return 'code-token-number';
        }
        if (token === ':' || token.trim() === '-') {
            return 'code-token-punctuation';
        }
        return 'code-token-key';
    }

    document.querySelectorAll('.article-body pre[data-lang="yaml"] > code').forEach(codeBlock => {
        const source = codeBlock.textContent;
        const highlightedCode = document.createDocumentFragment();
        let sourceIndex = 0;

        for (const match of source.matchAll(yamlTokenPattern)) {
            const token = match[0];
            const tokenIndex = match.index;

            if (tokenIndex > sourceIndex) {
                highlightedCode.append(source.slice(sourceIndex, tokenIndex));
            }

            const tokenElement = document.createElement('span');
            tokenElement.className = yamlTokenClass(token);
            tokenElement.textContent = token;
            highlightedCode.append(tokenElement);
            sourceIndex = tokenIndex + token.length;
        }

        highlightedCode.append(source.slice(sourceIndex));
        codeBlock.replaceChildren(highlightedCode);
    });

    const workflowTokenPattern = /AI\s+Badger|[↓→]|\b\d+\.(?=\s)|[A-Za-z_][A-Za-z0-9_-]*/g;

    document.querySelectorAll('.article-body pre[data-lang="workflow"] > code').forEach(codeBlock => {
        const source = codeBlock.textContent;
        const highlightedCode = document.createDocumentFragment();
        let sourceIndex = 0;

        for (const match of source.matchAll(workflowTokenPattern)) {
            const token = match[0];
            const tokenIndex = match.index;
            const normalizedToken = token.toLowerCase();
            let tokenClass = '';

            if (token === '↓' || token === '→') {
                tokenClass = 'code-token-workflow-arrow';
            } else if (/^\d+\.$/.test(token)) {
                tokenClass = 'code-token-workflow-step';
            } else if (articleCodeHighlightTokens.has(normalizedToken)) {
                tokenClass = 'code-token-brand';
            }

            if (!tokenClass) {
                continue;
            }
            if (tokenIndex > sourceIndex) {
                highlightedCode.append(source.slice(sourceIndex, tokenIndex));
            }

            const tokenElement = document.createElement('span');
            tokenElement.className = tokenClass;
            tokenElement.textContent = token;
            if (tokenClass === 'code-token-brand') {
                tokenElement.dataset.highlight = normalizedToken;
            }
            highlightedCode.append(tokenElement);
            sourceIndex = tokenIndex + token.length;
        }

        highlightedCode.append(source.slice(sourceIndex));
        codeBlock.replaceChildren(highlightedCode);
    });

    document.querySelectorAll('.article-body pre[data-lang]:not([data-no-copy])').forEach(codeContainer => {
        if (codeContainer.dataset.lang.toLowerCase() === 'workflow') {
            return;
        }

        const codeBlock = codeContainer.querySelector(':scope > code');
        if (!codeBlock) {
            return;
        }

        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.className = 'code-copy-button';
        copyButton.setAttribute('aria-label', `Copy ${codeContainer.dataset.lang} example`);
        copyButton.innerHTML = `
            <svg class="copy-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg class="check-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>`;

        let copyStatusTimer;
        copyButton.addEventListener('click', async () => {
            window.clearTimeout(copyStatusTimer);

            try {
                await navigator.clipboard.writeText(codeBlock.textContent);
                copyButton.classList.add('copied');
                copyButton.setAttribute('aria-label', 'Copied');
            } catch (error) {
                copyButton.setAttribute('aria-label', 'Copy failed');
            }

            copyStatusTimer = window.setTimeout(() => {
                copyButton.classList.remove('copied');
                copyButton.setAttribute('aria-label', `Copy ${codeContainer.dataset.lang} example`);
            }, 1800);
        });

        codeContainer.classList.add('has-copy-button');
        codeContainer.append(copyButton);
    });

// --- Simple Fade-in Animation for Sections on Scroll (Optional) ---
    const animatedSections = document.querySelectorAll('.service-card, .about-image, .about-text, .contact-details');

    if (animatedSections.length) {
        const observer = new IntersectionObserver((entries, sectionObserver) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    sectionObserver.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        });

        animatedSections.forEach(section => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            section.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            observer.observe(section);
        });
    }


// --- Lazy-load Calendly widget script when contact section approaches viewport ---
    const contactSection = document.getElementById('contact');
    if (contactSection) {
        const calendlyObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const script = document.createElement('script');
                    script.src = 'https://assets.calendly.com/assets/external/widget.js';
                    script.async = true;
                    document.body.appendChild(script);
                    obs.unobserve(entry.target);
                }
            });
        }, { rootMargin: '200px' });
        calendlyObserver.observe(contactSection);
    }

// --- Active nav link based on current path (for cross-page nav links) ---
    const articlesLink = document.querySelector('.nav-link[href="/articles/"]');
    const consultingLink = document.querySelector('.nav-link[href="/java-performance/"]');
    if (articlesLink || consultingLink) {
        const path = window.location.pathname;
        if (articlesLink && (path === '/articles/' || path.startsWith('/articles/'))) {
            articlesLink.classList.add('active');
        }
        if (consultingLink && path.startsWith('/java-performance/')) {
            consultingLink.classList.add('active');
        }
    }
});
