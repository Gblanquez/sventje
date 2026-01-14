import { gsap } from "gsap";

export default function scrollHintLoop() {
  const wrap = document.querySelector(".scroll-trigger-wrapper");
  const line = wrap?.querySelector(".line-scroll-m");
  if (!wrap || !line) return;

  gsap.set(line, { height: "0%", y: "0%" });

  const tl = gsap.timeline({ repeat: -1 });

  tl.fromTo(
    line,
    { height: "0%", y: "0%" },
    { height: "100%", duration: 0.9, ease: "power2.out" }
  )
    .to(line, { y: "100%", duration: 0.65, ease: "power2.in" })
    .set(line, { height: "0%", y: "0%" })
    .to({}, { duration: 0.25 });

  return tl;
}

