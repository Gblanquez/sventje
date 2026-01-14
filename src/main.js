import './styles/style.css'
import './scroll/scroll.js'

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

export default function servicesMaskScroll() {
  const section = document.querySelector(".services-section");
  const target = document.querySelector(".hero-section");
  if (!section || !target) return;

  gsap.set(target, { "--pL": 100, "--pR": 100 });
  gsap.set(target, { y: '0%'})

  gsap.timeline({
    scrollTrigger: {
      trigger: section,
      scrub: true,
      start: "top bottom",
      end: "bottom center",
      markers: true,
    },
  })
    // Phase 1: right edge closes fast -> diagonal appears
    .to(
      target,
      {
        "--pR": 35, // right rises up more quickly
        ease: "none",
      },
      0
    )
    // Phase 2: left starts following, but slower -> keeps the slope
    .to(
      target,
      {
        "--pL": 70,
        ease: "none",
      },
      0.1
    )
    // Phase 3: finish closing both to top (fully masked)
    .to(
      target,
      {
        "--pR": 0,
        "--pL": 0,
        ease: "none",
      },
      0.55
    )
    .to(
        target,
        {
          y: '-20%',
          ease: "none",
        },
        0
      );
    
}

servicesMaskScroll();