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
    const SEGMENT_SIZE = 4; // Segments per contribution cell
    const SMOOTHING_FACTOR = 0.3; // How much to smooth between contributions (0-1)

    this.cubeGroup = new T.Group();
    this.scene.add(this.cubeGroup);
    
    const width = contributions.length;
    const height = contributions[0].length;
    
    // Create a higher resolution grid for smoother terrain
    const geometry = new T.PlaneGeometry(
      width, 
      height, 
      width * SEGMENT_SIZE, 
      height * SEGMENT_SIZE
    );
    
    const material = new T.MeshStandardMaterial({
      wireframe: false,
      flatShading: false,
      roughness: 0.5,
      vertexColors: true
    });
    
    this.terrainMesh = new T.Mesh(geometry, material);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.cubeGroup.add(this.terrainMesh);

    // Initialize color attribute
    const colorArray = new Float32Array(this.terrainMesh.geometry.attributes.position.count * 3);
    this.terrainMesh.geometry.setAttribute('color', new T.Float32BufferAttribute(colorArray, 3));
    
    // Calculate the heights and colors for each contribution cell
    const contributionHeights = [];
    const contributionColors = [];
    
    contributions.forEach((week, weekIndex) => {
      week.forEach((day, dayIndex) => {
        contributionHeights.push(day * CUBE_SIZE);
        
        // Calculate color based on contribution value
        const maxContribution = Math.max(...week, 1); // Avoid division by zero
        const normalizedValue = day / maxContribution;
        contributionColors.push([0, 0.2 + normalizedValue * 0.8, 0]);
      });
    });
    
    // Set heights and colors for all vertices in the high-resolution grid
    const segmentsX = width * SEGMENT_SIZE;
    const segmentsY = height * SEGMENT_SIZE;
    
    for (let i = 0; i <= segmentsX; i++) {
      for (let j = 0; j <= segmentsY; j++) {
        const vertexIndex = j * (segmentsX + 1) + i;
        
        // Map high-res vertex to its contribution cell
        const contributionX = Math.floor(i / SEGMENT_SIZE);
        const contributionY = Math.floor(j / SEGMENT_SIZE);
        
        // Handle edge cases
        const safeX = Math.min(contributionX, width - 1);
        const safeY = Math.min(contributionY, height - 1);
        
        // Get contribution index
        const contributionIndex = safeY + safeX * height;
        
        // Calculate distance factors within the cell (0-1)
        const cellX = (i % SEGMENT_SIZE) / SEGMENT_SIZE;
        const cellY = (j % SEGMENT_SIZE) / SEGMENT_SIZE;
        
        // Get neighboring contribution cells for interpolation
        const neighbors = [];
        const neighborWeights = [];
        
        // Current cell
        neighbors.push(contributionIndex);
        neighborWeights.push((1 - cellX) * (1 - cellY));
        
        // Right cell (if not at right edge)
        if (safeX < width - 1 && cellX > 0) {
          neighbors.push(safeY + (safeX + 1) * height);
          neighborWeights.push(cellX * (1 - cellY));
        }
        
        // Bottom cell (if not at bottom edge)
        if (safeY < height - 1 && cellY > 0) {
          neighbors.push((safeY + 1) + safeX * height);
          neighborWeights.push((1 - cellX) * cellY);
        }
        
        // Bottom-right cell (if not at edges)
        if (safeX < width - 1 && safeY < height - 1 && cellX > 0 && cellY > 0) {
          neighbors.push((safeY + 1) + (safeX + 1) * height);
          neighborWeights.push(cellX * cellY);
        }
        
        // Calculate interpolated height and color
        let heightOffset = 0;
        let color = [0, 0, 0];
        
        // Normalize weights
        const totalWeight = neighborWeights.reduce((sum, w) => sum + w, 0);
        
        neighbors.forEach((neighborIndex, idx) => {
          const weight = neighborWeights[idx] / totalWeight;
          
          // Apply weight to heightOffset
          heightOffset += contributionHeights[neighborIndex] * weight;
          
          // Apply weight to color
          color[0] += contributionColors[neighborIndex][0] * weight;
          color[1] += contributionColors[neighborIndex][1] * weight;
          color[2] += contributionColors[neighborIndex][2] * weight;
        });
        
        // Apply heightOffset to vertex
        this.terrainMesh.geometry.attributes.position.setZ(vertexIndex, heightOffset);
        
        // Apply color to vertex
        this.terrainMesh.geometry.attributes.color.setXYZ(
          vertexIndex, 
          color[0], 
          color[1], 
          color[2]
        );
      }
    }
    
    // Mark geometry as needing updates
    this.terrainMesh.geometry.attributes.position.needsUpdate = true;
    this.terrainMesh.geometry.attributes.color.needsUpdate = true;
    
    // Rotate to proper orientation
    geometry.rotateX(-Math.PI / 2);
    
    // Recompute normals for proper lighting
    geometry.computeVertexNormals();
    
    // Add grid lines to visualize contribution boundaries
    const gridHelper = new T.GridHelper(Math.max(width, height), Math.max(width, height));
    gridHelper.position.y = -0.01; // Slightly below the terrain to avoid z-fighting
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
