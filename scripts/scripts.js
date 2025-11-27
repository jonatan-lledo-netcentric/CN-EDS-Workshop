import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  toClassName,
  getMetadata,
} from './aem.js';

/**
 * Converts variant class names to BEM (Block Element Modifier) naming convention.
 * Searches for variant classes in the provided classList
 * and replaces them with BEM-formatted variants.
 *
 * @param {Object} options - The options object
 * @param {string} options.blockName - The base block name for BEM convention
 * @param {DOMTokenList} options.blockClasses
 * - The classList object containing the classes to transform
 * @param {string|string[]} options.variants
 * - Single variant string or array of variant strings to convert
 * @returns {void}
 *
 * @example
 * // Convert a single variant
 * variantClassesToBEM({
 *   blockName: 'button',
 *   blockClasses: element.classList,
 *   variants: 'primary'
 * });
 * // Converts class "primary" to "button--primary"
 *
 * @example
 * // Convert multiple variants
 * variantClassesToBEM({
 *   blockName: 'card',
 *   blockClasses: element.classList,
 *   variants: ['large', 'featured']
 * });
 * // Converts "large" to "card--large" and "featured" to "card--featured"
 */
export function variantClassesToBEM({ blockName, blockClasses, variants } = {}) {
  if (!blockName || !blockClasses || !variants) return;
  const variantList = Array.isArray(variants) ? variants : [variants];
  variantList.forEach((variant) => {
    if (blockClasses.contains(variant)) {
      blockClasses.remove(variant);
      blockClasses.add(`${blockName}--${variant}`);
    }
  });
}

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    const heroBlock = buildBlock('hero', { elems: [picture, h1] });
    heroBlock.classList.add('auto-block');
    section.append(heroBlock);
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * This function loads and decorates the template specified in metadata with the key "`template`".
 *
 * Any template _**MUST**_ have a corresponding `CSS` and `JS` file in the templates folder.
 * like a block, the template folder and its files must share the same name.
 * @param {Element} main The main element
 */
async function loadTemplate(main) {
  const template = toClassName(getMetadata('template'));
  if (template) {
    try {
      await loadCSS(`${window.hlx.codeBasePath}/templates/${template}/${template}.css`);
      const mod = await import(`../templates/${template}/${template}.js`);
      if (mod.default) {
        await mod.default(main);
      }
    } catch (e) {
      console.error(`failed to load template %c${template}`, 'color: gold', { error: e });
    }
  }
}

/**
 * This function loads and applies the theme specified in metadata with the key "`theme`".
 *
 * Any theme _**MUST**_ have a corresponding `CSS` file in the themes folder.
 * @returns {Promise<void>}
 */
async function loadTheme() {
  const theme = toClassName(getMetadata('theme'));
  if (theme) {
    try {
      await loadCSS(`${window.hlx.codeBasePath}/themes/${theme}/${theme}.css`);
    } catch (e) {
      console.error(`failed to load theme %c${theme}`, 'color: gold', { error: e });
    }
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto block `*/fragments/*` references
    const fragments = main.querySelectorAll('a[href*="/fragments/"]');
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(frag.firstElementChild);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }

    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    await loadTemplate(main);
    await loadTheme();
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
