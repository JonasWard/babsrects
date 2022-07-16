import { Scene, ShaderMaterial, StandardMaterial, Vector2, Vector3 } from '@babylonjs/core';
import * as React from 'react';
import { addCurve } from './addCurve';
import { Growth } from './geometry/differentialGrowth';
import { createCircle } from './geometry/directedCurve';
import { createCustomShader } from './geometry/dynamicShader';
import { ParallelTransportMesh } from './geometry/parallelTransportFrames';
import SceneComponent from './scene';

const r = 15.;
const divCalc = (r: number) => Math.ceil(r * Math.PI * 2);

const startpPts = createCircle(new Vector3(0, 0, 0), r, divCalc(r)).map(v => new Vector2(v.x, v.z));

export const CUSTOM_SHADER_NAME = 'customShaderName';
const growth = new Growth({
  vs: startpPts
});

let material: ShaderMaterial;
let time = 0;
let iteration = 0;
let h = 0;

export const updateMaterial = (scene: Scene, materialName = 'a') => {
  material = createCustomShader(scene, materialName) as ShaderMaterial;
  return material;
};

const onSceneReady = (scene: Scene, canvas: HTMLCanvasElement) => {
  material = updateMaterial(scene);

  console.log('before adding curve')

  addCurve(scene, canvas, material);

  console.log('added curve');

  // scene.registerBeforeRender(() => {
  //   const vertexLimit = 40000;

  //   if (growth.vs.length <= vertexLimit && iteration <= 3000) {
  //     iteration++;

  //     const locR =  r - 2. + Math.sin(iteration * .005)*2.;

  //     const locROuter =  r + 4. + Math.sin(iteration * .005)*2.;

  //     const boundary = createCircle(new Vector3(0, 0, 0), locR, divCalc(locR)).map(v => new Vector2(v.x, v.z));
  //     const boundaryOuter = createCircle(new Vector3(0, 0, 0), locROuter, divCalc(locR)).map(v => new Vector2(v.x, v.z));

  //     growth.grow([...boundary, ...boundaryOuter], h);

  //     if (iteration % 10 === 0) {
  //       console.log(growth.toString());
  //       h += .35;
  //       // scene.meshes.forEach(mesh => mesh.dispose());
  //       growth.asPipe(h, 0.2, material, scene, 6, 1);

  //       // new ParallelTransportMesh(
  //       //   boundary.map(v => new Vector3(v.x, v.y, h)),
  //       //   .2,
  //       //   5,
  //       //   new StandardMaterial('standardMaterial', scene),
  //       //   10,
  //       //   scene
  //       // );

  //       // new ParallelTransportMesh(
  //       //   boundaryOuter.map(v => new Vector3(v.x, v.y, h)),
  //       //   .2,
  //       //   5,
  //       //   new StandardMaterial('standardMaterial', scene),
  //       //   10,
  //       //   scene
  //       // );
  //     }

  //     if (growth.vs.length >= vertexLimit || iteration > 3000) {
  //       console.log(growth.toString());
  //       // scene.meshes.forEach(mesh => mesh.dispose());
  //       growth.asPipe(h, 0.2, material, scene, 6, 1);
  //       console.log(growth.hashDict);
  //     }
  //   }
  // });
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
