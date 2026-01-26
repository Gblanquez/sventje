import { Core } from '@unseenco/taxi'
import globalTransition from './globalTransition'
import defaultRender from './defaultRender'

const taxi = new Core({
  renderers: {
    default: defaultRender,
  },
  transitions: {
    default: globalTransition,
  },
  removeOldContent: true,
})

export default taxi