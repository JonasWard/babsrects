import { Effect, Scene, ShaderMaterial } from "@babylonjs/core";

export function createCustomShader(scene: Scene){
    return new ShaderMaterial("shader", scene, {
    vertex: "./customShader/a",
    fragment: "./customShader/a",
    },
    {
        attributes: ["position", "normal", "uv"],
        uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"]
    }
    );
}