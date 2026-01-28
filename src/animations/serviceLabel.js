import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(SplitText);

export default function serviceHover() {
  const items = gsap.utils.toArray(".service-cl-item");
  if (!items.length) return;

  const cleanups = [];
  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const clamp = gsap.utils.clamp;

  items.forEach((item) => {
    const label = item.querySelector('[data-a="service-label"]');
    const thumbsGroup = item.querySelector(".service-thumbnails-parent");
    const thumbs = gsap.utils.toArray(item.querySelectorAll(".thumb-parent"));

    if (!label || !thumbsGroup || !thumbs.length) return;

    const split = new SplitText(label, {
      type: "words",
      wordsClass: "service-word",
    });

    const words = split.words;
    if (words.length < 2) {
      split.revert();
      return;
    }

    const w1 = words[0];
    const w2 = words[1];

    gsap.set([w1, w2], {
      x: 0,
      display: "inline-block",
      willChange: "transform",
    });

    // thumbs reveal from LEFT (not center)
    gsap.set(thumbs, {
      scaleX: 0,
      transformOrigin: "center",
      willChange: "transform",
    });

    // keep group stable for measuring (absolute centered)
    gsap.set(thumbsGroup, { willChange: "transform" });

    // knobs (can override per item via data-*)
    const pad = num(item.dataset.thumbPad) || 10;          
    const minPush = num(item.dataset.minPush) || 0;        
    const maxPush = num(item.dataset.maxPush) || 240;    
    const staggerEach = num(item.dataset.thumbStagger) || 0.055;

    const getPushes = () => {
      // reset word transforms so rects are accurate
      gsap.set([w1, w2], { x: 0 });

      const r1 = w1.getBoundingClientRect();
      const r2 = w2.getBoundingClientRect();
      const rt = thumbsGroup.getBoundingClientRect();



      const needLeft = Math.max(0, (r1.right + pad) - rt.left);   // how much to move w1 left
      const needRight = Math.max(0, (rt.right + pad) - r2.left);  // how much to move w2 right

      return {
        left: clamp(minPush, maxPush, needLeft),
        right: clamp(minPush, maxPush, needRight),
      };
    };

    const tl = gsap.timeline({ paused: true });

    tl.to(
      thumbs,
      {
        scaleX: 1,
        duration: 0.4,
        ease: "power3.out",
        stagger: { each: staggerEach, from: "center" },
      },
      0.04
    )
      .to(
        w1,
        {
          x: () => -getPushes().left,
          duration: 0.4,
          ease: "power3.out",
        },
        0
      )
      .to(
        w2,
        {
          x: () => getPushes().right,
          duration: 0.4,
          ease: "power3.out",
        },
        0
      );

    const onEnter = () => {
      // ensure measurements are taken AFTER any font/layout settling this frame
      requestAnimationFrame(() => tl.play(0));
    };
    const onLeave = () => tl.reverse();

    item.addEventListener("mouseenter", onEnter);
    item.addEventListener("mouseleave", onLeave);
    item.addEventListener("focusin", onEnter);
    item.addEventListener("focusout", onLeave);

    cleanups.push(() => {
      item.removeEventListener("mouseenter", onEnter);
      item.removeEventListener("mouseleave", onLeave);
      item.removeEventListener("focusin", onEnter);
      item.removeEventListener("focusout", onLeave);
      tl.kill();
      split.revert();
    });
  });

  return () => cleanups.forEach((fn) => fn());
}