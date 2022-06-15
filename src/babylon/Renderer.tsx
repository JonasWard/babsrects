import { Scene, ShaderMaterial } from '@babylonjs/core';
import * as React from 'react';
import { addCurve } from './addCurve';
import { createCustomShader } from './geometry/dynamicShader';
import SceneComponent from './scene';

export const CUSTOM_SHADER_NAME = 'customShaderName';
let material: ShaderMaterial;
let time = 0;

export const updateMaterial = (scene: Scene, materialName='a') => {
  material = createCustomShader(scene, materialName) as ShaderMaterial;
  return material;
};

const onSceneReady = (scene: Scene, canvas: HTMLCanvasElement) => {
  material = updateMaterial(scene);
  addCurve(scene, canvas, material);
};

const onRender = (scene: Scene) => {
  if (scene.materials.length > 0) {
    time += 0.01;
    scene.materials.forEach((material) => {
      if (material instanceof ShaderMaterial) {
        material.setFloat('time', time);
      }
    });
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
      />
    </div>
  );
};

export default Renderer;
