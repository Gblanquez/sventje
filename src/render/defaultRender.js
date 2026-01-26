import { Renderer } from '@unseenco/taxi';
import { lenis, startRAF, stopRAF } from '../scroll/scroll'
import gsap from 'gsap'

export default class defaultRender extends Renderer {
    initialLoad()
     {

      startRAF()

      }
  onEnter() {

    startRAF()
    console.log('defaultRenderEnter')

    const container = this.wrapper

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

  }

  onLeave() {

    stopRAF()

  }

  onLeaveCompleted()
  {


  }
}
