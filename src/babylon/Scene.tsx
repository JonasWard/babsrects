import { useEffect, useRef } from 'react';
import { Effect, Engine, Scene, Vector3 } from '@babylonjs/core';
import * as React from 'react';
import { CUSTOM_SHADER_NAME, updateMaterial } from './Renderer';
import shaders from './shaders/shaders';
import { downloadGCode, testCircle } from './production/gcodeParser';

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

const TestCircleButton: React.FC = () => {
  return (
    <button style={{ position: 'absolute', right: 0, top: 0 }} onClick={() => testCircle(125, 6, 4.)}>
      download GCode!
    </button>
  );
  
}

const GCodeButton: React.FC<{positions}> = ({positions}) => {
  return (
    <button style={{ position: 'absolute', left: 0, top: 25 }} onClick={() => downloadGCode(positions)}>
      download GCode!
    </button>
  );
};

const ShaderButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  return (
    <button style={{ position: 'absolute', left: 0, top: 0 }} onClick={onClick}>
      change shader!
    </button>
  );
};

const StopClick: React.FC<{ onClick?: (value: boolean) => void }> = ({ onClick }) => {
  const [value, setValue] = React.useState(true);

  const changeState = () => {
    setValue(!value);
    onClick(!value);
  }

  return (
    <button style={{ position: 'absolute', left: 0, top: 50 }} onClick={changeState}>
      start/stop growth!
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
  positions,
  setContinueGrowth,
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
      <ShaderButton onClick={changeMaterialState} />
      <GCodeButton positions={localPositions}/>
      <StopClick onClick={setContinueGrowth}/>
      <TestCircleButton/>
    </>
  );
};
