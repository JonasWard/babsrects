import {
  ArcRotateCamera,
  Color4,
  HemisphericLight,
  Scene,
  Vector3,
} from '@babylonjs/core';
import * as React from 'react';
import GeometrySidebar from './GeometryGeneration/GeometrySidebar';
import SceneComponent from './Scene';

const onSceneReady = (scene: Scene, canvas: HTMLCanvasElement) => {
  const light = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  scene.clearColor = new Color4(1, 1, 1, 1);
  light.intensity = 1.5;

  scene.registerBeforeRender(() => {});

  var camera: ArcRotateCamera = new ArcRotateCamera(
    'Camera',
    Math.PI / 2,
    Math.PI / 2,
    55,
    Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);
};

const onRender = (scene: Scene) => {};

const Renderer: React.FC = () => {
  const [positions, setPositions] = React.useState<Vector3[]>();

  return (
    <div>
      <SceneComponent
        antialias
        positions={positions}
        onSceneReady={onSceneReady}
        onRender={onRender}
        id='babylon-canvas'
        engineOptions={undefined}
        adaptToDeviceRatio={undefined}
        sceneOptions={undefined}
      />
      <GeometrySidebar setPositions={setPositions} />
    </div>
  );
};

export default Renderer;
