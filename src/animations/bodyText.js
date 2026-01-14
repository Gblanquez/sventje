import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

export default function bodyTextReveal() {
  const targets = gsap.utils.toArray('[data-a="body-text"]');
  if (!targets.length) return;

  let splitInstances = [];
  let resizeTimer = null;

  const waitForFonts = () => {
    // If Font Loading API exists, wait for it; otherwise resolve immediately.
    if (document.fonts && document.fonts.ready) return document.fonts.ready;
    return Promise.resolve();
  };

  const cleanup = () => {
    // Kill only the triggers we create
    ScrollTrigger.getAll().forEach((st) => {
      if (st.vars?.id === "body-text") st.kill();
    });

    // Revert splits
    splitInstances.forEach((inst) => inst?.revert && inst.revert());
    splitInstances = [];
  };

  const build = () => {
    cleanup();

    targets.forEach((el) => {
      const split = SplitText.create(el, {
        type: "lines,words",
        autoSplit: true,
        mask: "lines", // <-- native masks array (no manual divs)
        onSplit: (self) => {
          // Set initial state
          gsap.set(self.lines, { yPercent: 100, willChange: "transform" });

          // Create the animation (paused) and attach ScrollTrigger
          const tl = gsap.timeline({ paused: true });
          tl.to(self.lines, {
            yPercent: 0,
            duration: 1.05,
            ease: "power3.out",
            stagger: 0.08,
          });

          ScrollTrigger.create({
            id: "body-text",
            trigger: el,
            start: "top bottom",
            toggleActions: "play none none none",
            animation: tl,
            // markers: true,
          });

          return tl;
        },
      });

      splitInstances.push(split);
    });

    ScrollTrigger.refresh();
  };

  // 1) Wait for fonts, then split
  waitForFonts().then(() => {
    // next frame to be extra-safe with layout
    requestAnimationFrame(build);
  });

  // 2) Re-split on resize (line breaks change)
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      waitForFonts().then(() => requestAnimationFrame(build));
    }, 200);
  });
}

bodyTextReveal();