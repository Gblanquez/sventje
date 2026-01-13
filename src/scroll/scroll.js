
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { gsap } from "gsap";

let rafId = null;
let rafTime = 0;

const lenis = new Lenis({
  duration: 2.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  direction: 'vertical',
  gestureDirection: 'vertical',
  smooth: true,
  smoothTouch: false,
  touchMultiplier: 2,
  infinite: false,
  raf: false
})

let onScrollUpdate = () => {} 

function customRAF(time) {
  rafId = requestAnimationFrame(customRAF)
  rafTime = time

  lenis.raf(time)

  onScrollUpdate(time) 
  gsap.ticker.frame = time
}

function setOnScrollUpdate(cb) {
  onScrollUpdate = cb
}

function startRAF() {
  if (!rafId) {
    rafId = requestAnimationFrame(customRAF)
  }
}

function stopRAF() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

export { lenis, startRAF, stopRAF, setOnScrollUpdate, rafTime }
startRAF()