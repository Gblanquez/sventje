import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

gsap.registerPlugin(Draggable, InertiaPlugin);

export default function servicesCarousel() {
  const wrapper = document.querySelector(".carrousel-wrapper");
  const list = wrapper?.querySelector(".carrousel-list");
  const items = list ? gsap.utils.toArray(list.querySelectorAll(".carrousel-item")) : [];
  if (!wrapper || !list || !items.length) return;

  let d = null;
  let bounds = { minX: 0, maxX: 0 };

  // --- knobs ---
  const minScale = 0.78;   // edge size
  const maxScale = 1.12;   // hero size
  const falloff = 1.25;    // >1 = more focus in center

  // Prevent "2 heroes":
  const nonHeroMax = 1.02; // everyone except hero can never exceed this
  const heroBoost = 0.04;  // extra pop on hero (added on top of computed)

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

  // ---- baseline layout cache (preserve your spacing) ----
  let baseLeft = [];
  let baseWidth = [];
  let baseCenter = [];
  let gaps = [];

  const cacheLayout = () => {
    gsap.set(items, { scale: 1, x: 0 });

    baseLeft = items.map((el) => el.offsetLeft);
    baseWidth = items.map((el) => el.getBoundingClientRect().width);
    baseCenter = baseLeft.map((l, i) => l + baseWidth[i] * 0.5);

    gaps = [];
    for (let i = 0; i < items.length - 1; i++) {
      const rightEdge = baseLeft[i] + baseWidth[i];
      gaps[i] = baseLeft[i + 1] - rightEdge;
    }
  };

  const updateScales = () => {
    const { innerWidth, centerX } = getInner();
    const maxDist = innerWidth * 0.5;

    const scales = new Array(items.length);
    let heroIdx = 0;
    let heroDist = Infinity;

    // 1) compute scales + find closest to center (hero)
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      const itemCenter = r.left + r.width * 0.5;

      const dist = Math.abs(itemCenter - centerX);
      if (dist < heroDist) {
        heroDist = dist;
        heroIdx = i;
      }

      let t = Math.min(1, dist / maxDist);
      t = t * t * (3 - 2 * t); // smoothstep
      t = Math.pow(t, falloff);

      // scale mapped from maxScale (center) -> minScale (edges)
      scales[i] = maxScale - (maxScale - minScale) * t;
    }

    // 2) enforce single hero
    for (let i = 0; i < scales.length; i++) {
      if (i === heroIdx) {
        scales[i] = maxScale + heroBoost;
      } else {
        scales[i] = Math.min(scales[i], nonHeroMax);
      }
    }

    // 3) repack positions with original gaps (this keeps your spacing)
    let targetLeft = baseLeft[0];

    for (let i = 0; i < items.length; i++) {
      const w = baseWidth[i] * scales[i];
      const targetCenter = targetLeft + w * 0.5;

      const dx = targetCenter - baseCenter[i];

      gsap.set(items[i], { scale: scales[i], x: dx });

      if (i < items.length - 1) {
        targetLeft = targetLeft + w + gaps[i];
      }
    }
  };

  const measureBounds = () => {
    gsap.set(items, { scale: 1, x: 0 });

    const first = items[0];
    const last = items[items.length - 1];
    const { innerLeft, innerRight } = getInner();

    const listX = num(gsap.getProperty(list, "x"));

    const firstRect = first.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();

    const firstCS = getComputedStyle(first);
    const lastCS = getComputedStyle(last);

    const firstML = num(firstCS.marginLeft);
    const lastMR = num(lastCS.marginRight);

    const firstEdge = firstRect.left - firstML;
    const lastEdge = lastRect.right + lastMR;

    const maxX = listX + (innerLeft - firstEdge);
    const minX = listX + (innerRight - lastEdge);

    bounds = minX > maxX ? { minX: 0, maxX: 0 } : { minX, maxX };

    if (d) d.applyBounds(bounds);

    cacheLayout();
    updateScales();
  };

  // init
  gsap.set(items, { transformOrigin: "50% 50%", willChange: "transform" });

  cacheLayout();
  measureBounds();

  const onResize = () => measureBounds();
  window.addEventListener("resize", onResize);

  d = Draggable.create(list, {
    type: "x",
    trigger: wrapper,
    inertia: true,
    allowNativeTouchScrolling: false,
    dragResistance: 0.08,
    inertiaResistance: 14,
    bounds: () => bounds,
    onPress: measureBounds,
    onDrag: updateScales,
    onThrowUpdate: updateScales,
    onThrowComplete: updateScales,
  })[0];

  wrapper.style.cursor = "grab";
  wrapper.addEventListener("pointerdown", () => (wrapper.style.cursor = "grabbing"));
  window.addEventListener("pointerup", () => (wrapper.style.cursor = "grab"));

  return () => {
    window.removeEventListener("resize", onResize);
    d.kill();
  };
}