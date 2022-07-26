import { useEffect, useRef } from 'react';
import { Effect, Engine, Scene, Vector3 } from '@babylonjs/core';
import * as React from 'react';
import { CUSTOM_SHADER_NAME, updateMaterial } from './Renderer';
import shaders from './shaders/shaders';
import { downloadGCode, testCircle } from './production/gcodeParser';
import { ParallelTransportMesh } from './geometry/parallelTransportFrames';

const materialStates = Object.keys(shaders);

const registerMaterial = (
  shader: { vertex: string; fragment: string },
  shaderName = 'a'
) => {
  Effect.ShadersStore[CUSTOM_SHADER_NAME + shaderName + 'VertexShader'] =
    shader.vertex;
  Effect.ShadersStore[CUSTOM_SHADER_NAME + shaderName + 'FragmentShader'] =
    shader.fragment;
};

const updateSceneGeometriesMaterial = (scene: Scene, materialName: string) => {
  // console.log(
  //   `trying to update the custom shader parameters using the parameters for ${materialName}`
  // );

  registerMaterial(shaders[materialName], materialName);

  const localMaterial = updateMaterial(scene, materialName);

  scene.geometries.forEach((geo) => {
    geo.meshes.forEach((mesh) => {
      mesh.material = localMaterial;
    });
  });
};

const ActionButton: React.FC<{onClick: () => void, left?: number, right?: number, top?: number, text?: string}> = ({onClick, left, right, top, text}) => {
  let style: { position: string, top: number, left: number} | { position: string, top: number, right: number};
  console.log(right);
  if (right !== undefined && left === undefined) {
    style = { position: 'absolute', top: top ?? 0, right: right};
  } else {
    style= { position: 'absolute', top: top ?? 0, left: left ?? 0};
  }
  
  return (
    <button style={style as any} onClick={() => onClick()}>
      {text ?? 'i Do Something'}
    </button>
  );
  }

export default ({
  antialias,
  engineOptions,
  adaptToDeviceRatio,
  sceneOptions,
  onRender,
  onSceneReady,
  positions,
  setContinueGrowth,
  parallelTransportMeshes,
  ...rest
}) => {
  const reactCanvas = useRef(null);

  const [localPositions, setPositions] = React.useState<Vector3[]>([]);

  const [materialName, setMaterialName] = React.useState('a');
  const [materialIndex, setMaterialIndex] = React.useState(0);
  const [scene, setScene] = React.useState(new Scene(new Engine(null)));

  // registerMaterials(shaders);

  const changeMaterialState = () => {
    const localMaterialIndex = (materialIndex + 1) % materialStates.length;
    setMaterialName(materialStates[localMaterialIndex]);
    setMaterialIndex(localMaterialIndex);
  };

  useEffect(() => {
    setPositions(positions);
  }, [positions])

  // set up basic engine and scene
  useEffect(() => {
    const { current: canvas } = reactCanvas;

    canvas.style.width = '100vw';
    canvas.style.height = '100vh';

    // registering webgl parameters
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false }); // WebGL 2

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (!canvas) return;

    const engine = new Engine(
      canvas,
      antialias,
      engineOptions,
      adaptToDeviceRatio
    );
    const scene = new Scene(engine, sceneOptions);

    if (scene.isReady()) {
      onSceneReady(scene, canvas);
    } else {
      scene.onReadyObservable.addOnce((scene) => onSceneReady(scene, canvas));
    }

    engine.runRenderLoop(() => {
      if (typeof onRender === 'function') onRender(scene);
      scene.render();
    });

    const resize = () => {
      scene.getEngine().resize();
    };

    if (window) {
      window.addEventListener('resize', resize);
    }

    setScene(scene);

    return () => {
      scene.getEngine().dispose();

      if (window) {
        window.removeEventListener('resize', resize);
      }
    };
  }, [
    antialias,
    engineOptions,
    adaptToDeviceRatio,
    sceneOptions,
    onRender,
    onSceneReady,
  ]);

  useEffect(() => {
    // console.log(
    //   'material name has updated, trying to update all the geometries with it'
    // );
    updateSceneGeometriesMaterial(scene, materialName);
  }, [materialName]);

  return (
    <>
      <canvas ref={reactCanvas} {...rest} />
      <ActionButton onClick={changeMaterialState} text={'changeShader'}/>
      <ActionButton onClick={() => downloadGCode(positions)} top={25} text={'downloadGcode'} />
      <ActionButton onClick={setContinueGrowth} top={50} text={'start/stop growth'} />
      <ActionButton onClick={() => testCircle(125, 6, 4.)} right={0} text={'testGCodeDownload'}/>
      <ActionButton onClick={() => ParallelTransportMesh.createOBJ(parallelTransportMeshes)} right={0} top={25} text={'download obj'}/>
    </>
  );
};
