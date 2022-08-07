import { Vector2, Vector3 } from '@babylonjs/core';
import { sdGyroid } from '../babylon/geometry/distanceFunctions';

export const zDomain: [number, number] = [0, 500];

export const catmullPolygon = (vs: Vector3[]) => {
  const midPoints = vs.map((v, i) => v.add(vs[(i + 1) % vs.length]).scale(0.5));
  const result = [];
  midPoints.forEach((m, i) => {
    result.push(
      m
        .add(midPoints[(i + midPoints.length - 1) % midPoints.length])
        .scale(0.5)
        .add(vs[i])
        .scale(0.5)
    );
    result.push(m);
  });

  return result;
};

export const catmullPolygonN = (vs: Vector3[], n: number) => {
  n = n > 10 ? 10 : n;
  for (let i = 0; i < n; i++) {
    vs = catmullPolygon(vs);
  }

  return vs;
};

export const catmullPolylineN = (vs: Vector3[], n: number) => {
  const localVS = [vs[0], ...vs, vs[vs.length - 1]];
  const catmullResult = catmullPolygonN(localVS, n);

  return catmullResult.slice(
    (n + 1) * n,
    catmullResult.length - (n + 1) * (n + 2)
  );
};

export const scaleFunction = (
  z: number,
  domain: [number, number] = zDomain
): number => {
  return 1 + ((z - domain[0]) / (domain[1] - domain[0])) * -1;
};

export const positionScaling = (
  v: Vector3,
  f: (z: number) => number = scaleFunction
): Vector3 => {
  const s = f(v.z);
  return new Vector3(v.x, v.y * s, v.z);
};

export const tweeningZ = (layers: Vector3[][], layerHeight): Vector3[] => {
    const tweenedVs = [];

    layers.forEach(layer => {
        const zStep = layerHeight / layer.length;
        layer.forEach((v, i) => {
            const copy = v.clone();
            copy.z = zStep * i;
            tweenedVs.push(copy);
        })
    })

    return tweenedVs;
}

export const growthPostProcessing = (
    v: Vector2,
    h: number,
    growthScale: number,
    sliceLightValues: number[],
    hIndex: number = 0
  ) => {
    const location = new Vector3(v.x, v.y, h);
    const vG =
      Math.sin(
        0.2 * sdGyroid(location, 0.1) * sliceLightValues[hIndex] * 0.0002
      ) *
        growthScale +
      growthScale;
    return vG;
    // return v.subtract(center2d).length() < (r + outerRadiusDifference - 90) ? 0. : vG;
  };
  