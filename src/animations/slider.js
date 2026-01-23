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

  const pixelsPerSecond = (config.speed || 1) * 100; // speed=1 => 100px/s
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
  let originals = list ? gsap.utils.toArray(list.querySelectorAll(".carrousel-item")) : [];
  if (!wrapper || !list || !originals.length) return;

  // --------------------
  // knobs (same intent)
  // --------------------
  const minScale = 0.78;   // edge size
  const maxScale = 1.12;   // hero size
  const falloff = 1.25;    // >1 = more focus in center
  const nonHeroMax = 1.02; // everyone except hero can never exceed this
  const heroBoost = 0.04;  // extra pop on hero

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

  // --------------------
  // layout cache (single set baseline — keeps your spacing)
  // --------------------
  let allItems = [];
  let baseLeft = [];
  let baseWidth = [];
  let baseCenter = [];
  let gaps = [];

  // loop + time wrapping
  let loop = null;
  let wrapTime = null;

  const cacheLayout = () => {
    allItems = gsap.utils.toArray(list.querySelectorAll(".carrousel-item"));

    // Reset transforms for clean measurement (important)
    gsap.set(allItems, { scale: 1, x: 0, xPercent: 0 });

    baseLeft = allItems.map((el) => el.offsetLeft);
    baseWidth = allItems.map((el) => el.getBoundingClientRect().width);
    baseCenter = baseLeft.map((l, i) => l + baseWidth[i] * 0.5);

    gaps = [];
    for (let i = 0; i < allItems.length - 1; i++) {
      const rightEdge = baseLeft[i] + baseWidth[i];
      gaps[i] = baseLeft[i + 1] - rightEdge;
    }
  };

  // --------------------
  // scaling + repack (single set)
  // --------------------
  const updateScales = () => {
    const { innerWidth, centerX } = getInner();
    const maxDist = innerWidth * 0.5;

    const scales = new Array(allItems.length);
    let heroIdx = 0;
    let heroDist = Infinity;

    for (let i = 0; i < allItems.length; i++) {
      const r = allItems[i].getBoundingClientRect();
      const itemCenter = r.left + r.width * 0.5;

      const dist = Math.abs(itemCenter - centerX);
      if (dist < heroDist) {
        heroDist = dist;
        heroIdx = i;
      }

      let t = Math.min(1, dist / maxDist);
      t = t * t * (3 - 2 * t);
      t = Math.pow(t, falloff);

      scales[i] = maxScale - (maxScale - minScale) * t;
    }

    for (let i = 0; i < scales.length; i++) {
      if (i === heroIdx) scales[i] = maxScale + heroBoost;
      else scales[i] = Math.min(scales[i], nonHeroMax);
    }

    // repack so spacing stays visually consistent while scaling
    let targetLeft = baseLeft[0];

    for (let i = 0; i < allItems.length; i++) {
      const sc = scales[i];
      const w = baseWidth[i] * sc;
      const targetCenter = targetLeft + w * 0.5;

      const originalCenter = baseCenter[i];
      const dx = targetCenter - originalCenter;

      gsap.set(allItems[i], { scale: sc, x: dx });

      if (i < allItems.length - 1) targetLeft = targetLeft + w + gaps[i];
    }
  };

  // --------------------
  // render (drive LOOP via state.x)
  // --------------------
  const state = { x: 0 };

  const render = () => {
    if (loop && wrapTime) {
      // map pixels -> time, no autoplay (only changes when state.x changes)
      const t = -state.x / loop.pixelsPerSecond;
      loop.time(wrapTime(t), false);
    }
    updateScales();
  };

  // --------------------
  // snap so ONE item is centered (hero)
  // --------------------
  const snapToCenter = (animate = true) => {
    const { centerX } = getInner();

    let heroIdx = 0;
    let heroDist = Infinity;

    for (let i = 0; i < allItems.length; i++) {
      const r = allItems[i].getBoundingClientRect();
      const c = r.left + r.width * 0.5;
      const dist = Math.abs(c - centerX);
      if (dist < heroDist) {
        heroDist = dist;
        heroIdx = i;
      }
    }

    const heroRect = allItems[heroIdx].getBoundingClientRect();
    const heroCenter = heroRect.left + heroRect.width * 0.5;

    const delta = centerX - heroCenter;
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

  // --------------------
  // init / settle (rebuild loop, no clones)
  // --------------------
  let d = null;
  const proxy = document.createElement("div");

  const killLoop = () => {
    if (loop) {
      loop.kill();
      loop = null;
      wrapTime = null;
    }
  };

  const buildLoop = () => {
    killLoop();

    // (re)capture items
    originals = gsap.utils.toArray(list.querySelectorAll(".carrousel-item"));
    allItems = originals;

    // set perf hints
    gsap.set(allItems, { transformOrigin: "50% 50%", willChange: "transform" });

    cacheLayout();

    const csList = getComputedStyle(list);
    const cssGap = num(csList.columnGap) || num(csList.gap) || num(csList.rowGap) || 0;

    loop = horizontalLoop(allItems, {
      paused: true,     // <-- IMPORTANT: no autoplay
      repeat: -1,
      speed: 1,         // only affects pixel->time mapping (drag feel), not autoplay
      snap: 1,
      paddingRight: cssGap,
    });

    wrapTime = gsap.utils.wrap(0, loop.duration());

    // start “neutral”
    state.x = 0;
    render();
    snapToCenter(false);
  };

  const settle = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        buildLoop();

        // second pass (fonts/layout settling)
        requestAnimationFrame(() => {
          buildLoop();
        });
      });
    });
  };

  settle();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(settle);
  }
  window.addEventListener("load", settle, { once: true });

  const onResize = () => settle();
  window.addEventListener("resize", onResize);

  // --------------------
  // draggable (infinite) — unchanged behavior
  // --------------------
  d = Draggable.create(proxy, {
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