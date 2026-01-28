import './styles/style.css'
import './scroll/scroll.js'
import globalLinkHover from './animations/link.js'
import servicesMaskScroll from './animations/homeHero.js';
import scrollHintLoop from './animations/scrollLink.js';
import bodyTextReveal from './animations/bodyText.js';
import titleTextReveal from './animations/titleText.js';
import globalLinesReveal from './animations/lines.js';
import globalVerticalLinesReveal from './animations/verticalLines.js';
import clientsWheel from './animations/clients.js';
import servicesCarousel from './animations/slider.js';
import taxi from './render/transition.js';
import serviceHover from './animations/serviceLabel.js';

servicesMaskScroll();
globalLinkHover()
scrollHintLoop()
bodyTextReveal()
titleTextReveal()
globalLinesReveal()
globalVerticalLinesReveal()
clientsWheel()
servicesCarousel()
serviceHover()

