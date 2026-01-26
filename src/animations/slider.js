import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

gsap.registerPlugin(Draggable, InertiaPlugin);

/**
 * GSAP helper: horizontalLoop(items, config)
 * - Moves items with xPercent so it can wrap infinitely without clones.
 * - We keep it PAUSED (no autoplay). We drive it manually via loop.time(...)
 */
function horizontalLoop(items, config = {}) {
  items = gsap.utils.toArray(items);

  const tl = gsap.timeline({
    repeat: config.repeat ?? -1,
    paused: config.paused ?? true,
    defaults: { ease: "none" },
    onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100),
  });

  const length = items.length;
  const startX = items[0].offsetLeft;
  const times = new Array(length);
  const widths = new Array(length);
  const xPercents = new Array(length);

  const pixelsPerSecond = (config.speed || 1) * 100;
  const snap = config.snap === false ? (v) => v : gsap.utils.snap(config.snap || 1);
  const paddingRight = config.paddingRight || 0;

  gsap.set(items, {
    xPercent: (i, el) => {
      widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
      xPercents[i] = snap(parseFloat(gsap.getProperty(el, "xPercent")) || 0);
      return xPercents[i];
    },
  });

  gsap.set(items, { x: 0 });

  const totalWidth =
    items[length - 1].offsetLeft +
    (xPercents[length - 1] / 100) * widths[length - 1] -
    startX +
    items[length - 1].offsetWidth +
    paddingRight;

  for (let i = 0; i < length; i++) {
    const item = items[i];
    const curX = (xPercents[i] / 100) * widths[i];
    const distanceToStart = item.offsetLeft + curX - startX;
    const distanceToLoop = distanceToStart + widths[i];

    times[i] = distanceToStart / pixelsPerSecond;

    tl.to(
      item,
      {
        xPercent: snap(((curX - distanceToLoop) / widths[i]) * 100),
        duration: distanceToLoop / pixelsPerSecond,
      },
      0
    ).fromTo(
      item,
      {
        xPercent: snap(((curX - distanceToLoop + totalWidth) / widths[i]) * 100),
      },
      {
        xPercent: xPercents[i],
        duration: (totalWidth - distanceToLoop) / pixelsPerSecond,
        immediateRender: false,
      },
      distanceToLoop / pixelsPerSecond
    );
  }

  tl.times = times;
  tl.totalWidth = totalWidth;
  tl.pixelsPerSecond = pixelsPerSecond;

  return tl;
}

export default function servicesCarousel() {
  const wrapper = document.querySelector(".carrousel-wrapper");
  const list = wrapper?.querySelector(".carrousel-list");
  let items = list ? gsap.utils.toArray(list.querySelectorAll(".carrousel-item")) : [];
  if (!wrapper || !list || !items.length) return;

  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const getInner = () => {
    const wr = wrapper.getBoundingClientRect();
    const cs = getComputedStyle(wrapper);
    const pl = num(cs.paddingLeft);
    const pr = num(cs.paddingRight);

    const innerLeft = wr.left + pl;
    const innerRight = wr.right - pr;
    const innerWidth = Math.max(1, innerRight - innerLeft);
    const centerX = innerLeft + innerWidth * 0.5;

    return { innerLeft, innerRight, innerWidth, centerX };
  };

  // loop + time wrapping
  let loop = null;
  let wrapTime = null;

  // drive loop by pixels
  const state = { x: 0 };

  const killLoop = () => {
    if (loop) {
      loop.kill();
      loop = null;
      wrapTime = null;
    }
  };

  const render = () => {
    if (!loop || !wrapTime) return;
    const t = -state.x / loop.pixelsPerSecond;
    loop.time(wrapTime(t), false);
  };

  // snap so the closest item is centered
  const snapToCenter = (animate = true) => {
    const { centerX } = getInner();

    let closestIdx = 0;
    let best = Infinity;

    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      const c = r.left + r.width * 0.5;
      const d = Math.abs(c - centerX);
      if (d < best) {
        best = d;
        closestIdx = i;
      }
    }

    const r = items[closestIdx].getBoundingClientRect();
    const itemCenter = r.left + r.width * 0.5;

    const delta = centerX - itemCenter;
    const target = state.x + delta;

    if (!animate) {
      state.x = target;
      render();
      return;
    }

    gsap.to(state, {
      x: target,
      duration: 0.35,
      ease: "expo.out",
      onUpdate: render,
      onComplete: render,
    });
  };

  const buildLoop = () => {
    killLoop();

    // re-capture items (in case Webflow CMS updates)
    items = gsap.utils.toArray(list.querySelectorAll(".carrousel-item"));
    if (!items.length) return;

    // IMPORTANT: do not touch scale/x (keep layout stable)
    gsap.set(items, { x: 0, xPercent: 0, willChange: "transform" });

    const csList = getComputedStyle(list);
    const cssGap = num(csList.columnGap) || num(csList.gap) || num(csList.rowGap) || 0;

    loop = horizontalLoop(items, {
      paused: true,
      repeat: -1,
      speed: 1,
      snap: 1,
      paddingRight: cssGap,
    });

    wrapTime = gsap.utils.wrap(0, loop.duration());

    state.x = 0;
    render();
    snapToCenter(false);
  };

  const settle = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        buildLoop();
        requestAnimationFrame(buildLoop); // second pass for layout/fonts settling
      });
    });
  };

  settle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  window.addEventListener("load", settle, { once: true });

  const onResize = () => settle();
  window.addEventListener("resize", onResize);

  // draggable (infinite)
  const proxy = document.createElement("div");

  const d = Draggable.create(proxy, {
    type: "x",
    trigger: wrapper,
    inertia: true,
    allowNativeTouchScrolling: false,
    dragResistance: 0.08,
    inertiaResistance: 14,

    onPress() {
      gsap.killTweensOf(state);
      this.startX = this.x;
      this.startStateX = state.x;
    },

    onDrag() {
      state.x = this.startStateX + (this.x - this.startX);
      render();
    },

    onThrowUpdate() {
      state.x = this.startStateX + (this.x - this.startX);
      render();
    },

    onThrowComplete() {
      snapToCenter(true);
    },

    onRelease() {
      if (!this.tween) snapToCenter(true);
    },
  })[0];

  wrapper.style.cursor = "grab";
  wrapper.addEventListener("pointerdown", () => (wrapper.style.cursor = "grabbing"));
  const onUp = () => (wrapper.style.cursor = "grab");
  window.addEventListener("pointerup", onUp);

  return () => {
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointerup", onUp);
    killLoop();
    d.kill();
  };
}