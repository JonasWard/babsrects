import { Mesh, Scene, ShaderMaterial, VertexBuffer, VertexData } from "@babylonjs/core";
import { createCustomShader } from "./dynamicShader";

export class DynamicSurface extends Mesh{
    constructor(sizeLength: number, vCount: number, hCount: number, scene: Scene) {
        super("dynamicSurface", scene);

        const vertexData = new VertexData();

        vertexData.positions = this._positionGeneration(sizeLength, vCount, hCount);
        vertexData.indices = this._indexGeneration(vCount, hCount);

        vertexData.applyToMesh(this);

        this.material = createCustomShader(scene) as ShaderMaterial;

        let time = 0.0;
    
        scene.registerBeforeRender(() => {
            // @ts-ignore
            this.material.setFloat("time", time);
            time +=0.1;
        });
    }

    _positionGeneration(sizeLength: number, vCount: number, hCount: number): number[] {
        const positions: number[] = [];

        for (let i = 0; i < vCount + 1; i++) {
            const x = i * sizeLength;
            for (let j = 0; j < hCount + 1; j++) {
                const y = j * sizeLength;
                positions.push(x, 0, -y);
            }
        }

        return positions;
    }

    _indexGeneration(vCount: number, hCount: number): number[] {
        const indices: number[] = [];

        for (let i = 0; i < vCount; i++) {
            for (let j = 0; j < hCount; j++) {
                const first = i * (hCount + 1) + j;
                const second = first + 1;
                const third = first + hCount + 1;
                const fourth = third + 1;
                indices.push(first, second, third, second, fourth, third);
            }
        }

        return indices;
    }
}