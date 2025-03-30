import * as T from 'three';
// eslint-disable-next-line import/no-unresolved
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import fragment from '../shaders/fragment.glsl';
import vertex from '../shaders/vertex.glsl';

const device = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: window.devicePixelRatio
};

export default class Three {
  constructor(canvas, contributions) {
    this.canvas = canvas;

    this.scene = new T.Scene();

    this.camera = new T.PerspectiveCamera(
      75,
      device.width / device.height,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 2);
    this.scene.add(this.camera);

    this.renderer = new T.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));
    
    // Set background color to white
    this.renderer.setClearColor(0xffffff, 1); // White background

    this.renderer.shadowMap.enabled = true; // Enable shadows
    this.renderer.shadowMap.type = T.PCFSoftShadowMap; // Optional: set shadow type

    this.controls = new OrbitControls(this.camera, this.canvas);

    this.clock = new T.Clock();

    this.setLights();
    this.setGeometry(contributions);
    this.render();
    this.setResize();
  }

  setLights() {
    this.ambientLight = new T.AmbientLight(new T.Color(1, 1, 1, 1));
    this.scene.add(this.ambientLight);

    // Add a directional light
    this.directionalLight = new T.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(5, 5, 5); // Position the light
    this.directionalLight.castShadow = true; // Enable shadow for the light
    this.scene.add(this.directionalLight);
  }

  setGeometry(contributions) {
    const CUBE_SIZE = 0.05;
    const CUBE_SPACING = 0.01;
    const CUBE_COLOR_BASE = 0.5;
    const CUBE_COLOR_MULTIPLIER = 0.1;

    // Create a group to hold all cubes
    this.cubeGroup = new T.Group();
    this.scene.add(this.cubeGroup);
    
    console.log(contributions)

    contributions.forEach((week, weekIndex) => {
      week.forEach((day, dayIndex) => {
        const geometry = new T.BoxGeometry(CUBE_SIZE, CUBE_SIZE * day, CUBE_SIZE); // Cube geometry
        const material = new T.MeshStandardMaterial({
          color: new T.Color(0, CUBE_COLOR_BASE + day * CUBE_COLOR_MULTIPLIER, 0), // More green based on contribution value
          metalness: 0.5, // Add some metalness for a plasticy look
          roughness: 0.2 // Lower roughness for a smoother, shinier surface
        });
        const cube = new T.Mesh(geometry, material);
        cube.castShadow = true; // Enable shadow for the cube
        cube.receiveShadow = true; // Enable receiving shadow

        // Position cubes in a grid-like manner, centered in the scene
        const x = (dayIndex * (CUBE_SIZE + CUBE_SPACING)) - (week.length * (CUBE_SIZE + CUBE_SPACING)) / 2 + (CUBE_SIZE / 2); // Centering the cubes considering cube size and spacing
        const z = (weekIndex * (CUBE_SIZE + CUBE_SPACING)) - (contributions.length * (CUBE_SIZE + CUBE_SPACING)) / 2 + (CUBE_SIZE / 2); // Centering the cubes considering cube size and spacing
        cube.position.set(x, 0, z); // Scale height based on contribution value

        this.cubeGroup.add(cube); // Add cube to the group
      });
    });
  }

  render() {
    // Remove random rotation of the cubeGroup
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render.bind(this));
  }

  setResize() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    device.width = window.innerWidth;
    device.height = window.innerHeight;

    this.camera.aspect = device.width / device.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));
  }
}
