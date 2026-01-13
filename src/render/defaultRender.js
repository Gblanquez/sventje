import { Renderer } from '@unseenco/taxi';
import { lenis, startRAF, stopRAF } from '../scroll';
import gsap from 'gsap'

export default class defaultRender extends Renderer {
    initialLoad() {


      }
  onEnter() {
    
    console.log('defaultRenderEnter')

    const container = this.wrapper.querySelector('[data-a="wrap"]');

    const tl = gsap.timeline(
      {
        onStart: () => 
          {


          },
          onComplete: () => 
            {


            }
      })

      tl.set(container,
        {
            opacity: 0,
        })
      tl.from(container,
        {
            opacity: 1,
            duration: 0.2,
            onStart: () => 
                {

                },
            onComplete: () => 
                {
           
                }
        })



  }

  onEnterCompleted() {

    startRAF()
  }

  onLeave() {


  }

  onLeaveCompleted()
  {


  }
}
