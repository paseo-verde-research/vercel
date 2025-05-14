// script.js

document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('header');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('main section'); // All sections in main
    const contactForm = document.getElementById('contactForm');
    const formMessageBox = document.getElementById('form-message-box');

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

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call to set active link based on page load position (e.g. hash)


// --- Hamburger Menu Toggle ---
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
// Optional: Prevent body scroll when mobile menu is open
            document.body.classList.toggle('no-scroll', navMenu.classList.contains('active'));
        });
    }

// --- Close Mobile Menu When a Link is Clicked ---
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (hamburger && navMenu && hamburger.classList.contains('active')) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.classList.remove('no-scroll');
            }
        });
    });

// --- Contact Form Submission (Static Site Simulation) ---
    if (contactForm && formMessageBox) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent actual form submission

// Clear previous messages
            formMessageBox.textContent = '';
            formMessageBox.className = 'form-message-box'; // Reset classes

// Get form data (optional for static simulation, but good practice)
            const name = contactForm.querySelector('#name').value.trim();
            const email = contactForm.querySelector('#email').value.trim();
            const message = contactForm.querySelector('#message').value.trim();

// Basic validation
            if (!name || !email || !message) {
                formMessageBox.textContent = 'Please fill in all required fields.';
                formMessageBox.classList.add('error');
                return;
            }
            if (!validateEmail(email)) {
                formMessageBox.textContent = 'Please enter a valid email address.';
                formMessageBox.classList.add('error');
                return;
            }

// Simulate sending data (replace with actual AJAX call for a dynamic site)
            formMessageBox.textContent = 'Sending your message...';
            formMessageBox.classList.add('info'); // Optional: style for pending state

            setTimeout(() => {
// Simulate success
                formMessageBox.textContent = 'Thank you! Your message has been "sent". We will contact you shortly.';
                formMessageBox.className = 'form-message-box success'; // Reset and add success
                contactForm.reset(); // Clear the form fields

// For a real site, you'd use fetch() or XMLHttpRequest here.
// Example:
// fetch('YOUR_ENDPOINT_URL', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ name, email, message })
// })
// .then(response => response.json())
// .then(data => {
//     formMessageBox.textContent = 'Message sent successfully!';
//     formMessageBox.className = 'form-message-box success';
//     contactForm.reset();
// })
// .catch(error => {
//     formMessageBox.textContent = 'An error occurred. Please try again later.';
//     formMessageBox.className = 'form-message-box error';
//     console.error('Form submission error:', error);
// });
            }, 1500); // Simulate network delay
        });
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

// --- Set Current Year in Footer ---
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

// --- Smooth Scroll for All Anchor Links (within page) ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
// Check if the link is just a placeholder or for a different purpose
            if (this.getAttribute('href') === '#' || this.getAttribute('href') === '') return;

            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                let targetPosition = targetElement.offsetTop;
// Adjust for fixed header height if the header is present and not part of the target
                if (header && getComputedStyle(header).position === 'fixed') {
                    targetPosition -= header.offsetHeight;
                }

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

// --- Simple Fade-in Animation for Sections on Scroll (Optional) ---
    const animatedSections = document.querySelectorAll('.service-card, .timeline-item, .about-image, .about-text, .contact-form, .contact-details');

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

});