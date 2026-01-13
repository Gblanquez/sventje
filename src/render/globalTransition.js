import { Transition } from '@unseenco/taxi'
import gsap from 'gsap'
import { CustomEase } from "gsap/CustomEase";
import { lenis, startRAF, stopRAF } from '../scroll/scroll'

gsap.registerPlugin(CustomEase);

export default class globalTransition extends Transition {
  /**
   * Handle the transition leaving the previous page.
   * @param { { from: HTMLElement, trigger: string|HTMLElement|false, done: function } } props
   */
  onLeave({ from, trigger, done }) {
    // do something ...
    console.log('globalTransitionLeave')

    const bg = document.querySelector('.bg')
    const overlay = document.querySelector('.overlay')

    const tl = gsap.timeline(
        {
            onComplete: () => 
                {
                    


                },
            onStart: () => 
                {




                }
        })



    done()



  }

  /**
   * Handle the transition entering the next page.
   * @param { { to: HTMLElement, trigger: string|HTMLElement|false, done: function } } props
   */
  onEnter({ to, trigger, done }) {
    // do something else ...
    console.log('globalTransitionEnter')

    const bg = document.querySelector('.bg')

    const tl = gsap.timeline(
        {
            onComplete: () => 
                {

                },

    
            
        }
    )
    

    done()

  }
}
