import '../css/global.css';
import '../scss/global.scss';

import Github from './github';
import Three from './three';

document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.querySelector('#canvas');
  const github = new Github('CuddlyBunion341');
  const contributions = await github.getContributions();

  if (canvas) {
    new Three(canvas, contributions);
  }
});
