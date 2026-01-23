import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

gsap.registerPlugin(Draggable, InertiaPlugin);

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
  // build 3 sets (prepend + original + append)
  // --------------------
  const clearClones = () => {
    list.querySelectorAll('[data-clone="true"]').forEach((n) => n.remove());
  };

  const buildClones = () => {
    clearClones();

    // IMPORTANT: make sure "originals" refers to ONLY the original DOM nodes (no clones)
    originals = gsap.utils
      .toArray(list.querySelectorAll(".carrousel-item"))
      .filter((el) => el.getAttribute("data-clone") !== "true");

    const prep = originals.map((el) => {
      const c = el.cloneNode(true);
      c.setAttribute("data-clone", "true");
      return c;
    });
    const app = originals.map((el) => {
      const c = el.cloneNode(true);
      c.setAttribute("data-clone", "true");
      return c;
    });

    for (let i = prep.length - 1; i >= 0; i--) list.insertBefore(prep[i], list.firstChild);
    app.forEach((n) => list.appendChild(n));

    // refresh items list (now includes clones)
    originals = gsap.utils.toArray(list.querySelectorAll(".carrousel-item"));
  };

  // --------------------
  // layout cache per set (to preserve your spacing)
  // --------------------
  let allItems = [];
  let setCount = 0;
  let perSet = 0;

  let baseLeft = [];
  let baseWidth = [];
  let baseCenter = [];
  let gaps = [];
  let setOffsets = [];

  let trackW = 0;
  let wrapMin = 0;
  let wrapMax = 0;

  const cacheLayout = () => {
    allItems = gsap.utils.toArray(list.querySelectorAll(".carrousel-item"));
    perSet = allItems.length / 3;
    setCount = 3;

    // Reset transforms for clean measurement
    gsap.set(allItems, { scale: 1, x: 0 });

    const midStart = perSet; // set #1
    const mid = allItems.slice(midStart, midStart + perSet);

    baseLeft = mid.map((el) => el.offsetLeft);
    baseWidth = mid.map((el) => el.getBoundingClientRect().width);
    baseCenter = baseLeft.map((l, i) => l + baseWidth[i] * 0.5);

    gaps = [];
    for (let i = 0; i < perSet - 1; i++) {
      const rightEdge = baseLeft[i] + baseWidth[i];
      gaps[i] = baseLeft[i + 1] - rightEdge;
    }

    const setStarts = [0, perSet, perSet * 2];
    const midStartLeft = allItems[midStart].offsetLeft;

    setOffsets = setStarts.map((startIdx) => {
      const left = allItems[startIdx].offsetLeft;
      return left - midStartLeft;
    });

    trackW = allItems[midStart + perSet].offsetLeft - allItems[midStart].offsetLeft;

    // keep “middle set in play”
    wrapMin = -2 * trackW;
    wrapMax = 0;
  };

  // --------------------
  // seam killer: keep state.x living around the middle set
  // --------------------
  const normalizeToMiddle = () => {
    if (!trackW) return;

    // We want to keep state.x in a safe band around [-trackW, 0)
    // but without a visible snap: we shift by exact trackW increments.
    // Using a small buffer avoids hitting the seam during fast throws.
    const buffer = trackW * 0.25;

    while (state.x < wrapMin + buffer) state.x += trackW;
    while (state.x > wrapMax - buffer) state.x -= trackW;
  };

  // --------------------
  // scaling + repack (per set)
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

    for (let s = 0; s < setCount; s++) {
      const startIdx = s * perSet;
      const setOffset = setOffsets[s];

      let targetLeft = baseLeft[0] + setOffset;

      for (let i = 0; i < perSet; i++) {
        const idx = startIdx + i;
        const sc = scales[idx];

        const w = baseWidth[i] * sc;
        const targetCenter = targetLeft + w * 0.5;

        const originalCenter = baseCenter[i] + setOffset;
        const dx = targetCenter - originalCenter;

        gsap.set(allItems[idx], { scale: sc, x: dx });

        if (i < perSet - 1) targetLeft = targetLeft + w + gaps[i];
      }
    }
  };

  // --------------------
  // render (wrap + normalize)
  // --------------------
  const state = { x: 0 };

  const wrapX = (x) => {
    const range = wrapMax - wrapMin;
    if (!range) return x;
    let v = (x - wrapMin) % range;
    if (v < 0) v += range;
    return v + wrapMin;
  };

  const render = () => {
    normalizeToMiddle();
    const x = wrapX(state.x);
    gsap.set(list, { x });
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
  // init (no “small drag needed”)
  // --------------------
  let d = null;
  const proxy = document.createElement("div");

  const settle = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cacheLayout();

        // start around middle set (this is the “safe” zone)
        state.x = -trackW;
        render();
        snapToCenter(false);

        requestAnimationFrame(() => {
          cacheLayout();
          render();
          snapToCenter(false);
        });
      });
    });
  };

  gsap.set(list, { x: 0 });
  buildClones();

  allItems = gsap.utils.toArray(list.querySelectorAll(".carrousel-item"));
  gsap.set(allItems, { transformOrigin: "50% 50%", willChange: "transform" });

  settle();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(settle);
  }
  window.addEventListener("load", settle, { once: true });

  const onResize = () => settle();
  window.addEventListener("resize", onResize);

  // --------------------
  // draggable (infinite) - keep in middle set to prevent seam gaps
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
      normalizeToMiddle();
      render();
    },

    onThrowUpdate() {
      state.x = this.startStateX + (this.x - this.startX);
      normalizeToMiddle();
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
    clearClones();
    d.kill();
  };
}