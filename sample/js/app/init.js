import { createDom } from './dom.js';
import { createState } from './state.js';

export function createAppContext($) {
  const dom = createDom($);
  const state = createState();
  return { dom, state };
}
