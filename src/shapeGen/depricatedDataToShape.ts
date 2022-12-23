import { Vector3 } from '@babylonjs/core';
import {
  temperature,
  humidity,
  noiseValues,
  lightValues,
} from '../data/23.07.2022';
import { laplacianSmoothing, numberRemapping } from './dataHandling';
import { dataToObject } from './dataToShape';
import { catmullPolylineN, positionScaling } from './postProcessing';
import * as bspline from 'b-spline';

const dataSlicing = { start: 0, end: 400 };
const layerHeight = 2;
const layerCount = 200;
const zDomain = [0, 500];

const sliceLightValues = lightValues.slice(dataSlicing.start, dataSlicing.end);
const sliceTemperature = temperature.slice(dataSlicing.start, dataSlicing.end);
const sliceNoiseValues = noiseValues.slice(dataSlicing.start, dataSlicing.end);
const sliceHumidity = humidity.slice(dataSlicing.start, dataSlicing.end);

const bezierData = numberRemapping(
  laplacianSmoothing(sliceLightValues, 50),
  0.2,
  1
).map((v) => [v]);

const dataSampling = (z: number): number =>
  bspline((z - zDomain[0]) / (zDomain[1] - zDomain[0]), 2, bezierData)[0];

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

  return newDataValues;
};

// depricated geometry to data methods
export const depricatedLightAndSoundToThing = () => {
  const layerCount = 200;
  const lArray: number[] = differentiateDatapoints(
    laplacianSmoothing(sliceLightValues, 10),
    layerCount
  );
  const nArray: number[] = differentiateDatapoints(
    laplacianSmoothing(sliceNoiseValues, 10),
    layerCount
  );
  const lh: number = layerHeight;
  const w: number = 50;
  const h: number = 250;
  const resolution: number = 2;
  const minV: number = 0;
  const maxV: number = 150;

  const lightArray = numberRemapping(lArray, minV, maxV);
  const noiseData = numberRemapping(nArray, minV, maxV);

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

  const extraPoints: Vector3[] = [];

  const bottomLayer = positions
    .slice(0, 6)
    .map((v) => new Vector3(v.x, v.y, 0));
  for (let i = 0; i < 10; i++) {
    extraPoints.push(...bottomLayer);
  }

  console.log([...extraPoints, ...positions]);

  return catmullPolylineN([...extraPoints, ...positions], 4);
};

export const depricatedDataToObject = () => {
  // return catmullPolylineN(
    const ps = dataToObject(
      [
        differentiateDatapoints(
          laplacianSmoothing(sliceTemperature, 0),
          layerCount
        ),
        differentiateDatapoints(
          laplacianSmoothing(sliceHumidity, 0),
          layerCount
        ),
        differentiateDatapoints(
          laplacianSmoothing(sliceLightValues, 0),
          layerCount
        ),
        differentiateDatapoints(
          laplacianSmoothing(sliceNoiseValues, 0),
          layerCount
        ),
      ].map((d) => laplacianSmoothing(d, 5)),
      180,
      240,
      layerHeight,
      dataSampling
    );
    console.log(ps);
    return ps;
  //   3
  // );
};
