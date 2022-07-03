import { Scene, ShaderMaterial, Vector2, Vector3 } from '@babylonjs/core';
import * as React from 'react';
import { addCurve } from './addCurve';
import { Growth } from './geometry/differentialGrowth';
import { createCircle } from './geometry/directedCurve';
import { createCustomShader } from './geometry/dynamicShader';
import SceneComponent from './scene';

export const CUSTOM_SHADER_NAME = 'customShaderName';
const growth = new Growth({
  vs: createCircle(new Vector3(0, 0, 0), 5, 10).map(
    (v) => new Vector2(v.x, v.y)
  ),
});

let material: ShaderMaterial;
let time = 0;
let iteration = 0;
let height = 0;

export const updateMaterial = (scene: Scene, materialName = 'a') => {
  material = createCustomShader(scene, materialName) as ShaderMaterial;
  return material;
};

const onSceneReady = (scene: Scene, canvas: HTMLCanvasElement) => {
  material = updateMaterial(scene);

  console.log(material);

  addCurve(scene, canvas, material);

  scene.registerBeforeRender(() => {
    if (growth.vs.length <= 4000) {
      iteration++;
      growth.grow([]);

      if (growth.vs.length > 4000) growth.asPipe(0., 0.25, material, scene, 6, 1);

      // if (iteration % 400 === 339) {
      //   height++;
        
      //   console.log(growth.toString());
      // }
    }
  });
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
