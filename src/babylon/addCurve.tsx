import {
  ArcRotateCamera,
  HemisphericLight,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
} from '@babylonjs/core';
import { Growth } from './geometry/differentialGrowth';
import { createCircle } from './geometry/directedCurve';
import { createCustomShader } from './geometry/dynamicShader';
import { ParallelTransportMesh } from './geometry/parallelTransportFrames';
import { profile } from './geometry/rrreefsProfile';
import { VolumetricCell, VolumetricMesh } from './geometry/volumetricMesh';

export const addCurve = (
  scene: Scene,
  canvas: HTMLCanvasElement,
  material: ShaderMaterial | undefined
) => {
  var camera: ArcRotateCamera = new ArcRotateCamera(
    'Camera',
    Math.PI / 2,
    Math.PI / 2,
    55,
    Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);

  // const ground = MeshBuilder.CreateGround("ground", {width:10, height: 10}, scene);
  // var sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
  // sphere.position.y = 0.5;

  // const pts = createDirectedCurve(new Vector3(0, 0, 0), {alpha: 0, beta: 0, gamma: 0}, .05, 0.01, 0.01, 10000);
  // const pts = createSinoidCurve(new Vector3(0, 0, 0), 100., 25., .001, 30000);

  // // const dynamicSurface = new DynamicSurface(.1, 100, 100, scene);
  // const parallelTransportMesh = new ParallelTransportMesh(pts, 1.5, 100, scene);

  let time = 0;

  const spacing = 5;
  const rowCount = 100;
  const vCount = 15;
  const uCount = 250;
  const offset = spacing * rowCount * 0.5;

  // for (let i = 0; i < rowCount; i++) {
  //   const pts = profile(150, 150, 5, i * spacing - offset);
  //   // const pts = createCircle(new Vector3(0, (i - rowCount * .5) * spacing, 0), 250., uCount)
  //   // const pts = createCurveSet(new Vector3(-offset, i *  spacing - offset, -offset), new Vector3(1., 0, 0), 1., 500);
  //   const parallelTransportMesh = new ParallelTransportMesh(
  //     pts,
  //     spacing * 0.55,
  //     vCount,
  //     material,
  //     2.5,
  //     scene
  //   );
  // }

  // const pts = [
  //   new Vector2(5, 5),
  //   new Vector2(10, 12),
  //   new Vector2(15, 5),
  // ]

  // const growth = new Growth({vs: pts})

  // for (let i = 0; i < 400; i++) growth.grow([]);

  // console.log(growth.toString());

  // growth.asPipe(0., .05, material, scene, 8);

  // const volumetricCell = VolumetricCell.simplePlanarCell(10, 10, 1);
  // const voxelCell = VolumetricMesh.voxel(1.);

  // console.log(voxelCell.getNakedEdges());
  //   console.log(voxelCell.getDualGraphAsLines());
  //   console.log(voxelCell.getPolygons());

  // console.log(voxelCell);

  // // new VolumetricMesh([voxelCell]).edgeMeshes(scene, material);

  // const result = voxelCell.extrudeUpwards([], -1., true, true);
  // const voxelMeshOffspring = new VolumetricMesh(result)

  // console.log(voxelMeshOffspring);
  // console.log(voxelMeshOffspring.getNakedEdges());
  // console.log(voxelMeshOffspring.getDualGraphAsLines());
  // console.log(voxelMeshOffspring.getPolygons());

  // voxelMeshOffspring.edgeMeshes(scene, material);

  // const allCells = volumetricCell.extrudeUpwards([], 1, true, true);
  // // volumetricCell.extrudeUpwards([12, 33, 77]);
  // // console.log(volumetricMesh.getNakedEdges().map((e) => e.asLine()));
  // // console.log(volumetricMesh.getPolygons());
  // // console.log(volumetricMesh.getDualGraphAsLines());
  // allCells.forEach(c => c.babylonMesh(scene))
  // volumetricCell.babylonMesh(scene);

  // console.log(`vertexCount: ${vCount * rowCount * uCount}`);

  // hide/show the Inspector
  window.addEventListener('keydown', (ev) => {
    // Shift+Ctrl+Alt+I
    if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
      if (scene.debugLayer.isVisible()) {
        scene.debugLayer.hide();
      } else {
        scene.debugLayer.show();
      }
    }
  });
};
