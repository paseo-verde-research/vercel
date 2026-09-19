(function () {
    const gallery = document.querySelector("[data-gallery]");
    if (!gallery) {
        return;
    }
    const tabs = Array.from(gallery.querySelectorAll('[role="tab"]'));
    const panels = Array.from(gallery.querySelectorAll('[role="tabpanel"]'));
    const lightbox = document.querySelector("[data-screenshot-lightbox]");
    if (!lightbox) {
        return;
    }
    const lightboxImage = lightbox.querySelector("[data-lightbox-image]");
    const lightboxCaption = lightbox.querySelector("[data-lightbox-caption]");
    const lightboxClose = lightbox.querySelector("[data-lightbox-close]");
    let lastTrigger = null;

    function selectTab(index) {
        tabs.forEach((tab, i) => {
            const selected = i === index;
            tab.setAttribute("aria-selected", String(selected));
            tab.tabIndex = selected ? 0 : -1;
            panels[i].hidden = !selected;
        });
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => selectTab(index));
        tab.addEventListener("keydown", (event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                return;
            }
            event.preventDefault();
            const offset = event.key === "ArrowRight" ? 1 : -1;
            const nextIndex = (index + offset + tabs.length) % tabs.length;
            selectTab(nextIndex);
            tabs[nextIndex].focus();
        });
    });

    if (!lightboxImage || !lightboxCaption || !lightboxClose) {
        return;
    }

    function closeLightbox() {
        if (!lightbox.open) {
            return;
        }
        lightbox.close();
    }

    gallery.querySelectorAll(".screenshot-link").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const image = link.querySelector("img");
            const caption = link.closest("figure").querySelector("figcaption");
            lastTrigger = link;
            lightboxImage.src = link.href;
            lightboxImage.alt = image.alt;
            lightboxCaption.textContent = caption ? caption.textContent : "";
            lightbox.showModal();
            lightboxClose.focus();
        });
    });

    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });
    lightbox.addEventListener("close", () => {
        lightboxImage.removeAttribute("src");
        lightboxCaption.textContent = "";
        if (lastTrigger) {
            lastTrigger.focus();
        }
    });
})();
