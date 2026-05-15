// script.js

document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('header');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('main section'); // All sections in main

// --- Sticky Header with Background Change on Scroll ---
    function handleScroll() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

// --- Active Link Highlighting on Scroll ---
        let currentSectionId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - header.offsetHeight - 50; // Adjusted for header and small offset
// Check if section is in viewport
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + section.offsetHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

// If no section is actively in view (e.g., at the very top or bottom beyond sections)
// default to hero or the first section if applicable.
        if (!currentSectionId && window.scrollY < sections[0].offsetTop) {
            currentSectionId = sections[0].getAttribute('id');
        }


        navLinks.forEach(link => {
            link.classList.remove('active');
// Check if the link's href matches the current section ID
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    }

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
    handleScroll(); // Initial call to set active link based on page load position (e.g. hash)


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

// --- Simple Fade-in Animation for Sections on Scroll (Optional) ---
    const animatedSections = document.querySelectorAll('.service-card, .timeline-item, .about-image, .about-text, .contact-details');

    const observerOptions = {
        root: null, // relative to document viewport
        rootMargin: '0px',
        threshold: 0.1 // 10% of the item is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target); // Stop observing once animated
            }
        });
    }, observerOptions);

    animatedSections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(section);
    });


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

    console.log("Welcome to PVRLabs! Java performance optimization is our specialty.");
});
