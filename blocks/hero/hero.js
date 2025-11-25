import { variantClassesToBEM } from '../../scripts/scripts.js';

const variants = ['auto-block', 'dark-background'];
const blockName = 'hero';

export default function decorate(block) {
  variantClassesToBEM({ blockName, blockClasses: block.classList, variants });
}
