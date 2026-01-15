import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

export default function globalVerticalLinesReveal() {
  const lines = gsap.utils.toArray(".global-line-v");
  if (!lines.length) return;

  lines.forEach((line) => {
    gsap.set(line, {
      scaleY: 0,
      transformOrigin: "top",
      willChange: "transform",
    });

    gsap.to(line, {
      scaleY: 1,
      delay: 0.01,
      duration: 1.4,
      ease: "power3.out",
      scrollTrigger: {
        trigger: line,
        start: "top bottom",
        toggleActions: "play none none none",
      },
    });
  });
}

