import { gsap } from "gsap";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { Draggable } from "gsap/Draggable";
gsap.registerPlugin(Draggable, InertiaPlugin);

export default function clientsWheel() {
  const viewport = document.querySelector('[data-a="clients-viewport"]');
  const track = viewport?.querySelector('[data-a="clients-track"]');
  const items = track ? gsap.utils.toArray(track.querySelectorAll('[data-a="clients-item"]')) : [];
  if (!viewport || !track || !items.length) return;

  // Optional labels (not required for core loop)
  const labels = gsap.utils.toArray(track.querySelectorAll('[data-a="clients-label"]'));

  const state = {
    pos: 0,         // px offset (infinite)
    autoSpeed: 14,  // px/sec (slow ambient loop) - tweak
    dragging: false,
  };

  let itemH = 0;
  let totalH = 0;
  let inertiaActive = false;

  // Quick setters for performance
  const setY = items.map((el) => gsap.quickSetter(el, "y", "px"));
  const setRotX = items.map((el) => gsap.quickSetter(el, "rotationX", "deg"));
  const setZ = items.map((el) => gsap.quickSetter(el, "z", "px"));
  const setScale = items.map((el) => gsap.quickSetter(el, "scale"));
  const setOpacity = items.map((el) => gsap.quickSetter(el, "opacity"));

  const wrapPos = (v) => {
    // Wrap into (-totalH, 0]
    if (!totalH) return v;
    v = v % totalH;
    if (v > 0) v -= totalH;
    return v;
  };

  const measure = () => {
    // Measure a stable height (first item)
    const r = items[0].getBoundingClientRect();
    itemH = Math.max(1, r.height);
    totalH = itemH * items.length;
  };

  const render = () => {
    state.pos = wrapPos(state.pos);

    const vh = viewport.getBoundingClientRect().height;
    const center = vh * 0.5;

    // --- UPDATED: true cylinder mapping (sin/cos), only what's necessary ---
    const maxAngle = 75;  // degrees visible toward top/bottom (60–90)
    const radius = 320;   // cylinder radius in px (240–520)
    const fadeStart = 55; // degrees where fade/scale begins
    const fadeEnd = maxAngle;

    for (let i = 0; i < items.length; i++) {
      // Infinite layout: place each item based on index + pos, wrapped into [0..totalH)
      let y = i * itemH + state.pos;
      y = ((y % totalH) + totalH) % totalH; // 0..totalH
      y -= itemH; // slight bias so first item starts a bit above

      const itemCenterY = y + itemH * 0.5;
      const dist = itemCenterY - center;

      // Map distance -> angle (-maxAngle..maxAngle)
      const t = gsap.utils.clamp(-1, 1, dist / center);
      const angle = t * maxAngle;
      const rad = (angle * Math.PI) / 180;

      // True cylinder depth + rotation
      const rotX = -angle;
      const z = radius * (Math.cos(rad) - 1); // <= 0, curved depth (cosine)

      // Smooth falloff near edges (smoothstep)
      const absA = Math.abs(angle);
      const fadeT = gsap.utils.clamp(0, 1, (absA - fadeStart) / (fadeEnd - fadeStart));
      const smooth = fadeT * fadeT * (3 - 2 * fadeT);

      const scale = 1 - smooth * 0.08; // subtle shrink at edges
      const alpha = 1 - smooth * 0.75; // fade toward edges

      setY[i](y);
      setRotX[i](rotX);
      setZ[i](z);
      setScale[i](scale);
      setOpacity[i](alpha);
    }
  };

  // Init
  measure();
  render();

  // Keep it responsive
  const onResize = () => {
    measure();
    render();
  };
  window.addEventListener("resize", onResize);

  // Autoplay ticker (only when not dragging / not in inertia)
  const tick = (time, delta) => {
    const dt = delta / 1000;
    if (!state.dragging && !inertiaActive) {
      state.pos -= state.autoSpeed * dt;
      render();
    }
  };
  gsap.ticker.add(tick);

  // Draggable using a proxy (we never move DOM directly)
  const proxy = document.createElement("div");

  const d = Draggable.create(proxy, {
    type: "y",
    trigger: viewport,
    inertia: true,
    allowNativeTouchScrolling: false,
    dragResistance: 0.08,   // tweak: lower = faster response
    inertiaResistance: 14,  // tweak: lower = longer throws
    onPress() {
      state.dragging = true;
      inertiaActive = false;
      this.startY = this.y;
      this.startPos = state.pos;
      gsap.killTweensOf(proxy);
    },
    onDrag() {
      const dy = this.y - this.startY;
      state.pos = this.startPos + dy;
      render();
    },
    onThrowStart() {
      inertiaActive = true;
    },
    onThrowUpdate() {
      const dy = this.y - this.startY;
      state.pos = this.startPos + dy;
      render();
    },
    onThrowComplete() {
      inertiaActive = false;
      state.dragging = false;
    },
    onRelease() {
      // If no inertia throw happens, end drag here.
      if (!this.tween) state.dragging = false;
    },
  })[0];

  // Optional: make the cursor feel right
  viewport.style.cursor = "grab";
  viewport.addEventListener("pointerdown", () => (viewport.style.cursor = "grabbing"));
  window.addEventListener("pointerup", () => (viewport.style.cursor = "grab"));

  // Return a destroy function (nice for page transitions)
  return () => {
    window.removeEventListener("resize", onResize);
    gsap.ticker.remove(tick);
    d.kill();
  };
}