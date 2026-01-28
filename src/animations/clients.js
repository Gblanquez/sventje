import { gsap } from "gsap";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { Draggable } from "gsap/Draggable";
gsap.registerPlugin(Draggable, InertiaPlugin);

function verticalLoop(items, config = {}) {
  items = gsap.utils.toArray(items);

  const tl = gsap.timeline({
    repeat: config.repeat ?? -1,
    paused: config.paused ?? true,
    defaults: { ease: "none" },
    onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100),
  });

  const length = items.length;
  const startY = items[0].offsetTop;
  const times = new Array(length);
  const heights = new Array(length);
  const yPercents = new Array(length);

  const pixelsPerSecond = (config.speed || 1) * 100;
  const snap = config.snap === false ? (v) => v : gsap.utils.snap(config.snap || 1);
  const paddingBottom = config.paddingBottom || 0;

  gsap.set(items, {
    yPercent: (i, el) => {
      heights[i] = parseFloat(gsap.getProperty(el, "height", "px"));
      yPercents[i] = snap(parseFloat(gsap.getProperty(el, "yPercent")) || 0);
      return yPercents[i];
    },
  });

  gsap.set(items, { y: 0 });

  const totalHeight =
    items[length - 1].offsetTop +
    (yPercents[length - 1] / 100) * heights[length - 1] -
    startY +
    items[length - 1].offsetHeight +
    paddingBottom;

  for (let i = 0; i < length; i++) {
    const item = items[i];
    const curY = (yPercents[i] / 100) * heights[i];
    const distanceToStart = item.offsetTop + curY - startY;
    const distanceToLoop = distanceToStart + heights[i];

    times[i] = distanceToStart / pixelsPerSecond;

    tl.to(
      item,
      {
        yPercent: snap(((curY - distanceToLoop) / heights[i]) * 100),
        duration: distanceToLoop / pixelsPerSecond,
      },
      0
    ).fromTo(
      item,
      {
        yPercent: snap(((curY - distanceToLoop + totalHeight) / heights[i]) * 100),
      },
      {
        yPercent: yPercents[i],
        duration: (totalHeight - distanceToLoop) / pixelsPerSecond,
        immediateRender: false,
      },
      distanceToLoop / pixelsPerSecond
    );
  }

  tl.times = times;
  tl.totalHeight = totalHeight;
  tl.pixelsPerSecond = pixelsPerSecond;

  return tl;
}

export default function clientsWheel() {
  const viewport = document.querySelector('[data-a="client-wrap"]');
  const track = viewport?.querySelector('[data-a="client-track"]');
  let items = track ? gsap.utils.toArray(track.querySelectorAll('[data-a="clients-item"]')) : [];
  if (!viewport || !track || !items.length) return;

  const imageItems = gsap.utils.toArray(document.querySelectorAll('[data-a="client-img-item"]'));
  const arrow = document.querySelector('[data-a="client-arrow"]');
  const counterEl = document.querySelector('[data-a="client-c-number"]');

  const state = { y: 0 };

  let loop = null;
  let wrapTime = null;

  const setClientOpacity = items.map((el) => gsap.quickSetter(el, "opacity"));

  const getSelectY = () => {
    const vr = viewport.getBoundingClientRect();
    if (arrow) {
      const ar = arrow.getBoundingClientRect();
      return ar.top + ar.height * 0.5 - vr.top;
    }
    return vr.height * 0.5;
  };

  let activeIndex = -1;
  const formatIndex = (i) => String(i + 1).padStart(2, "0");

  const setActive = (idx) => {
    if (idx === activeIndex) return;
    activeIndex = idx;

    for (let i = 0; i < items.length; i++) {
      setClientOpacity[i](i === idx ? 1 : 0.4);
    }

    if (imageItems.length) {
      for (let i = 0; i < imageItems.length; i++) {
        gsap.set(imageItems[i], { opacity: i === idx ? 1 : 0 });
      }
    }

    for (let i = 0; i < items.length; i++) {
      const services = items[i].querySelectorAll('[data-a="client-service-item"]');
      if (!services.length) continue;
      gsap.set(services, { opacity: i === idx ? 1 : 0 });
    }

    if (counterEl) counterEl.textContent = formatIndex(idx);
  };

  // NEW: force activation even if activeIndex guard would skip
  const forceActive = (idx) => {
    activeIndex = -1;
    setActive(idx);
  };

  const findClosestIndex = () => {
    const vr = viewport.getBoundingClientRect();
    const selectY = getSelectY();

    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      const centerInViewport = (r.top - vr.top) + r.height * 0.5;
      const d = Math.abs(centerInViewport - selectY);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    return bestIdx;
  };

  const render = () => {
    if (loop && wrapTime) {
      const t = -state.y / loop.pixelsPerSecond;
      loop.time(wrapTime(t), false);
    }
    setActive(findClosestIndex());
  };

  const snapToSelect = (animate = true) => {
    const vr = viewport.getBoundingClientRect();
    const selectY = getSelectY();
    const idx = findClosestIndex();

    const r = items[idx].getBoundingClientRect();
    const centerInViewport = (r.top - vr.top) + r.height * 0.5;

    const delta = selectY - centerInViewport;
    const target = state.y + delta;

    if (!animate) {
      state.y = target;
      render();
      return;
    }

    gsap.to(state, {
      y: target,
      duration: 0.35,
      ease: "expo.out",
      onUpdate: render,
      onComplete: render,
    });
  };

  const killLoop = () => {
    if (loop) {
      loop.kill();
      loop = null;
      wrapTime = null;
    }
  };

  const buildLoop = () => {
    killLoop();

    items = gsap.utils.toArray(track.querySelectorAll('[data-a="clients-item"]'));
    if (!items.length) return;

    gsap.set(items, { y: 0, yPercent: 0, willChange: "transform,opacity" });

    if (imageItems.length) gsap.set(imageItems, { opacity: 0, willChange: "opacity" });
    items.forEach((el) => {
      const services = el.querySelectorAll('[data-a="client-service-item"]');
      if (services.length) gsap.set(services, { opacity: 0, willChange: "opacity" });
    });

    const csTrack = getComputedStyle(track);
    const cssGap =
      parseFloat(csTrack.rowGap) ||
      parseFloat(csTrack.gap) ||
      parseFloat(csTrack.columnGap) ||
      0;

    loop = verticalLoop(items, {
      paused: true,
      repeat: -1,
      speed: 1,
      snap: 1,
      paddingBottom: cssGap,
    });

    wrapTime = gsap.utils.wrap(0, loop.duration());

    state.y = 0;
    render();
    snapToSelect(false);

    // NEW: force initial UI state (image/services) immediately on load
    const idx = findClosestIndex();
    forceActive(idx);
  };

  const settle = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        buildLoop();
        requestAnimationFrame(buildLoop);
      });
    });
  };

  gsap.set(items, { opacity: 0.4 });
  settle();

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  window.addEventListener("load", settle, { once: true });

  const onResize = () => settle();
  window.addEventListener("resize", onResize);

  const proxy = document.createElement("div");

  const d = Draggable.create(proxy, {
    type: "y",
    trigger: viewport,
    inertia: true,
    allowNativeTouchScrolling: false,
    dragResistance: 0.08,
    inertiaResistance: 14,

    onPress() {
      gsap.killTweensOf(state);
      this.startY = this.y;
      this.startStateY = state.y;
    },

    onDrag() {
      state.y = this.startStateY + (this.y - this.startY);
      render();
    },

    onThrowUpdate() {
      state.y = this.startStateY + (this.y - this.startY);
      render();
    },

    onThrowComplete() {
      snapToSelect(true);
    },

    onRelease() {
      if (!this.tween) snapToSelect(true);
    },
  })[0];

  viewport.style.cursor = "grab";
  viewport.addEventListener("pointerdown", () => (viewport.style.cursor = "grabbing"));
  const onUp = () => (viewport.style.cursor = "grab");
  window.addEventListener("pointerup", onUp);

  return () => {
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointerup", onUp);
    killLoop();
    d.kill();
  };
}