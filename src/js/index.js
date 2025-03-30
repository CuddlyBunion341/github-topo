import '../css/global.css';
import '../scss/global.scss';

import Three from './three';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('#canvas');
    const contributions = generateMockContributions(52, 7);
    console.log(contributions);

    if (canvas) {
        new Three(canvas, contributions);
    }
});

const generateMockContributions = (weeks, days) => {
    return Array.from({ length: weeks }, () => Array.from({ length: days }, () => Math.floor(Math.random() * 5)));
}
