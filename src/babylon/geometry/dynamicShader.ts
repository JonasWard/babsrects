import {Scene, ShaderMaterial } from '@babylonjs/core';
import { CUSTOM_SHADER_NAME } from '../Renderer';

export function createCustomShader(scene: Scene, shaderName = 'a') {
  return new ShaderMaterial(
    'shader'+shaderName,
    scene,
    {
      vertex: CUSTOM_SHADER_NAME + shaderName,
      fragment: CUSTOM_SHADER_NAME + shaderName,
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
