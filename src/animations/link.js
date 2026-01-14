import { gsap } from "gsap";

export default function globalLinkHover() {
  const links = document.querySelectorAll('[data-a="global-link"]');
  if (!links.length) return;

  links.forEach((link) => {
    const line = link.querySelector(".p-link-line");
    if (!line) return;

    // Initial state
    gsap.set(line, {
      width: "0%",
      scaleX: 1,
      transformOrigin: "left center",
    });

    link.addEventListener("mouseenter", () => {
      gsap.killTweensOf(line);

      gsap.fromTo(
        line,
        { width: "0%", scaleX: 1, transformOrigin: "left center" },
        {
          width: "100%",
          duration: 0.45,
          ease: "expo.out",
        }
      );
    });

    link.addEventListener("mouseleave", () => {
      gsap.killTweensOf(line);

      gsap.fromTo(
        line,
        { scaleX: 1, transformOrigin: "right center" },
        {
          scaleX: 0,
          duration: 0.35,
          ease: "expo.out",
        }
      );
    });
  });
}

// globalLinkHover();