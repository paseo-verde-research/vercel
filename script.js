// script.js

document.addEventListener('DOMContentLoaded', () => {
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

// --- Simple Fade-in Animation for Sections on Scroll (Optional) ---
    const animatedSections = document.querySelectorAll('.service-card, .timeline-item, .about-image, .about-text, .contact-details');

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
    if (articlesLink) {
        const path = window.location.pathname;
        if (path === '/articles/' || path.startsWith('/articles/')) {
            articlesLink.classList.add('active');
        }
    }
});
