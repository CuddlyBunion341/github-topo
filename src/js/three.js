import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // eslint-disable-line import/no-unresolved

const device = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: window.devicePixelRatio
};

const white = 0xFF_FF_FF; // prettier-ignore

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
    this.camera.position.set(0, 20, 26);
    this.scene.add(this.camera);

    this.renderer = new T.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));

    this.renderer.setClearColor(white, 1);

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

    this.directionalLight = new T.DirectionalLight(white, 1);
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

    const { width, height } = this.getDimensions(contributions);
    const terrainGeometry = new T.BufferGeometry();

    const { contributionHeights, contributionColors } =
      this.calculateContributions(contributions, CUBE_SIZE);

    const { topVertices, topColors, topIndices } = this.calculateTopGeometry(
      width,
      height,
      SEGMENT_SIZE,
      contributionHeights,
      contributionColors
    );

    const { allVertices, allColors, allIndices } = this.calculateBaseGeometry(
      topVertices,
      topColors,
      topIndices,
      width,
      height,
      SEGMENT_SIZE,
      BASE_HEIGHT
    );

    this.createTerrainMesh(terrainGeometry, allVertices, allColors, allIndices);
    this.addGridHelper(width, height, BASE_HEIGHT);
  }

  getDimensions(contributions) {
    return {
      width: contributions.length,
      height: contributions[0].length
    };
  }

  calculateContributions(contributions, CUBE_SIZE) {
    const contributionHeights = [];
    const contributionColors = [];

    for (const week of contributions) {
      for (const day of week) {
        contributionHeights.push(day * CUBE_SIZE);
        const maxContribution = Math.max(...week, 1);
        const normalizedValue = day / maxContribution;
        contributionColors.push([0, 0.2 + normalizedValue * 0.8, 0]);
      }
    }

    return { contributionHeights, contributionColors };
  }

  calculateTopGeometry(
    width,
    height,
    SEGMENT_SIZE,
    contributionHeights,
    contributionColors
  ) {
    const topVertices = [];
    const topColors = [];
    const topIndices = [];
    const segmentsX = width * SEGMENT_SIZE;
    const segmentsY = height * SEGMENT_SIZE;

    for (let index = 0; index <= segmentsY; index++) {
      for (let index_ = 0; index_ <= segmentsX; index_++) {
        const { vertexHeight, color } = this.calculateVertexData(
          index,
          index_,
          width,
          height,
          SEGMENT_SIZE,
          contributionHeights,
          contributionColors
        );
        const x = (index_ / segmentsX) * width - width / 2;
        const z = (index / segmentsY) * height - height / 2;

        topVertices.push(x, vertexHeight, z);
        topColors.push(color[0], color[1], color[2]);
      }
    }

    for (let y = 0; y < segmentsY; y++) {
      for (let x = 0; x < segmentsX; x++) {
        const a = x + (segmentsX + 1) * y;
        const b = x + (segmentsX + 1) * (y + 1);
        const c = x + 1 + (segmentsX + 1) * (y + 1);
        const d = x + 1 + (segmentsX + 1) * y;

        topIndices.push(a, b, d, b, c, d);
      }
    }

    return { topVertices, topColors, topIndices };
  }

  calculateVertexData(
    rowIndex,
    columnIndex,
    totalWidth,
    totalHeight,
    segmentSize,
    heightContributions,
    colorContributions
  ) {
    const contributionX = Math.floor(columnIndex / segmentSize);
    const contributionY = Math.floor(rowIndex / segmentSize);
    const safeX = Math.min(contributionX, totalWidth - 1);
    const safeY = Math.min(contributionY, totalHeight - 1);
    const contributionIndex = safeY + safeX * totalHeight;
    const cellX = (columnIndex % segmentSize) / segmentSize;
    const cellY = (rowIndex % segmentSize) / segmentSize;

    const neighborIndices = [];
    const neighborWeights = [];
    neighborIndices.push(contributionIndex);
    neighborWeights.push((1 - cellX) * (1 - cellY));

    if (safeX < totalWidth - 1 && cellX > 0) {
      neighborIndices.push(safeY + (safeX + 1) * totalHeight);
      neighborWeights.push(cellX * (1 - cellY));
    }

    if (safeY < totalHeight - 1 && cellY > 0) {
      neighborIndices.push(safeY + 1 + safeX * totalHeight);
      neighborWeights.push((1 - cellX) * cellY);
    }

    if (safeX < totalWidth - 1 && safeY < totalHeight - 1 && cellX > 0 && cellY > 0) {
      neighborIndices.push(safeY + 1 + (safeX + 1) * totalHeight);
      neighborWeights.push(cellX * cellY);
    }

    let computedHeight = 0;
    let computedColor = [0, 0, 0];
    const totalWeight = neighborWeights.reduce((sum, weight) => sum + weight, 0);

    for (const [weightIndex, neighborIndex] of neighborIndices.entries()) {
      const weight = neighborWeights[weightIndex] / totalWeight;
      computedHeight += heightContributions[neighborIndex] * weight;
      computedColor[0] += colorContributions[neighborIndex][0] * weight;
      computedColor[1] += colorContributions[neighborIndex][1] * weight;
      computedColor[2] += colorContributions[neighborIndex][2] * weight;
    }

    return { vertexHeight: computedHeight, color: computedColor };
  }

  calculateBaseGeometry(
    topVertices,
    topColors,
    topIndices,
    width,
    height,
    SEGMENT_SIZE,
    BASE_HEIGHT
  ) {
    const allVertices = [...topVertices];
    const allColors = [...topColors];
    const allIndices = [...topIndices];
    const perimeterIndices = [];
    const segmentsX = width * SEGMENT_SIZE;
    const segmentsY = height * SEGMENT_SIZE;

    for (let index = 0; index <= segmentsX; index++) {
      perimeterIndices.push(index);
    }

    for (let index = 1; index <= segmentsY; index++) {
      perimeterIndices.push(segmentsX + index * (segmentsX + 1));
    }

    for (let index = segmentsX - 1; index >= 0; index--) {
      perimeterIndices.push(index + segmentsY * (segmentsX + 1));
    }

    for (let index = segmentsY - 1; index >= 1; index--) {
      perimeterIndices.push(index * (segmentsX + 1));
    }

    const baseVertices = [];
    const verticesCount = topVertices.length / 3;

    for (const index of perimeterIndices) {
      const x = topVertices[index * 3];
      const z = topVertices[index * 3 + 2];

      allVertices.push(x, BASE_HEIGHT, z);

      const r = topColors[index * 3] * 0.5;
      const g = topColors[index * 3 + 1] * 0.5;
      const b = topColors[index * 3 + 2] * 0.5;
      allColors.push(r, g, b);

      baseVertices.push(verticesCount + baseVertices.length);
    }

    for (let index = 0; index < perimeterIndices.length; index++) {
      const topIndex = perimeterIndices[index];
      const baseIndex = baseVertices[index];
      const nextTopIndex =
        perimeterIndices[(index + 1) % perimeterIndices.length];
      const nextBaseIndex = baseVertices[(index + 1) % baseVertices.length];

      allIndices.push(
        topIndex,
        baseIndex,
        nextTopIndex,
        baseIndex,
        nextBaseIndex,
        nextTopIndex
      );
    }

    const bottomCenter = allVertices.length / 3;
    allVertices.push(0, BASE_HEIGHT, 0);
    allColors.push(0, 0.1, 0);

    for (let index = 0; index < baseVertices.length; index++) {
      const currentIndex = baseVertices[index];
      const nextIndex = baseVertices[(index + 1) % baseVertices.length];

      allIndices.push(bottomCenter, nextIndex, currentIndex);
    }

    return { allVertices, allColors, allIndices, baseVertices };
  }

  createTerrainMesh(terrainGeometry, allVertices, allColors, allIndices) {
    terrainGeometry.setAttribute(
      'position',
      new T.Float32BufferAttribute(allVertices, 3)
    );
    terrainGeometry.setAttribute(
      'color',
      new T.Float32BufferAttribute(allColors, 3)
    );
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
  }

  addGridHelper(width, height, BASE_HEIGHT) {
    const gridHelper = new T.GridHelper(
      Math.max(width, height),
      Math.max(width, height)
    );
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
