import { Scene, ShaderMaterial, StandardMaterial, Vector2, Vector3, HemisphericLight } from '@babylonjs/core';
import * as React from 'react';
import { addCurve } from './addCurve';
import { Growth } from './geometry/differentialGrowth';
import { createCircle } from './geometry/directedCurve';
import { createCustomShader } from './geometry/dynamicShader';
import { ParallelTransportMesh } from './geometry/parallelTransportFrames';
import { gyroidPostProcessing } from './geometry/postProcessing';
import SceneComponent from './scene';

const postProcessing = true;
const startOfPrintIteration = 100;
const r = 150.;
const layerHeight = 4.;
const pipeRadius = layerHeight * .55;
const center = new Vector3(0, 0, 0);
const divCalc = (r: number) => Math.ceil(r * Math.PI * 2);
let continueGrowth = true;

const setContinueGrowth = (value: boolean) => continueGrowth = value;

const startpPts = createCircle(center, r, divCalc(r)).map(v => new Vector2(v.x, v.z));

export const CUSTOM_SHADER_NAME = 'customShaderName';
const growth = new Growth({
  vs: startpPts
});

growth.postProcessing = gyroidPostProcessing;

let material: ShaderMaterial;
let time = 0;
let iteration = 0;
let h = 0;
let positions: Vector3[] = []

export const updateMaterial = (scene: Scene, materialName = 'a') => {
  material = createCustomShader(scene, materialName) as ShaderMaterial;
  return material;
};

const onSceneReady = (scene: Scene, canvas: HTMLCanvasElement) => {
  const light = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  light.intensity = 1.0;
  
  material = updateMaterial(scene);

  console.log('before adding curve')

  addCurve(scene, canvas, material);

  console.log('added curve');

  scene.registerBeforeRender(() => {
    const vertexLimit = 10000;

    if (continueGrowth && growth.vs.length <= vertexLimit && iteration <= 3000) {
      iteration++;

      const locR =  r - 2. + Math.sin(iteration * .5)*2.;

      const locROuter =  r + 4. + Math.sin(iteration * .5)*2.;

      const boundary = createCircle(center, locR, divCalc(locR)).map(v => new Vector2(v.x, v.z));
      const boundaryOuter = createCircle(center, locROuter, divCalc(locR)).map(v => new Vector2(v.x, v.z));

      growth.grow([...boundary, ...boundaryOuter], h);

      if (iteration % 10 === 0 && iteration > startOfPrintIteration) {
        console.log(growth.toString());
        h += layerHeight;
        // scene.meshes.forEach(mesh => mesh.dispose());
        positions.push(...growth.asPolygon(h, postProcessing));
        growth.asPipe(h, pipeRadius, material, scene, 6, 1, postProcessing);

        // new ParallelTransportMesh(
        //   boundary.map(v => new Vector3(v.x, v.y, h)),
        //   .2,
        //   5,
        //   new StandardMaterial('standardMaterial', scene),
        //   10,
        //   scene
        // );

        // new ParallelTransportMesh(
        //   boundaryOuter.map(v => new Vector3(v.x, v.y, h)),
        //   .2,
        //   5,
        //   new StandardMaterial('standardMaterial', scene),
        //   10,
        //   scene
        // );
      }

      if (growth.vs.length >= vertexLimit || iteration > 3000) {
        console.log(growth.toString());
        // scene.meshes.forEach(mesh => mesh.dispose());
        growth.asPipe(h, pipeRadius, material, scene, 6, 1, postProcessing);
        positions.push(...growth.asPolygon(h, postProcessing));
        console.log(growth.hashDict);
      }
    }
  });
};

const onRender = (scene: Scene) => {
  if (scene.materials.length > 0) {
    time += 0.01;

    // scene.materials.forEach((material) => {
    //   if (material instanceof ShaderMaterial) {
    //     material.setFloat('time', time);
    //   }
    // });
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
        positions={positions}
        setContinueGrowth={setContinueGrowth}
      />
    </div>
  );
};

export default Renderer;
