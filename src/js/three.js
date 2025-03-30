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
    const SEGMENT_SIZE = 4;
    const BASE_HEIGHT = -1;

    this.cubeGroup = new T.Group();
    this.scene.add(this.cubeGroup);
    
    const width = contributions.length;
    const height = contributions[0].length;
    
    const terrainGeometry = new T.BufferGeometry();
    
    const contributionHeights = [];
    const contributionColors = [];
    
    contributions.forEach((week, weekIndex) => {
      week.forEach((day, dayIndex) => {
        contributionHeights.push(day * CUBE_SIZE);
        
        const maxContribution = Math.max(...week, 1);
        const normalizedValue = day / maxContribution;
        contributionColors.push([0, 0.2 + normalizedValue * 0.8, 0]);
      });
    });
    
    const topVertices = [];
    const topColors = [];
    const topIndices = [];
    
    const segmentsX = width * SEGMENT_SIZE;
    const segmentsY = height * SEGMENT_SIZE;
    
    for (let j = 0; j <= segmentsY; j++) {
      for (let i = 0; i <= segmentsX; i++) {
        const contributionX = Math.floor(i / SEGMENT_SIZE);
        const contributionY = Math.floor(j / SEGMENT_SIZE);
        
        const safeX = Math.min(contributionX, width - 1);
        const safeY = Math.min(contributionY, height - 1);
        
        const contributionIndex = safeY + safeX * height;
        
        const cellX = (i % SEGMENT_SIZE) / SEGMENT_SIZE;
        const cellY = (j % SEGMENT_SIZE) / SEGMENT_SIZE;
        
        const neighbors = [];
        const neighborWeights = [];
        
        neighbors.push(contributionIndex);
        neighborWeights.push((1 - cellX) * (1 - cellY));
        
        if (safeX < width - 1 && cellX > 0) {
          neighbors.push(safeY + (safeX + 1) * height);
          neighborWeights.push(cellX * (1 - cellY));
        }
        
        if (safeY < height - 1 && cellY > 0) {
          neighbors.push((safeY + 1) + safeX * height);
          neighborWeights.push((1 - cellX) * cellY);
        }
        
        if (safeX < width - 1 && safeY < height - 1 && cellX > 0 && cellY > 0) {
          neighbors.push((safeY + 1) + (safeX + 1) * height);
          neighborWeights.push(cellX * cellY);
        }
        
        let vertexHeight = 0;
        let color = [0, 0, 0];
        
        const totalWeight = neighborWeights.reduce((sum, w) => sum + w, 0);
        
        neighbors.forEach((neighborIndex, idx) => {
          const weight = neighborWeights[idx] / totalWeight;
          
          vertexHeight += contributionHeights[neighborIndex] * weight;
          color[0] += contributionColors[neighborIndex][0] * weight;
          color[1] += contributionColors[neighborIndex][1] * weight;
          color[2] += contributionColors[neighborIndex][2] * weight;
        });
        
        const x = (i / segmentsX) * width - width / 2;
        const z = (j / segmentsY) * height - height / 2;
        
        topVertices.push(x, vertexHeight, z);
        topColors.push(color[0], color[1], color[2]);
      }
    }
    
    for (let j = 0; j < segmentsY; j++) {
      for (let i = 0; i < segmentsX; i++) {
        const a = i + (segmentsX + 1) * j;
        const b = i + (segmentsX + 1) * (j + 1);
        const c = (i + 1) + (segmentsX + 1) * (j + 1);
        const d = (i + 1) + (segmentsX + 1) * j;
        
        topIndices.push(a, b, d);
        topIndices.push(b, c, d);
      }
    }
    
    const allVertices = [...topVertices];
    const allColors = [...topColors];
    const allIndices = [...topIndices];
    
    const perimeterIndices = [];
    
    for (let i = 0; i <= segmentsX; i++) {
      perimeterIndices.push(i);
    }
    
    for (let j = 1; j <= segmentsY; j++) {
      perimeterIndices.push(segmentsX + j * (segmentsX + 1));
    }
    
    for (let i = segmentsX - 1; i >= 0; i--) {
      perimeterIndices.push(i + segmentsY * (segmentsX + 1));
    }
    
    for (let j = segmentsY - 1; j >= 1; j--) {
      perimeterIndices.push(j * (segmentsX + 1));
    }
    
    const baseVertices = [];
    const verticesCount = topVertices.length / 3;
    
    perimeterIndices.forEach((idx) => {
      const x = topVertices[idx * 3];
      const z = topVertices[idx * 3 + 2];
      
      allVertices.push(x, BASE_HEIGHT, z);
      
      const r = topColors[idx * 3] * 0.5;
      const g = topColors[idx * 3 + 1] * 0.5;
      const b = topColors[idx * 3 + 2] * 0.5;
      allColors.push(r, g, b);
      
      baseVertices.push(verticesCount + baseVertices.length);
    });
    
    for (let i = 0; i < perimeterIndices.length; i++) {
      const topIdx = perimeterIndices[i];
      const baseIdx = baseVertices[i];
      const nextTopIdx = perimeterIndices[(i + 1) % perimeterIndices.length];
      const nextBaseIdx = baseVertices[(i + 1) % baseVertices.length];
      
      allIndices.push(topIdx, baseIdx, nextTopIdx);
      allIndices.push(baseIdx, nextBaseIdx, nextTopIdx);
    }
    
    const bottomCenter = allVertices.length / 3;
    allVertices.push(0, BASE_HEIGHT, 0);
    allColors.push(0, 0.1, 0);
    
    for (let i = 0; i < baseVertices.length; i++) {
      const currentIdx = baseVertices[i];
      const nextIdx = baseVertices[(i + 1) % baseVertices.length];
      
      allIndices.push(bottomCenter, nextIdx, currentIdx);
    }
    
    terrainGeometry.setAttribute('position', new T.Float32BufferAttribute(allVertices, 3));
    terrainGeometry.setAttribute('color', new T.Float32BufferAttribute(allColors, 3));
    terrainGeometry.setIndex(allIndices);
    terrainGeometry.computeVertexNormals();
    
    const material = new T.MeshStandardMaterial({
      vertexColors: true,
      side: T.DoubleSide,
      roughness: 0.5
    });
    
    this.terrainMesh = new T.Mesh(terrainGeometry, material);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.cubeGroup.add(this.terrainMesh);
    
    const gridHelper = new T.GridHelper(Math.max(width, height), Math.max(width, height));
    gridHelper.position.y = BASE_HEIGHT + 0.01;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    this.cubeGroup.add(gridHelper);
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
