import { Vector2, Vector3 } from '@babylonjs/core';
import { sdGyroid } from './distanceFunctions';

// uses a given set of entry data and shift it's positions based on given data
// uses only 2d positiond data that then gets shifted into the right location

function positiveAngle(v0: Vector2, v1: Vector2) {
  const angle = Math.atan2(v1.y, v1.x) - Math.atan2(v0.y, v0.x);
  return angle < 0 ? angle + 2 * Math.PI : angle;
}

function rotate(v: Vector2, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Vector2(v.x * cos - v.y * sin, v.x * sin + v.y * cos);
}

// assumes they are closed
const getOffsetDirections = (vs: Vector2[]): Vector2[] => {

  const directions = vs.map((v, i) => vs[(i + 1) % vs.length].subtract(v));

  const offsetDirections: Vector2[] = [];

  for (let i = 0; i < vs.length; i++) {
    const d0 = directions[(i + directions.length - 1) % directions.length];
    const d1 = directions[i];
    const posAngle = positiveAngle(d1, d0);
    const offsetVectorScale = 1 / Math.cos(posAngle * 0.5);
    const offsetVectorDirection = rotate(d1, Math.PI * .5 + posAngle * 0.5).scale(offsetVectorScale);

    offsetDirections.push(offsetVectorDirection);
  }

  return offsetDirections;
};

export const offsetSimpleValue = (v: Vector2, h: number, hIndex: number): number => -3.;

export const offsetPolyline = (vs: Vector2[], h: number, hIndex: number, valueFunction: (v: Vector2, h: number, hIndex) => number = offsetSimpleValue): Vector2[] => {
    const offsetDirections = getOffsetDirections(vs);
    return vs.map((v, i) => v.add(offsetDirections[i].scale(valueFunction(v, h, hIndex))))
}

export const gyroidPostProcessing = (v: Vector2, h: number): number => {
    const location = new Vector3(v.x, v.y, h);
    return  sdGyroid(location, .1) * 5. + 5.
}
