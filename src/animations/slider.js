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

  // --- knobs (tweak these only) ---
  const minScale = 0.78; // edge size
  const falloff = 1.25;  // >1 = more focus in center, 1 = linear

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

  const updateScales = () => {
    const { innerWidth, centerX } = getInner();
    const maxDist = innerWidth * 0.5;

    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      const itemCenter = r.left + r.width * 0.5;

      // 0 at center -> 1 at edges
      let t = Math.min(1, Math.abs(itemCenter - centerX) / maxDist);

      // smoothstep (nice)
      t = t * t * (3 - 2 * t);

      // shape (more focus in center)
      t = Math.pow(t, falloff);

      const s = 1 - (1 - minScale) * t;
      gsap.set(items[i], { scale: s });
    }
  };

  const measureBounds = () => {
    // IMPORTANT: measure bounds with neutral scale so edge math isn't affected by scaling
    gsap.set(items, { scale: 1 });

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

    // re-apply scaling after measuring
    updateScales();
  };

  // --- init ---
  gsap.set(items, { transformOrigin: "50% 50%", willChange: "transform" });

  measureBounds();
  window.addEventListener("resize", measureBounds);

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
    window.removeEventListener("resize", measureBounds);
    d.kill();
  };
}