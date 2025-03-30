import * as T from 'three';
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
    
    this.renderer.setClearColor(0xffffff, 1);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;

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

    this.directionalLight = new T.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(5, 5, 5);
    this.directionalLight.castShadow = true;
    this.scene.add(this.directionalLight);
  }

  setGeometry(contributions) {
    const CUBE_SIZE = 0.5;
    const CUBE_SPACING = 0.01;
    const CUBE_COLOR_BASE = 0.5;
    const CUBE_COLOR_MULTIPLIER = 0.1;

    this.cubeGroup = new T.Group();
    this.scene.add(this.cubeGroup);
    
    console.log(contributions)

    const width = contributions.length;
    const height = contributions[0].length;

    const geometry = new T.PlaneGeometry(width, height, width, height);
    const material = new T.MeshStandardMaterial({
      wireframe: false,
      flatShading: false,
      roughness: 0.5,
      vertexColors: true
    });
    this.terrainMesh = new T.Mesh(geometry, material);
    this.cubeGroup.add(this.terrainMesh);

    const heights = [];
    const colors = [];
    contributions.forEach((week, weekIndex) => {
      week.forEach((day, dayIndex) => {
        const height = day * CUBE_SIZE;
        heights[dayIndex + weekIndex * week.length] = height;

        const colorValue = day / Math.max(...week);
        colors.push([0, colorValue, 0]);
      });
    });

    const emptyColorArray = new Float32Array(this.terrainMesh.geometry.attributes.position.count * 3);
    this.terrainMesh.geometry.setAttribute('color', new T.Float32BufferAttribute(emptyColorArray, 3));
    for (let weekIndex = 0; weekIndex < contributions.length; weekIndex++) {
      for (let dayIndex = 0; dayIndex < contributions[weekIndex].length; dayIndex++) {
        const vertexIndex = dayIndex + weekIndex * contributions[weekIndex].length;
        const height = heights[vertexIndex];

        this.terrainMesh.geometry.attributes.position.setZ(vertexIndex, height);

        const neighbors = [
          heights[vertexIndex - 1],
          heights[vertexIndex + 1],
          heights[vertexIndex - contributions[weekIndex].length],
          heights[vertexIndex + contributions[weekIndex].length]
        ].filter(h => h !== undefined);

        if (neighbors.length > 0) {
          const averageHeight = neighbors.reduce((sum, h) => sum + h, 0) / neighbors.length;
          this.terrainMesh.geometry.attributes.position.setZ(vertexIndex, (height + averageHeight) / 2);
          this.terrainMesh.geometry.attributes.color.setXYZ(vertexIndex, ...colors[vertexIndex]);
        }
      }
    }

    console.log(this.terrainMesh.geometry.attributes.color)
    this.terrainMesh.geometry.attributes.position.needsUpdate = true;
    this.terrainMesh.geometry.attributes.color.needsUpdate = true;

    geometry.rotateX(-Math.PI / 2);

    geometry.computeVertexNormals();
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
