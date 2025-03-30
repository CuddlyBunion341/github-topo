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
    const BASE_HEIGHT = -1; // Base height for the bottom of the volume

    this.cubeGroup = new T.Group();
    this.scene.add(this.cubeGroup);
    
    const width = contributions.length;
    const height = contributions[0].length;
    
    // Create BufferGeometry for our 3D volume
    const terrainGeometry = new T.BufferGeometry();
    
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
    
    // Generate a higher-res grid for the top surface
    const topVertices = [];
    const topColors = [];
    const topIndices = [];
    
    // First, create the vertices for the top surface
    const segmentsX = width * SEGMENT_SIZE;
    const segmentsY = height * SEGMENT_SIZE;
    
    // Create vertices and calculate their heights/colors
    for (let j = 0; j <= segmentsY; j++) {
      for (let i = 0; i <= segmentsX; i++) {
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
        let vertexHeight = 0;
        let color = [0, 0, 0];
        
        // Normalize weights
        const totalWeight = neighborWeights.reduce((sum, w) => sum + w, 0);
        
        neighbors.forEach((neighborIndex, idx) => {
          const weight = neighborWeights[idx] / totalWeight;
          
          // Apply weight to height
          vertexHeight += contributionHeights[neighborIndex] * weight;
          
          // Apply weight to color
          color[0] += contributionColors[neighborIndex][0] * weight;
          color[1] += contributionColors[neighborIndex][1] * weight;
          color[2] += contributionColors[neighborIndex][2] * weight;
        });
        
        // Calculate normalized position
        const x = (i / segmentsX) * width - width / 2;
        const z = (j / segmentsY) * height - height / 2;
        
        // Add top vertex
        topVertices.push(x, vertexHeight, z);
        topColors.push(color[0], color[1], color[2]);
      }
    }
    
    // Create faces (triangles) for the top surface
    for (let j = 0; j < segmentsY; j++) {
      for (let i = 0; i < segmentsX; i++) {
        const a = i + (segmentsX + 1) * j;
        const b = i + (segmentsX + 1) * (j + 1);
        const c = (i + 1) + (segmentsX + 1) * (j + 1);
        const d = (i + 1) + (segmentsX + 1) * j;
        
        // First triangle
        topIndices.push(a, b, d);
        // Second triangle
        topIndices.push(b, c, d);
      }
    }
    
    // Now create the side and bottom vertices by extruding the perimeter vertices
    const allVertices = [...topVertices];
    const allColors = [...topColors];
    const allIndices = [...topIndices];
    
    // Get perimeter vertices indices
    const perimeterIndices = [];
    
    // Top edge
    for (let i = 0; i <= segmentsX; i++) {
      perimeterIndices.push(i);
    }
    
    // Right edge
    for (let j = 1; j <= segmentsY; j++) {
      perimeterIndices.push(segmentsX + j * (segmentsX + 1));
    }
    
    // Bottom edge (reversed)
    for (let i = segmentsX - 1; i >= 0; i--) {
      perimeterIndices.push(i + segmentsY * (segmentsX + 1));
    }
    
    // Left edge (reversed)
    for (let j = segmentsY - 1; j >= 1; j--) {
      perimeterIndices.push(j * (segmentsX + 1));
    }
    
    // Add base vertices (directly below each perimeter vertex)
    const baseVertices = [];
    const verticesCount = topVertices.length / 3;
    
    perimeterIndices.forEach((idx) => {
      const x = topVertices[idx * 3];
      const z = topVertices[idx * 3 + 2];
      
      // Add base vertex
      allVertices.push(x, BASE_HEIGHT, z);
      
      // Use a darker version of the top color for the base
      const r = topColors[idx * 3] * 0.5;
      const g = topColors[idx * 3 + 1] * 0.5;
      const b = topColors[idx * 3 + 2] * 0.5;
      allColors.push(r, g, b);
      
      // Store the new index
      baseVertices.push(verticesCount + baseVertices.length);
    });
    
    // Create side faces
    for (let i = 0; i < perimeterIndices.length; i++) {
      const topIdx = perimeterIndices[i];
      const baseIdx = baseVertices[i];
      const nextTopIdx = perimeterIndices[(i + 1) % perimeterIndices.length];
      const nextBaseIdx = baseVertices[(i + 1) % baseVertices.length];
      
      // Add two triangles to create a quad for each side segment
      allIndices.push(topIdx, baseIdx, nextTopIdx);
      allIndices.push(baseIdx, nextBaseIdx, nextTopIdx);
    }
    
    // Create bottom face
    const bottomCenter = allVertices.length / 3;
    allVertices.push(0, BASE_HEIGHT, 0);
    allColors.push(0, 0.1, 0); // Dark green for bottom center
    
    for (let i = 0; i < baseVertices.length; i++) {
      const currentIdx = baseVertices[i];
      const nextIdx = baseVertices[(i + 1) % baseVertices.length];
      
      // Create triangle from center to two adjacent base vertices
      allIndices.push(bottomCenter, nextIdx, currentIdx);
    }
    
    // Create the buffer geometry
    terrainGeometry.setAttribute('position', new T.Float32BufferAttribute(allVertices, 3));
    terrainGeometry.setAttribute('color', new T.Float32BufferAttribute(allColors, 3));
    terrainGeometry.setIndex(allIndices);
    terrainGeometry.computeVertexNormals();
    
    // Create mesh with the geometry
    const material = new T.MeshStandardMaterial({
      vertexColors: true,
      side: T.DoubleSide,
      roughness: 0.5
    });
    
    this.terrainMesh = new T.Mesh(terrainGeometry, material);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.cubeGroup.add(this.terrainMesh);
    
    // Add grid lines to visualize contribution boundaries
    const gridHelper = new T.GridHelper(Math.max(width, height), Math.max(width, height));
    gridHelper.position.y = BASE_HEIGHT + 0.01; // Just above the bottom
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
