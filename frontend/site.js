/*
  Shared site behavior
  - Mobile navbar toggle

  Keeping this separate from app.js avoids coupling the analyzer JS to site navigation.
*/

(function () {
    const toggle = document.getElementById("navToggle");
    const nav = document.querySelector(".nav");
    const links = document.querySelector(".nav__links");

    if (!toggle || !nav) return;

    function setOpen(isOpen) {
        nav.classList.toggle("nav--open", isOpen);
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    }

    toggle.addEventListener("click", () => {
        const isOpen = nav.classList.contains("nav--open");
        setOpen(!isOpen);
    });

    // Click outside closes the menu (mobile UX)
    document.addEventListener("click", (e) => {
        if (!nav.classList.contains("nav--open")) return;
        const target = e.target;
        if (!(target instanceof Node)) return;
        const clickedInsideNav = nav.contains(target);
        if (!clickedInsideNav) setOpen(false);
    });

    // Close menu on link click (better UX on mobile)
    nav.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.tagName === "A" && nav.classList.contains("nav--open")) {
            setOpen(false);
        }
    });

    // Close on Escape
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setOpen(false);
    });
})();
