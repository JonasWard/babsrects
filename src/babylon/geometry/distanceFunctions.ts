import { Vector3 } from '@babylonjs/core';

export const sdGyroid = (v: Vector3, scale: number): number => {
  v = v.scale(scale);
  const vS = new Vector3(Math.sin(v.x) + Math.sin(v.y) + Math.sin(v.z));
  const vC = new Vector3(Math.cos(v.x) + Math.cos(v.y) + Math.cos(v.z));

  return Vector3.Dot(vS, vC);
};
