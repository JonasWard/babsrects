import { Vector3 } from '@babylonjs/core';
import { getMax, getMin, numberRemapping } from './dataHandling';
import { catmullPolylineN, positionScaling, tweeningZ } from './postProcessing';

const lightAndSoundToThing = (
  lightArray: number[],
  noiseData: number[],
  lh: number,
  w: number,
  h: number,
  resolution: number = 20,
  minV: number = 0,
  maxV: number = 30,
  catmullCount: number = 3
) => {
  lightArray = numberRemapping(lightArray, minV, maxV);
  noiseData = numberRemapping(noiseData, minV, maxV);

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

const dataToLayers = (
  dataArrays: number[][],
  layerHeight: number,
  inBetweenPositions: number = 0,
  radius?: number
) => {
  const count = dataArrays.length;
  const layers: Vector3[][] = [];
  const angleDelta = (2 * Math.PI) / count;

  const dirVs: { x: number; y: number }[] = [];

  if (inBetweenPositions < 1) {
    for (let j = 0; j < count; j++) {
      const angle = j * angleDelta;
      dirVs.push({
        x: Math.cos(angle),
        y: Math.sin(angle),
      });
    }

    for (let i = 0; i < dataArrays[0].length; i++) {
      const h = (i - 0) * layerHeight;
      const localPoints = [];
      for (let j = 0; j < count; j++) {
        const radius = dataArrays[j][i];
        const localVec = new Vector3(
          dirVs[j].x * radius,
          dirVs[j].y * radius,
          h
        );

        localPoints.push(localVec);
      }

      layers.push(localPoints);
    }
  } else {
    radius = radius
      ? radius
      : 0.5 * (getMax(dataArrays[0]) + getMin(dataArrays[0]));

    for (let j = 0; j < count * inBetweenPositions; j++) {
      const angle = j * angleDelta;
      dirVs.push({
        x: Math.cos(angle),
        y: Math.sin(angle),
      });
    }

    for (let i = 0; i < dataArrays[0].length; i++) {
      const h = (i - 0) * layerHeight;
      const localPoints = [];
      for (let j = 0; j < count; j++) {
        const dataRadius = dataArrays[j][i];
        const localVec = new Vector3(
          dirVs[j * inBetweenPositions].x * dataRadius,
          dirVs[j * inBetweenPositions].y * dataRadius,
          h
        );
        localPoints.push(localVec);
        for (let k = 1; k < inBetweenPositions; k++) {
          const dirVIndex = j * inBetweenPositions + k;
          const localVec = new Vector3(
            dirVs[dirVIndex].x * radius,
            dirVs[dirVIndex].y * radius,
            h
          );

          localPoints.push(localVec);
        }
      }

      layers.push(localPoints);
    }
  }

  return layers;
};

export const dataToObject = (
  dataArrays: number[][],
  minRadius: number,
  maxRadius: number,
  layerHeight: number,
  scaleFunction?: (v: number) => number,
  catmullCount: number = 3,
  extraBottomLayer: number = 0,
  inBetweenPositions = 0
) => {
  // preparing the data
  const count = dataArrays.length;
  const angleDelta = (2 * Math.PI) / count;

  const mins = dataArrays.map((arr) =>
    arr.reduce((min, v) => (min < v ? min : v), Infinity)
  );
  const maxs = dataArrays.map((arr) =>
    arr.reduce((max, v) => (max > v ? max : v), -Infinity)
  );

  const radiusDelta = maxRadius - minRadius;
  const multipliers = maxs.map((maxV, i) => radiusDelta / (maxV - mins[i]));
  const mappedData = dataArrays.map((data, i) =>
    data.map((v) => (v - mins[i]) * multipliers[i])
  );

  const avgValue = (minRadius + maxRadius) * 0.5;

  // creating the layers
  const layers = dataToLayers(
    mappedData,
    layerHeight,
    inBetweenPositions,
    avgValue
  );

  // post processing
  const extraPoints =
    extraBottomLayer > 0
      ? Array(extraBottomLayer * layers[0].length).fill(layers[0])
      : [];
  const tweened = extraPoints.concat(tweeningZ(layers, layerHeight));
  const scaled = scaleFunction
    ? tweened.map((v) => positionScaling(v, scaleFunction))
    : tweened;
  const catmulled =
    catmullCount > 0 ? catmullPolylineN(scaled, catmullCount) : scaled;

  return catmulled;
};

// same as data to object, just has extra positions in between
export const dataToCone = (
  dataArrays: number[][],
  minRadius: number,
  maxRadius: number,
  layerHeight: number,
  scaleFunction?: (v: number) => number,
  catmullCount: number = 3,
  extraBottomLayer: number = 0
) => {
  // preparing the data
  const count = dataArrays.length;
  const angleDelta = (2 * Math.PI) / count;

  const mins = dataArrays.map((arr) =>
    arr.reduce((min, v) => (min < v ? min : v), Infinity)
  );
  const maxs = dataArrays.map((arr) =>
    arr.reduce((max, v) => (max > v ? max : v), -Infinity)
  );

  const radiusDelta = maxRadius - minRadius;
  const multipliers = maxs.map((maxV, i) => radiusDelta / (maxV - mins[i]));
  const mappedData = dataArrays.map((data, i) =>
    data.map((v) => (v - mins[i]) * multipliers[i])
  );

  // creating the layers
  const layers = dataToLayers(mappedData, layerHeight);

  // post processing
  const extraPoints =
    extraBottomLayer > 0
      ? Array(extraBottomLayer * layers[0].length).fill(layers[0])
      : [];
  const tweened = extraPoints.concat(tweeningZ(layers, layerHeight));
  const scaled = scaleFunction
    ? tweened.map((v) => positionScaling(v, scaleFunction))
    : tweened;
  const catmulled =
    catmullCount > 0 ? catmullPolylineN(scaled, catmullCount) : scaled;

  return catmulled;
};