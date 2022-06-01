import { useEffect, useRef } from 'react';
import { Effect, Engine, Mesh, Scene, ShaderMaterial } from '@babylonjs/core';
import * as React from 'react';
import { updateMaterial } from './Renderer';
import shaders from './shaders/shaders';

const materialStates = Object.keys(shaders);

const registerMaterials = (shaders: {
  [name: string]: { vertex: string; fragment: string };
}) => {
  Object.entries(shaders).forEach(([name, shaders]) => {
    Effect.ShadersStore[name + 'VertexShader'] = shaders.vertex;
    Effect.ShadersStore[name + 'FragmentShader'] = shaders.fragment;
  });
};

const updateSceneGeometriesMaterial = (scene: Scene, materialName: string) => {
  const localMaterial = updateMaterial(scene, materialName);
  scene.geometries.forEach((geo) => {
    geo.meshes.forEach((mesh) => {
      mesh.material = localMaterial;
    });
  });
};

const ShaderButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  return (
    <button style={{ position: 'absolute', left: 0, top: 0 }} onClick={onClick}>
      clickme!
    </button>
  );
};

export default ({
  antialias,
  engineOptions,
  adaptToDeviceRatio,
  sceneOptions,
  onRender,
  onSceneReady,
  ...rest
}) => {
  const reactCanvas = useRef(null);

  const [materialName, setMaterialName] = React.useState('a');
  const [materialIndex, setMaterialIndex] = React.useState(0);
  const [scene, setScene] = React.useState(new Scene(new Engine(null)));

  registerMaterials(shaders); 

  const changeMaterialState = () => {
    const localMaterialIndex = materialIndex + (1 % materialStates.length);
    setMaterialName(materialStates[localMaterialIndex]);
    setMaterialIndex(localMaterialIndex);
  };

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
    console.log(
      'material name has updated, trying to update all the geometries with it'
    );
    updateSceneGeometriesMaterial(scene, materialName);
  }, [materialName]);

  return (
    <>
      <canvas ref={reactCanvas} {...rest} />
      <ShaderButton onClick={changeMaterialState} />
    </>
  );
};
