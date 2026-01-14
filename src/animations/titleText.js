import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

export default function titleTextReveal() {
  const targets = gsap.utils.toArray('[data-a="title-text"]');
  if (!targets.length) return;

  let splitInstances = [];
  let resizeTimer = null;

  const waitForFonts = () => {
    if (document.fonts && document.fonts.ready) return document.fonts.ready;
    return Promise.resolve();
  };

  const cleanup = () => {
    ScrollTrigger.getAll().forEach((st) => {
      if (st.vars?.id === "title-text") st.kill();
    });

    splitInstances.forEach((inst) => inst?.revert && inst.revert());
    splitInstances = [];
  };

  const build = () => {
    cleanup();

    targets.forEach((el) => {
      const split = SplitText.create(el, {
        type: "lines,words",
        autoSplit: true,
        mask: "lines",
        onSplit: (self) => {
          gsap.set(self.lines, { yPercent: 110, willChange: "transform" });

          const tl = gsap.timeline({ paused: true });

          // Title animation (stronger + snappier than body)
          tl.to(self.lines, {
            yPercent: 0,
            duration: 1.0,
            ease: "expo.out",
            stagger: 0.09,
          });

          ScrollTrigger.create({
            id: "title-text",
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

  waitForFonts().then(() => requestAnimationFrame(build));

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      waitForFonts().then(() => requestAnimationFrame(build));
    }, 200);
  });
}

titleTextReveal();