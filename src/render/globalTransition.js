import { Transition } from "@unseenco/taxi";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { lenis, startRAF, stopRAF } from "../scroll/scroll";

gsap.registerPlugin(CustomEase);
CustomEase.create("mask", "0.33, 1, 0.68, 1");

export default class globalTransition extends Transition {

  // --------------------
  // smooth diagonal -> square mask animation
  // --------------------
  animateMask(overlay, options = {}) {
    const {
      mode = "reveal",
      duration = 0.85,
      lead = 8,
      squareAt = 0.18,
      done,
    } = options;

    overlay.dataset.mode = mode;

    const ctrl = { p: 100 };
    const clamp = (v) => (v < 0 ? 0 : v > 100 ? 100 : v);

    const apply = () => {
      // normalize: 100 -> 0  ===> 0 -> 1
      const u = 1 - ctrl.p / 100;

      // start flattening near the end
      const start = 1 - squareAt;
      let t = 0;

      if (u > start) {
        t = (u - start) / squareAt;
        t = t * t * (3 - 2 * t); // smoothstep
      }

      const leadNow = lead * (1 - t);

      const pR = clamp(ctrl.p - leadNow);
      const pL = clamp(ctrl.p + leadNow * 0.55);

      gsap.set(overlay, { "--pR": pR, "--pL": pL });
    };

    gsap.set(overlay, {
      opacity: 1,
      "--pR": 100,
      "--pL": 100,
    });

    apply();

    gsap.to(ctrl, {
      p: 0,
      duration,
      ease: "mask",
      onUpdate: apply,
      onComplete: () => {
        gsap.set(overlay, { "--pR": 0, "--pL": 0 });
        if (done) done();
      },
    });
  }

  // --------------------
  // LEAVE
  // --------------------
  onLeave({ from, trigger, done }) {
    const overlay = document.querySelector(".transition-block");
    if (!overlay) return done();

    try { lenis?.stop?.(); } catch (e) {}
    try { stopRAF?.(); } catch (e) {}

    this.animateMask(overlay, {
      mode: "reveal",
      duration: 0.8,
      lead: 8,
      squareAt: 0.22,
      done: () => {
        window.scrollTo(0, 0);
        try {
          lenis?.scrollTo?.(0, { immediate: true, lock: true });
        } catch (e) {}
        done();
      },
    });
  }

  // --------------------
  // ENTER
  // --------------------
  onEnter({ to, trigger, done }) {
    const overlay = document.querySelector(".transition-block");
    if (!overlay) return done();

    gsap.set(to, { opacity: 1 });

    this.animateMask(overlay, {
      mode: "hide",
      duration: 0.8,
      lead: 8,
      squareAt: 0.22,
      done: () => {
        gsap.set(overlay, {
          opacity: 0,
          "--pR": 100,
          "--pL": 100,
        });

        try { lenis?.start?.(); } catch (e) {}
        try { startRAF?.(); } catch (e) {}

        done();
      },
    });
  }
}