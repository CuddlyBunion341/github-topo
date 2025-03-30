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
    const CUBE_SIZE = 0.5;
    const CUBE_SPACING = 0.01;
    const CUBE_COLOR_BASE = 0.5;
    const CUBE_COLOR_MULTIPLIER = 0.1;

    // Create a group to hold all cubes
    this.cubeGroup = new T.Group();
    this.scene.add(this.cubeGroup);
    
    console.log(contributions)

    const width = contributions.length;
    const height = contributions[0].length;

    const geometry = new T.PlaneGeometry(width, height, width, height); // Adjust segments for smoother transitions
    const material = new T.MeshStandardMaterial({
      wireframe: false,
      flatShading: false,
      metalness: 0.5, // Add some metalness for a smoother look
      roughness: 0.5 // Adjust roughness for a smoother surface
    });
    this.terrainMesh = new T.Mesh(geometry, material);
    this.cubeGroup.add(this.terrainMesh);

    const heights = []; // Store heights for smooth transitions
    const colors = []; // Store colors for each vertex
    contributions.forEach((week, weekIndex) => {
      week.forEach((day, dayIndex) => {
        const height = day * CUBE_SIZE; // Scale height based on contribution value
        heights[dayIndex + weekIndex * week.length] = height; // Store height for each vertex

        // Set vertex color based on day value (normalized to 0-1 range)
        const colorValue = day / Math.max(...week); // Normalize color based on max value in the week
        colors.push(new T.Color(colorValue, 1 - colorValue, 0)); // Gradient from green to red
      });
    });

    // Update vertex heights with smooth transitions
    for (let weekIndex = 0; weekIndex < contributions.length; weekIndex++) {
      for (let dayIndex = 0; dayIndex < contributions[weekIndex].length; dayIndex++) {
        const vertexIndex = dayIndex + weekIndex * contributions[weekIndex].length;
        const height = heights[vertexIndex];

        // Set the y position of the vertex
        this.terrainMesh.geometry.attributes.position.setZ(vertexIndex, height);

        // Apply a bevel effect by averaging the heights of neighboring vertices
        const neighbors = [
          heights[vertexIndex - 1], // left
          heights[vertexIndex + 1], // right
          heights[vertexIndex - contributions[weekIndex].length], // above
          heights[vertexIndex + contributions[weekIndex].length] // below
        ].filter(h => h !== undefined); // Filter out undefined neighbors

        if (neighbors.length > 0) {
          const averageHeight = neighbors.reduce((sum, h) => sum + h, 0) / neighbors.length;
          this.terrainMesh.geometry.attributes.position.setZ(vertexIndex, (height + averageHeight) / 2); // Smooth the height
        }
      }
    }

    // Create a color attribute for the geometry
    this.terrainMesh.geometry.setAttribute('color', new T.Float32BufferAttribute(colors.flat(), 3));

    this.terrainMesh.geometry.attributes.position.needsUpdate = true; // Notify Three.js to update the geometry
    this.terrainMesh.geometry.attributes.color.needsUpdate = true; // Notify Three.js to update the color attribute

    // Reposition the geometry to face up
    geometry.rotateX(-Math.PI / 2);

    geometry.computeVertexNormals(); // Recompute normals for lighting
  }

  render() {
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
