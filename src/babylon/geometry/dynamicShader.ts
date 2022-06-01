import { Effect, Scene, ShaderMaterial } from '@babylonjs/core';

export function createCustomShader(scene: Scene, materialName: string = 'a') {
  return new ShaderMaterial(
    'shader',
    scene,
    {
      vertex: materialName,
      fragment: materialName,
    },
    {
      attributes: [
        'position',
        'normal',
        'uv',
        'directionA',
        'directionB',
        'patternUV',
        'previousPosition',
        'previousDirection',
        'previousUVPattern',
        'nextPosition',
        'nextDirection',
        'nextUVPattern',
      ],
      uniforms: [
        'world',
        'worldView',
        'worldViewProjection',
        'view',
        'projection',
      ],
    }
  );
}
