import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

gsap.registerPlugin(Draggable, InertiaPlugin);

export default function servicesCarousel() {
  const wrapper = document.querySelector(".carrousel-wrapper");
  const list = wrapper?.querySelector(".carrousel-list");
  if (!wrapper || !list) return;

  let d = null;
  let bounds = { minX: 0, maxX: 0 };

  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const innerEdges = () => {
    const wr = wrapper.getBoundingClientRect();
    const cs = getComputedStyle(wrapper);
    const pl = num(cs.paddingLeft);
    const pr = num(cs.paddingRight);
    return {
      left: wr.left + pl,
      right: wr.right - pr,
    };
  };

  const measure = () => {
    const first = list.querySelector(".carrousel-item:first-child");
    const last = list.querySelector(".carrousel-item:last-child");
    if (!first || !last) {
      bounds = { minX: 0, maxX: 0 };
      if (d) d.applyBounds(bounds);
      return;
    }

    const { left: innerLeft, right: innerRight } = innerEdges();

    const listX = num(gsap.getProperty(list, "x"));

    const firstRect = first.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();

    const firstCS = getComputedStyle(first);
    const lastCS = getComputedStyle(last);

    const firstML = num(firstCS.marginLeft);
    const lastMR = num(lastCS.marginRight);

    // Include margins (rects don't)
    const firstEdge = firstRect.left - firstML;
    const lastEdge = lastRect.right + lastMR;

    // Bounds in the same coordinate space as current listX
    const maxX = listX + (innerLeft - firstEdge);   // keep first fully visible
    const minX = listX + (innerRight - lastEdge);   // bring last fully visible

    // If content fits, disable dragging
    bounds = minX > maxX ? { minX: 0, maxX: 0 } : { minX, maxX };

    if (d) d.applyBounds(bounds);
  };

  measure();
  const onResize = () => measure();
  window.addEventListener("resize", onResize);

  d = Draggable.create(list, {
    type: "x",
    trigger: wrapper,
    inertia: true,
    allowNativeTouchScrolling: false,
    dragResistance: 0.08,
    inertiaResistance: 14,
    bounds: () => bounds,
    onPress: measure, // refresh bounds right before interaction
  })[0];

  wrapper.style.cursor = "grab";
  const onDown = () => (wrapper.style.cursor = "grabbing");
  const onUp = () => (wrapper.style.cursor = "grab");
  wrapper.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);

  return () => {
    window.removeEventListener("resize", onResize);
    wrapper.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    d.kill();
  };
}