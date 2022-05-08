import { Mesh, Scene, ShaderMaterial, Buffer, VertexBuffer, VertexData, Vector3 } from "@babylonjs/core";
import { createCustomShader } from "./dynamicShader";

export class DynamicSurface extends Mesh{
    constructor(sizeLength: number, vCount: number, hCount: number, scene: Scene) {
        super("dynamicSurface", scene);

        const vertexData = new VertexData();

        const {positions, uvs} = this._positionGeneration(sizeLength, vCount, hCount);
        vertexData.positions = positions;
        vertexData.uvs = uvs;

        vertexData.indices = this._indexGeneration(vCount, hCount);

        vertexData.applyToMesh(this);

        this.material = createCustomShader(scene) as ShaderMaterial;

        let time = 0.0;
    
        scene.registerBeforeRender(() => {
            // @ts-ignore
            this.material.setFloat("time", time);
            time +=0.1;
        });

        this.position.x = -sizeLength * vCount / 2;
        this.position.z = sizeLength * hCount / 2;

        this.setVerticesBuffer(this._normalBuffer(vCount, hCount, scene));
    }

    _positionGeneration(sizeLength: number, vCount: number, hCount: number): {positions: number[], uvs: number[]} {
        const positions: number[] = [];
        const uvs: number[] = [];

        for (let i = 0; i < vCount + 1; i++) {
            const x = i * sizeLength;
            for (let j = 0; j < hCount + 1; j++) {
                const y = j * sizeLength;
                positions.push(x, 0, -y);
                uvs.push(x, y);
            }
        }

        return {positions, uvs};
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

    _normalBuffer(vCount: number, hCount: number, scene: Scene): VertexBuffer {
        const normals: number[] = [];

        for (let i = 0; i < vCount + 1; i++) {
            for (let j = 0; j < hCount + 1; j++) {
                normals.push(0, 1, 0);
            }
        }
        
        const normalVertexBuffer = new Buffer(scene.getEngine(), normals, false, 3)
        return normalVertexBuffer.createVertexBuffer("normalRef", 0, 3);
    }
}