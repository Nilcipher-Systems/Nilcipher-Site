// ===== Scroll reveal =====
(function () {
  const revealEls = Array.from(document.querySelectorAll(".reveal"));

  // Respect users who prefer reduced motion — show everything immediately.
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealEls.forEach((el) => observer.observe(el));

  // Failsafe: reveal anything that's at or above the current viewport but
  // still hidden — covers fast scrolls where the observer's threshold is
  // skipped, so a section can never get stuck invisible.
  function revealPassed() {
    const trigger = window.innerHeight * 0.9;
    revealEls.forEach((el) => {
      if (el.classList.contains("visible")) return;
      if (el.getBoundingClientRect().top < trigger) {
        el.classList.add("visible");
        observer.unobserve(el);
      }
    });
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => { revealPassed(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener("load", () => setTimeout(revealPassed, 300));
})();