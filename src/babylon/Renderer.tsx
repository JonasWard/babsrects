import {
  Scene,
  ShaderMaterial,
  StandardMaterial,
  Vector2,
  Vector3,
  HemisphericLight,
  Color3,
  Color4,
} from '@babylonjs/core';
import * as React from 'react';
import { addCurve } from './addCurve';
import { Growth } from './geometry/differentialGrowth';
import { createCircle } from './geometry/directedCurve';
import { sdGyroid } from './geometry/distanceFunctions';
import { createCustomShader } from './geometry/dynamicShader';
import { ParallelTransportMesh } from './geometry/parallelTransportFrames';
import { gyroidPostProcessing } from './geometry/postProcessing';
import { catmullPolygonN, catmullPolylineN } from './geometry/volumetricMesh';
import SceneComponent from './scene';
import * as bspline from 'b-spline';

import {
  temperature,
  humidity,
  noiseValues,
  lightValues,
} from '../data/23.07.2022';

const parallelTransportMeshes = [];
const postProcessing = true;
const startOfPrintIteration = 200;
const r = 80;
const layerHeight = 2;
const pipeRadius = 8;
const center = new Vector3(0, 0, 0);
const center2d = new Vector2(center.x, center.y);
const outerRadiusDifference = 100;
const divCalc = (r: number) => Math.ceil(r * Math.PI * 2);
let continueGrowth = true;
const layerCount = 200;

const dataRemapping = (data: number[], min: number, max: number) => {
  const delta = max - min;

  const dataMin = data.reduce((min, v) => (min < v ? min : v), Infinity);
  const dataMax = data.reduce((max, v) => (max > v ? max : v), -Infinity);

  const multiplier = delta / (dataMax - dataMin);
  return data.map((v) => (v - dataMin) * multiplier + min);
};

const dataLaplacianSmoothing = (data: number[], neighbourCount: number) => {
  if (neighbourCount < 1) return data;
  const finalIndex = data.length - 1;
  return data.map((v, i, arr) => {
    let start = i - neighbourCount;
    let end = i + neighbourCount;
    start = start < 0 ? 0 : start;
    end = end > finalIndex ? finalIndex : end;

    const count = end - start;
    let newV = 0;
    for (let j = start; j < end; j++) newV += arr[j];
    return newV / count;
  });
};

const dataSlicing = {start: 0, end: 400};

const sliceLightValues = lightValues.slice(dataSlicing.start, dataSlicing.end);
const sliceTemperature = temperature.slice(dataSlicing.start, dataSlicing.end);
const sliceNoiseValues = noiseValues.slice(dataSlicing.start, dataSlicing.end);
const sliceHumidity = humidity.slice(dataSlicing.start, dataSlicing.end);

const bezierData = dataRemapping(dataLaplacianSmoothing(sliceLightValues, 50), .2, 1.).map(v => [v]);
const zDomain = [0, 500.];

const dataSampling = (z: number): number => bspline((z - zDomain[0]) / (zDomain[1] - zDomain[0]), 2, bezierData)[0]

const setContinueGrowth = (value: boolean) => (continueGrowth = value);

const bezierSampling = (z: number): number => {
  if (z > zDomain[1]) console.log(z);

  // quadratic bezier
  const vs = [[0.8], [0.9], [1], [0.9], [0.7], [0.4], [0.4], [0.2]];
  const t = (z - zDomain[0]) / (zDomain[1] - zDomain[0]);

  return bspline(t, 2, vs)[0];
};

const scaleFunction = (z: number): number => {
  return 1 + ((z - zDomain[0]) / (zDomain[1] - zDomain[0])) * -1;
};

const positionScaling = (
  v: Vector3,
  f: (z: number) => number = scaleFunction
): Vector3 => {
  const s = f(v.z);
  return new Vector3(v.x, v.y * s, v.z);
};

const differentiateDatapoints = (data: number[], count: number): number[] => {
  const dataSetCount = data.length;
  const multiplier = dataSetCount / (count + 1);

  const newDataValues = [];

  for (let i = 0; i < count; i++) {
    const t = i * multiplier;
    const a = Math.floor(t);
    const b = a + 1;
    const interpolate = t - a;

    newDataValues.push((data[b] - data[a]) * interpolate + data[a]);
  }

  console.log(newDataValues);

  return newDataValues;
};

const lightAndSoundToThing = (
  lightArray: number[],
  noiseData: number[],
  lh: number,
  w: number,
  h: number,
  resolution: number = 20,
  minV: number = 0,
  maxV: number = 30
) => {
  lightArray = dataRemapping(lightArray, minV, maxV);
  noiseData = dataRemapping(noiseData, minV, maxV);

  const baseScale = 0;
  const multiplier = -1;

  const vA = new Vector3(-0.5 * w, -0.5 * h, 0);
  const positionsA = [vA];
  const mvVA = new Vector3(0, h / resolution, (lh * 0.5) / resolution);
  const dirA = new Vector3(1, 0, 0);
  const directionsA = [dirA.scale(baseScale * multiplier)];

  const vB = new Vector3(0.5 * w, 0.5 * h, lh * 0.5);
  const positionsB = [vB];
  const mvVB = new Vector3(0, -h / resolution, (lh * 0.5) / resolution);
  const dirB = new Vector3(-1, 0, 0);
  const directionsB = [dirB.scale(0)];

  for (let i = 1; i < resolution + 1; i++) {
    const sc =
      (baseScale +
        ((1 - (i / resolution - 0.5) ** 2) ** 0.5 - 3 ** 0.5 / 2) /
          (1 - 3 ** 0.5 / 2)) *
      multiplier;

    // console.log('x: ' + (i / resolution - .5));
    // console.log('y: ' + sc);

    directionsA.push(dirA.scale(sc));
    directionsB.push(dirB.scale(sc));

    positionsA.push(positionsA[positionsA.length - 1].add(mvVA));
    positionsB.push(positionsB[positionsB.length - 1].add(mvVB));
  }

  const positions: Vector3[] = [];

  lightArray.forEach((lv, i) => {
    const baseV = new Vector3(0, 0, lh * i);
    const nv = noiseData[i];

    // .map(v => positionScaling(v)

    positions.push(
      ...positionsA.map((v, i) => {
        const localV = positionScaling(baseV.add(v));
        return localV.add(directionsA[i].scale(lv));
      })
    );
    positions.push(
      ...positionsB.map((v, i) => {
        const localV = positionScaling(baseV.add(v));
        return localV.add(directionsB[i].scale(nv));
      })
    );
  });

  return positions;
};

const dataToObject = (
  dataArrays: number[][],
  minRadius: number,
  maxRadius: number,
  layerHeight: number,
  scaleFunction?: (v: number) => number
) => {
  const count = dataArrays.length;
  // console.log(count);
  const angleDelta = (2 * Math.PI) / count;
  const layerDelta = layerHeight / count;

  const mins = dataArrays.map((arr) =>
    arr.reduce((min, v) => (min < v ? min : v), Infinity)
  );
  const maxs = dataArrays.map((arr) =>
    arr.reduce((max, v) => (max > v ? max : v), -Infinity)
  );
  const means = dataArrays.map(
    (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
  );

  const radiusDelta = maxRadius - minRadius;
  const multipliers = maxs.map((maxV, i) => radiusDelta / (maxV - mins[i]));

  const positions: Vector3[] = [];

  for (let i = 0; i < dataArrays[0].length; i++) {
    const h = (i - 0) * layerHeight;
    const locaPoints = [];
    for (let j = 0; j < count; j++) {
      let value = dataArrays[j][i];
      const angle = j * angleDelta;
      const z = h + layerDelta * j;
      const minRadiusMultiplier = scaleFunction ? scaleFunction(z) : 1.;
      let radius = (value - mins[j]) * multipliers[j] + minRadiusMultiplier * minRadius;
      locaPoints.push(
        new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, z)
      );
    }

    positions.push(...locaPoints);
  }

  return catmullPolylineN(positions, 3);

  // console.log(positions);

  // return positions;
};

const startpPts = createCircle(center, r, divCalc(r)).map(
  (v) => new Vector2(v.x, v.z)
);

export const CUSTOM_SHADER_NAME = 'customShaderName';
const growth = new Growth({
  vs: startpPts,
  repulsionRadius: 60,
  attractionRadius: 120,
});

const growthScale = 1.5;

growth.postProcessing = (v: Vector2, h, hIndex: number = 0) => {
  const location = new Vector3(v.x, v.y, h);
  const vG =
    Math.sin(0.2 * sdGyroid(location, 0.1) * sliceLightValues[hIndex] * 0.0002) *
      growthScale +
    growthScale;
  return vG;
  // return v.subtract(center2d).length() < (r + outerRadiusDifference - 90) ? 0. : vG;
};

let material: ShaderMaterial;
let time = 0;
let iteration = 0;
let h = 0;
let hIndex = 0;
let positions: Vector3[] = [];

export const updateMaterial = (scene: Scene, materialName = 'a') => {
  material = createCustomShader(scene, materialName) as ShaderMaterial;
  return material;
};

const onSceneReady = (scene: Scene, canvas: HTMLCanvasElement) => {
  const light = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  scene.clearColor = new Color4(1, 1, 1, 1);
  light.intensity = 1.5;

  material = updateMaterial(scene);
  const extraPoints = [];

  // console.log('before adding curve');

  addCurve(scene, canvas, material);

  const testDataA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const testDataB = testDataA;

  // // positions.push(...lightAndSoundToThing(testDataA, testDataB, 4, 100, 250, 20))
  const intermedPositions = lightAndSoundToThing(
    differentiateDatapoints(dataLaplacianSmoothing(sliceLightValues, 10), layerCount),
    differentiateDatapoints(dataLaplacianSmoothing(sliceNoiseValues, 10), layerCount),
    layerHeight,
    50,
    250,
    2,
    0,
    150
  );
  
  const bottomLayer = intermedPositions.slice(0, 6).map(v => new Vector3(v.x, v.y, 0.));
  for (let i = 0; i < 10; i ++) {
    extraPoints.push(...bottomLayer);
  }

  console.log(intermedPositions.length / layerCount);

  // const intermedPositions = dataToObject(
  //   [
  //     differentiateDatapoints(
  //       dataLaplacianSmoothing(sliceTemperature, 0),
  //       layerCount
  //     ),
  //     differentiateDatapoints(
  //       dataLaplacianSmoothing(sliceHumidity, 0),
  //       layerCount
  //     ),
  //     differentiateDatapoints(
  //       dataLaplacianSmoothing(sliceLightValues, 0),
  //       layerCount
  //     ),
  //     differentiateDatapoints(
  //       dataLaplacianSmoothing(sliceNoiseValues, 0),
  //       layerCount
  //     ),
  //   ].map((d) => dataLaplacianSmoothing(d, 5)),
  //   180,
  //   240,
  //   layerHeight,
  //   dataSampling
  // );

  // const intermedPositions = lightAndSoundToThing(lightValues, noiseValues, 4, 100, 250, 20);
  positions.push(...catmullPolylineN([...extraPoints, ...intermedPositions], 4));
  // const positions = intermedPositions;

  // positions.push(...dataToObject([
  //   sliceLightValues,
  //   sliceNoiseValues,
  //   sliceHumidity,
  //   sliceTemperature
  // ], 120, 160, 4.))

  // console.log(positions);

  console.log('added curve');

  parallelTransportMeshes.length = 0; // clearing the array
  parallelTransportMeshes.push(new ParallelTransportMesh(positions, pipeRadius, 12, material, 2, scene));

  scene.registerBeforeRender(() => {
    // const vertexLimit = 10000;
    // if (
    //   continueGrowth &&
    //   growth.vs.length <= vertexLimit &&
    //   iteration <= 3000
    // ) {
    //   iteration++;
    //   // const locR =  r - 20.; // + Math.sin(iteration * .1)*2.;
    //   const locROuter = r + outerRadiusDifference; // + Math.sin(iteration * .1)*2.;
    //   // const boundary = createCircle(center, locR, divCalc(locR)).map(v => new Vector2(v.x, v.z));
    //   const boundaryOuter = createCircle(
    //     center,
    //     locROuter,
    //     divCalc(locROuter)
    //   ).map((v) => new Vector2(v.x, v.z));
    //   // growth.grow(boundaryOuter, h);
    //   // growth.grow([...boundary, ...boundaryOuter], h);
    //   if (iteration % 10 === 0 && iteration > startOfPrintIteration) {
    //     console.log(growth.toString());
    //     h += layerHeight;
    //     hIndex += 1;
    //     // scene.meshes.forEach(mesh => mesh.dispose());
    //     positions.push(...growth.asPolygon(h, postProcessing, hIndex));
    //     growth.asPipe(
    //       h,
    //       pipeRadius,
    //       material,
    //       scene,
    //       6,
    //       1,
    //       postProcessing,
    //       hIndex
    //     );
    //     // new ParallelTransportMesh(
    //     //   boundary.map(v => new Vector3(v.x, v.y, h)),
    //     //   .2,
    //     //   5,
    //     //   new StandardMaterial('standardMaterial', scene),
    //     //   10,
    //     //   scene
    //     // );
    //     // new ParallelTransportMesh(
    //     //   boundaryOuter.map(v => new Vector3(v.x, v.y, h)),
    //     //   .2,
    //     //   5,
    //     //   new StandardMaterial('standardMaterial', scene),
    //     //   10,
    //     //   scene
    //     // );
    //   }
    //   if (growth.vs.length >= vertexLimit || iteration > 3000) {
    //     console.log(growth.toString());
    //     // scene.meshes.forEach(mesh => mesh.dispose());
    //     growth.asPipe(
    //       h,
    //       pipeRadius,
    //       material,
    //       scene,
    //       6,
    //       1,
    //       postProcessing,
    //       hIndex
    //     );
    //     positions.push(...growth.asPolygon(h, postProcessing, hIndex));
    //     console.log(growth.hashDict);
    //   }
    // }
  });
};

const onRender = (scene: Scene) => {
  if (scene.materials.length > 0) {
    time += 0.01;

    // scene.materials.forEach((material) => {
    //   if (material instanceof ShaderMaterial) {
    //     material.setFloat('time', time);
    //   }
    // });
  }
};

const Renderer: React.FC = () => {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <SceneComponent
        antialias
        updateMaterial={updateMaterial}
        onSceneReady={onSceneReady}
        onRender={onRender}
        id='babylon-canvas'
        engineOptions={undefined}
        adaptToDeviceRatio={undefined}
        sceneOptions={undefined}
        positions={positions}
        setContinueGrowth={setContinueGrowth}
        parallelTransportMeshes={parallelTransportMeshes}
      />
    </div>
  );
};

export default Renderer;
