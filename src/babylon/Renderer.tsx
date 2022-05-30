import { Scene, ShaderMaterial } from '@babylonjs/core';
import * as React from 'react';
import { addCurve } from './addCurve';
import { createCustomShader } from './geometry/dynamicShader';
import SceneComponent from './scene';

let material: ShaderMaterial;
let time = 0.;
let shader = 'a';

const onSceneReady = (scene: Scene, canvas: HTMLCanvasElement) => {
    material = createCustomShader(scene) as ShaderMaterial;
    addCurve(scene, canvas, material);
}

const onRender = (scene: Scene) => {
    if (material) {
        time += 0.01;
        material.setFloat('time', time);
    }
}

const ShaderButton: React.FC = () => {
    const [materialName, setMaterialName] = React.useState('a');

    return <button style={{position: 'absolute', left: 0, top: 0}}>
        clickme!
    </button>
}

const Renderer: React.FC = () => {
    return (
    <div style={{height: '100vh', width: '100vw'}}>
      <SceneComponent antialias onSceneReady={onSceneReady} onRender={onRender} id="babylon-canvas" engineOptions={undefined} adaptToDeviceRatio={undefined} sceneOptions={undefined} />
      <ShaderButton />
    </div>
    )
    };

export default Renderer;