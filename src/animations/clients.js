import { gsap } from "gsap";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { Draggable } from "gsap/Draggable";
gsap.registerPlugin(Draggable, InertiaPlugin);

export default function clientsWheel() {
  const viewport = document.querySelector('[data-a="client-wrap"]');
  const track = viewport?.querySelector('[data-a="client-track"]');
  const items = track ? gsap.utils.toArray(track.querySelectorAll('[data-a="clients-item"]')) : [];
  if (!viewport || !track || !items.length) return;

  const imageItems = gsap.utils.toArray(document.querySelectorAll('[data-a="client-img-item"]'));
  const arrow = document.querySelector('[data-a="client-arrow"]');

  const state = { pos: 0, dragging: false };

  let itemH = 0;
  let totalH = 0;
  let minPos = 0;
  let maxPos = 0;

  const setY = items.map((el) => gsap.quickSetter(el, "y", "px"));
  const setClientOpacity = items.map((el) => gsap.quickSetter(el, "opacity"));

  const clamp = gsap.utils.clamp;

  const measure = () => {
    const r0 = items[0].getBoundingClientRect();
    itemH = Math.max(1, r0.height);
    totalH = itemH * items.length;

    const vh = viewport.getBoundingClientRect().height;

    // We lay out items like:
    // y = i*itemH + pos; then we subtract itemH (bias) like before.
    // We'll allow pos so the list can be moved up/down but NOT wrapped.
    // maxPos = 0 (top-ish), minPos negative (scroll down the list).
    maxPos = 0;

    // total scrollable distance:
    const scrollable = Math.max(0, totalH - vh);

    // clamp range. little bias to match our -itemH shift so you can reach last item nicely.
    minPos = -(scrollable + itemH);
  };

  const getSelectY = () => {
    const vr = viewport.getBoundingClientRect();
    if (arrow) {
      const ar = arrow.getBoundingClientRect();
      return ar.top + ar.height * 0.5 - vr.top; // arrow center, viewport-local
    }
    return vr.height * 0.5;
  };

  let activeIndex = -1;

  const setActive = (idx) => {
    if (idx === activeIndex) return;
    activeIndex = idx;

    // Clients: active 1, inactive 0.4
    for (let i = 0; i < items.length; i++) {
      setClientOpacity[i](i === idx ? 1 : 0.4);
    }

    // Images: active 1, inactive 0 (by index)
    if (imageItems.length) {
      for (let i = 0; i < imageItems.length; i++) {
        gsap.set(imageItems[i], { opacity: i === idx ? 1 : 0 });
      }
    }

    // Services: nested CMS inside each client item
    for (let i = 0; i < items.length; i++) {
      const services = items[i].querySelectorAll('[data-a="client-service-item"]');
      if (!services.length) continue;
      gsap.set(services, { opacity: i === idx ? 1 : 0 });
    }
  };

  const render = () => {
    // Clamp (non-infinite)
    state.pos = clamp(minPos, maxPos, state.pos);

    const vr = viewport.getBoundingClientRect();
    const tr = track.getBoundingClientRect();

    // Track offset inside viewport (important!)
    const trackOffsetY = tr.top - vr.top;

    const selectY = getSelectY();

    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < items.length; i++) {
      // Your original “bias” so first item starts slightly above
      const y = i * itemH + state.pos - itemH;

      const itemCenterInViewport = trackOffsetY + (y + itemH * 0.5);
      const d = Math.abs(itemCenterInViewport - selectY);

      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }

      setY[i](y);
    }

    setActive(bestIdx);
  };

  // Init
  measure();

  gsap.set(items, { opacity: 0.4, willChange: "transform,opacity" });
  if (imageItems.length) gsap.set(imageItems, { opacity: 0, willChange: "opacity" });

  items.forEach((el) => {
    const services = el.querySelectorAll('[data-a="client-service-item"]');
    if (services.length) gsap.set(services, { opacity: 0, willChange: "opacity" });
  });

  render();

  const onResize = () => {
    measure();
    render();
  };
  window.addEventListener("resize", onResize);

  // Draggable proxy (does NOT move your real DOM; avoids layout shifts)
  const proxy = document.createElement("div");

  const d = Draggable.create(proxy, {
    type: "y",
    trigger: viewport,
    inertia: true,
    allowNativeTouchScrolling: false,
    dragResistance: 0.08,
    inertiaResistance: 14,

    onPress() {
      state.dragging = true;
      this.startY = this.y;
      this.startPos = state.pos;
      gsap.killTweensOf(proxy);
    },

    onDrag() {
      const dy = this.y - this.startY;
      state.pos = this.startPos + dy;
      render();
    },

    onThrowUpdate() {
      const dy = this.y - this.startY;
      state.pos = this.startPos + dy;
      render();
    },

    onThrowComplete() {
      state.dragging = false;
    },

    onRelease() {
      if (!this.tween) state.dragging = false;
    },
  })[0];

  viewport.style.cursor = "grab";
  viewport.addEventListener("pointerdown", () => (viewport.style.cursor = "grabbing"));
  window.addEventListener("pointerup", () => (viewport.style.cursor = "grab"));

  return () => {
    window.removeEventListener("resize", onResize);
    d.kill();
  };
}