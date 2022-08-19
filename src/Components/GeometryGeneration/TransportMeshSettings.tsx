import { Material, ShaderMaterial } from '@babylonjs/core';

export interface IParallelTransportMeshSettings {
    pipeRadius: number;
    divisions: number;
    uvScale: number;
    material: ShaderMaterial | undefined | Material;
}