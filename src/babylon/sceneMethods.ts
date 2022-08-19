import { Effect, Scene, ShaderMaterial } from '@babylonjs/core';
import shaders from '../babylon/shaders/shaders';

export const CUSTOM_SHADER_NAME = 'customShaderName';

export const registerMaterial = (
  shader: { vertex: string; fragment: string },
  shaderName = 'a'
) => {
  Effect.ShadersStore[CUSTOM_SHADER_NAME + shaderName + 'VertexShader'] =
    shader.vertex;
  Effect.ShadersStore[CUSTOM_SHADER_NAME + shaderName + 'FragmentShader'] =
    shader.fragment;
};

export const updateSceneGeometriesMaterial = (
  scene: Scene,
  updateMaterial: (scene: Scene, materialName: string) => ShaderMaterial,
  materialName: string
) => {
  registerMaterial(shaders[materialName], materialName);

  const localMaterial = updateMaterial(scene, materialName);

  scene.geometries.forEach((geo) => {
    geo.meshes.forEach((mesh) => {
      mesh.material = localMaterial;
    });
  });
};
