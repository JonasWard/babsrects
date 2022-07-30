import {
  Buffer,
  Material,
  Mesh,
  Scene,
  ShaderMaterial,
  StandardMaterial,
  Vector2,
  Vector3,
  VertexData,
} from '@babylonjs/core';

enum PolygonFaceCount {
  QUAD = 'quad',
  TRI = 'tri',
}

export class ParallelTransportMesh extends Mesh {
  curvePoints: Vector3[];
  radius: number;
  divisions: number;
  uvScale: number;

  constructor(
    curvePoints: Vector3[],
    radius = 1.5,
    divisions: number,
    material: ShaderMaterial | undefined | Material,
    uvScale: number,
    scene: Scene
  ) {
    // initializing a mesh
    super('parallelTransportMesh', scene);

    this.curvePoints = curvePoints;
    this.radius = radius;
    this.divisions = divisions;
    this.uvScale = uvScale;

    // initializing the buffer geometry data
    const {
      positions,
      uvs,
      directions,
      directionA,
      directionB,
      patternUV,
      previousPosition,
      previousUVPattern,
      previousDirection,
      nextPosition,
      nextUVPattern,
      nextDirection,
    } = this._constructPositions();
    const indices = this._indices(PolygonFaceCount.TRI);

    const vertexData = new VertexData();

    vertexData.positions = positions;
    vertexData.uvs = uvs;
    vertexData.indices = indices;
    vertexData.normals = directions;

    vertexData.applyToMesh(this);

    const deformRefBufferA = new Buffer(
      scene.getEngine(),
      directionA,
      false,
      3
    );
    this.setVerticesBuffer(
      deformRefBufferA.createVertexBuffer('directionA', 0, 3)
    );

    const deformRefBufferB = new Buffer(
      scene.getEngine(),
      directionB,
      false,
      3
    );
    this.setVerticesBuffer(
      deformRefBufferB.createVertexBuffer('directionB', 0, 3)
    );

    const patterUVBuffer = new Buffer(scene.getEngine(), patternUV, false, 2);
    this.setVerticesBuffer(
      patterUVBuffer.createVertexBuffer('patternUV', 0, 2)
    );

    const previousPositionBuffer = new Buffer(
      scene.getEngine(),
      previousPosition,
      false,
      3
    );
    this.setVerticesBuffer(
      previousPositionBuffer.createVertexBuffer('previousPosition', 0, 3)
    );

    const previousDirectionBuffer = new Buffer(
      scene.getEngine(),
      previousDirection,
      false,
      3
    );
    this.setVerticesBuffer(
      previousDirectionBuffer.createVertexBuffer('previousDirection', 0, 3)
    );

    const previousUVPatternBuffer = new Buffer(
      scene.getEngine(),
      previousUVPattern,
      false,
      2
    );
    this.setVerticesBuffer(
      previousUVPatternBuffer.createVertexBuffer('previousUVPattern', 0, 2)
    );

    const nextPositionBuffer = new Buffer(
      scene.getEngine(),
      nextPosition,
      false,
      3
    );
    this.setVerticesBuffer(
      nextPositionBuffer.createVertexBuffer('nextPosition', 0, 3)
    );

    const nextDirectionBuffer = new Buffer(
      scene.getEngine(),
      nextDirection,
      false,
      3
    );
    this.setVerticesBuffer(
      nextDirectionBuffer.createVertexBuffer('nextDirection', 0, 3)
    );

    const nextUVPatternBuffer = new Buffer(
      scene.getEngine(),
      nextUVPattern,
      false,
      2
    );
    this.setVerticesBuffer(
      nextUVPatternBuffer.createVertexBuffer('nextUVPattern', 0, 2)
    );

    if (material) {
      this.material = material;
    }
  }

  /** method that retunrs the indices of the faces */
  _indices(faceCount: PolygonFaceCount = PolygonFaceCount.TRI) {
    const indices: number[] = [];

    const indexFunction =
      PolygonFaceCount.TRI === faceCount
        ? (a: number, b: number, c: number, d: number): number[] => [
            a,
            b,
            c,
            b,
            d,
            c,
          ]
        : (a: number, b: number, c: number, d: number): number[] => [
            a,
            b,
            c,
            d,
          ];

    for (let i = 0; i < this.curvePoints.length - 1; i++) {
      const iA = i * this.divisions;
      const iB = (i + 1) * this.divisions;
      for (let j = 0; j < this.divisions; j++) {
        const first = iA + j;
        const second = iA + ((j + 1) % this.divisions);
        const third = iB + j;
        const fourth = iB + ((j + 1) % this.divisions);
        indices.push(...indexFunction(first, second, third, fourth));
      }
    }

    return indices;
  }

  _isClosed(curvePoints: Vector3[]): boolean {
    // checking whether the polygon is closed
    return (
      Vector3.DistanceSquared(
        curvePoints[0],
        curvePoints[curvePoints.length - 1]
      ) < 1e-6
    );
  }

  _constructPositions() {
    const frames = this._constructFrames(this.curvePoints);

    const ns = [];
    const bns = [];
    const vs = [];

    const alphaDelta = (2 * Math.PI) / this.divisions;
    const vDelta = this.uvScale / this.divisions;
    const uDelta = this.uvScale / (2.0 * Math.PI * this.radius);

    for (let i = 0; i < this.divisions; i++) {
      const alpha = i * alphaDelta;
      ns.push(Math.cos(alpha));
      bns.push(Math.sin(alpha));
      vs.push(i * vDelta);
    }

    const directionA = [];
    const directionB = [];
    const positions: number[] = [];
    const uvs: number[] = [];
    const directions: number[] = [];
    const patternUV: number[] = [];

    const previousStartVector = frames[0].position.add(
      frames[0].position.subtract(frames[1].position).normalizeToNew()
    );
    const previousPosition = [];
    const previousUVPattern = [];
    const previousDirection = [];

    const nextEndVector = frames[frames.length - 1].position.add(
      frames[frames.length - 1].position
        .subtract(frames[frames.length - 2].position)
        .normalizeToNew()
    );
    const nextPosition = [];
    const nextUVPattern = [];
    const nextDirection = [];

    frames.forEach((frame, index) => {
      const { normal, biNormal, length, position } = frame;

      const u = length * uDelta;
      const vPattern = position.y * uDelta;

      let localPreviousPosition: Vector3;
      let localPreviousDirection: Vector3;
      let localPreviousUVPatternVector: Vector2;

      switch (index) {
        case 0:
          localPreviousPosition = previousStartVector;
          localPreviousDirection = normal;
          localPreviousUVPatternVector = new Vector2(
            -1 * uDelta,
            position.y * uDelta
          );
          break;
        default:
          localPreviousPosition = frames[index - 1].position;
          localPreviousDirection = frames[index - 1].normal;
          localPreviousUVPatternVector = new Vector2(
            frames[index - 1].length * uDelta,
            frames[index - 1].position.y * uDelta
          );
          break;
      }

      let localNextPosition: Vector3;
      let localNextDirection: Vector3;
      let localNextUVPatternVector: Vector2;

      switch (index) {
        case frames.length - 1:
          localNextPosition = nextEndVector;
          localNextDirection = frames[frames.length - 1].normal;
          localNextUVPatternVector = new Vector2(
            (length + 1) * uDelta,
            position.y * uDelta
          );
          break;
        default:
          localNextPosition = frames[index + 1].position;
          localNextDirection = frames[index + 1].normal;
          localNextUVPatternVector = new Vector2(
            frames[index + 1].length * uDelta,
            frames[index + 1].position.y * uDelta
          );
          break;
      }

      for (let i = 0; i < this.divisions; i++) {
        directionA.push(...normal.asArray());
        directionB.push(...biNormal.asArray());

        const nM = normal.scale(ns[i]);
        const bNM = biNormal.scale(bns[i]);
        const d = nM.add(bNM);
        const p = position.add(d.scale(this.radius));
        const v = vs[i];

        patternUV.push(u, vPattern);
        positions.push(...p.asArray());
        uvs.push(u, v);
        directions.push(...d.asArray());

        previousPosition.push(...localPreviousPosition.asArray());
        previousDirection.push(...localPreviousDirection.asArray());
        previousUVPattern.push(...localPreviousUVPatternVector.asArray());

        nextPosition.push(...localNextPosition.asArray());
        nextDirection.push(...localNextDirection.asArray());
        nextUVPattern.push(...localNextUVPatternVector.asArray());
      }
    });

    return {
      positions,
      uvs,
      directions,
      directionA,
      directionB,
      patternUV,
      previousPosition,
      previousUVPattern,
      previousDirection,
      nextPosition,
      nextUVPattern,
      nextDirection,
    };
  }

  _constructRawTangents(curvePoints: Vector3[], isClosed = false): Vector3[] {
    const rawTangents = [];

    for (let i = 0; i < curvePoints.length - 1; i++) {
      rawTangents.push(curvePoints[i + 1].subtract(curvePoints[i]).normalize());
    }

    if (isClosed) {
      rawTangents.push(rawTangents[0].clone());
    } else {
      rawTangents.push(rawTangents[rawTangents.length - 1].clone());
    }

    return rawTangents;
  }

  __tangentAndLength(t0: Vector3, t1: Vector3) {
    const t = t0.scale(0.5).add(t1.scale(0.5));
    const l = t0.length();

    if (l < 1e-6) {
      // case that two tangents are anti-parallel
      return { t: t1, l: 1.0 };
    }

    return { t: t.normalize(), l: 1 / l };
  }

  _constructLocalTangents(rawTangents: Vector3[], isClosed = false) {
    const tangents = [];
    const widthScales = [];

    if (isClosed) {
      const { t, l } = this.__tangentAndLength(
        rawTangents[rawTangents.length - 1],
        rawTangents[0]
      );
      tangents.push(t);
      widthScales.push(l);
    } else {
      tangents.push(rawTangents[0]);
      widthScales.push(1.0);
    }

    for (let i = 0; i < rawTangents.length - 1; i++) {
      const { t, l } = this.__tangentAndLength(
        rawTangents[i],
        rawTangents[i + 1]
      );
      tangents.push(t);
      widthScales.push(l);
    }

    return { tangents, widthScales };
  }

  _constructFrames(curvePoints: Vector3[]) {
    const isClosed = this._isClosed(curvePoints);

    // construct tangents
    const rawTangents = this._constructRawTangents(curvePoints, isClosed);
    const { tangents, widthScales } = this._constructLocalTangents(
      rawTangents,
      isClosed
    );

    // construct frames
    let previousN = this.__firstNormal(tangents[0]);
    let previousL = 0;

    const frames: {
      normal: Vector3;
      biNormal: Vector3;
      tangent: Vector3;
      width: number;
      length: number;
      position: Vector3;
    }[] = [];

    // first frame
    frames.push({
      position: curvePoints[0],
      normal: previousN,
      biNormal: previousN.cross(tangents[0]).normalize(),
      tangent: tangents[0],
      width: widthScales[0],
      length: previousL,
    });

    // loop to construct all the other frames with
    for (let i = 1; i < tangents.length; i++) {
      const { n, b } = this._newNormalBinormal(previousN, tangents[i]);

      previousL += Vector3.Distance(curvePoints[i - 1], curvePoints[i]);

      frames.push({
        position: curvePoints[i],
        normal: n,
        biNormal: b,
        tangent: tangents[i],
        width: widthScales[i],
        length: previousL,
      });

      previousN = n;
    }

    return frames;
  }

  __firstNormal(tangent: Vector3) {
    if (tangent.x < 1e-6 && tangent.z < 1e-6) return new Vector3(1, 0, 0);

    // project to world xy & rotate 90 degrees
    return new Vector3(-tangent.z, 0, tangent.x).normalize();
  }

  _newNormalBinormal(previousN: Vector3, currentT: Vector3) {
    const b = previousN.cross(currentT).normalize();
    const n = currentT.cross(b).normalize();

    return { n, b };
  }

  private static createMultiExportData = (
    meshes: ParallelTransportMesh[],
    polygonVertexCount = PolygonFaceCount.TRI
  ): {
    positions: [number, number, number][];
    normals: [number, number, number][];
    uvs: [number, number][];
    indices: [number, number, number][] | [number, number, number, number][];
  } => {
    const groupedPositions: [number, number, number][] = [];
    const groupedNormals: [number, number, number][] = [];
    const groupedUVs: [number, number][] = [];
    const groupedIndices:
      | [number, number, number][]
      | [number, number, number, number][] = [];

    meshes.forEach((mesh) => {
      const { positions, normals, uvs, indices } =
        ParallelTransportMesh.createExportData(mesh, polygonVertexCount);

      const offsetValue = groupedPositions.length;
      positions.forEach((p) => groupedPositions.push(p));
      normals.forEach((n) => groupedNormals.push(n));
      uvs.forEach((uv) => groupedUVs.push(uv));
      indices.forEach((f) =>
        groupedIndices.push(f.map((i) => i + offsetValue))
      );
    });

    return {
      positions: groupedPositions,
      normals: groupedNormals,
      uvs: groupedUVs,
      indices: groupedIndices,
    };
  };

  private static createExportData = (
    mesh: ParallelTransportMesh,
    polygonVertexCount = PolygonFaceCount.TRI
  ): {
    positions: [number, number, number][];
    normals: [number, number, number][];
    uvs: [number, number][];
    indices: [number, number, number][] | [number, number, number, number][];
  } => {
    const { positions, directions, uvs } = mesh._constructPositions();
    const slicedPositions: [number, number, number][] = [];
    const slicedNormals: [number, number, number][] = [];
    const slicedUVs: [number, number][] = [];

    for (let i = 0; i < positions.length; i += 3) {
      slicedPositions.push([positions[i], positions[i + 1], positions[i + 2]]);
      slicedNormals.push([directions[i], directions[i + 1], directions[i + 2]]);
    }

    for (let i = 0; i < uvs.length; i += 2) {
      slicedUVs.push([uvs[i], uvs[i + 1]]);
    }

    if (polygonVertexCount === PolygonFaceCount.QUAD) {
      const indices = mesh._indices(polygonVertexCount);
      const slicedIndices: [number, number, number, number][] = [];
      for (let i = 0; i < indices.length; i += 4) {
        slicedIndices.push([
          indices[i],
          indices[i + 1],
          indices[i + 2],
          indices[i + 3],
        ]);
      }

      return {
        positions: slicedPositions,
        normals: slicedNormals,
        indices: slicedIndices,
        uvs: slicedUVs,
      };
    } else {
      const indices = mesh._indices(polygonVertexCount);
      const slicedIndices: [number, number, number][] = [];
      for (let i = 0; i < indices.length; i += 3) {
        slicedIndices.push([indices[i], indices[i + 1], indices[i + 2]]);
      }

      return {
        positions: slicedPositions,
        normals: slicedNormals,
        uvs: slicedUVs,
        indices: slicedIndices,
      };
    }
  };

  static createOBJ = (meshes: ParallelTransportMesh[]) => {
    // get an index and face list fron the object, geometry is just fine, all faces are quad
    const { positions, normals, uvs, indices } =
      ParallelTransportMesh.createMultiExportData(
        meshes,
        PolygonFaceCount.TRI
      );

    const positionStrings = positions
      .map((v) => `v ${v[0]} ${v[1]} ${v[2]}`)
      .join('\n');
    const textureStrings = uvs.map((uv) => `vt ${uv[0]} ${uv[1]}`).join('\n');
    const normalStrings = normals
      .map((n) => `vn ${n[0]} ${n[1]} ${n[2]}`)
      .join('\n');
    const faceStrings = indices
      .map((f) =>
        [
          'f ',
          ...f.map((i) => {
            const index = i+1;
            return `${index}/${index}/${index}`;
          }),
        ].join(' ')
      )
      .join('\n');

    const objContent = [
      positionStrings,
      textureStrings,
      normalStrings,
      faceStrings,
    ].join('\n');

    const element = document.createElement('a');
    const file = new Blob([objContent], {
      type: 'text/plain',
    });
    element.href = URL.createObjectURL(file);
    element.download = 'babsrect.obj';
    document.body.appendChild(element);
    element.click();
  };

  static createSTL = (meshes: ParallelTransportMesh[]) => {
    // get an index and face list fron the object, geometry is just fine, all faces are triangles
    const { positions, indices } = ParallelTransportMesh.createMultiExportData(
      meshes,
      PolygonFaceCount.TRI
    );

    const vertexStrings: string[] = [];

    indices.forEach((f) => {
      if (f.length === 3) {
        const vs = [positions[f[0]], positions[f[1]], positions[f[2]]];
        const v0 = new Vector3(...vs[0]);
        const normal = new Vector3(...vs[1])
          .subtract(v0)
          .cross(new Vector3(...vs[2]).subtract(v0))
          .normalize();

        vertexStrings.push(
          `facet normal ${normal.x} ${normal.y} ${normal.z}
outer loop
vertex ${vs[0][0]} ${vs[0][1]} ${vs[0][2]}
vertex ${vs[1][0]} ${vs[1][1]} ${vs[1][2]}
vertex ${vs[2][0]} ${vs[2][1]} ${vs[2][2]}
end loop
endfacet`
        );
      } else if (f.length === 4) {
        const vs = [
          positions[f[0]],
          positions[f[1]],
          positions[f[2]],
          positions[f[3]],
        ];
        const v0 = new Vector3(...vs[0]);
        const normal = new Vector3(...vs[1])
          .subtract(v0)
          .cross(new Vector3(...vs[2]).subtract(v0))
          .normalize();

        vertexStrings.push(
          `facet normal ${normal.x} ${normal.y} ${normal.z}
outer loop
vertex ${vs[0][0]} ${vs[0][1]} ${vs[0][2]}
vertex ${vs[1][0]} ${vs[1][1]} ${vs[1][2]}
vertex ${vs[2][0]} ${vs[2][1]} ${vs[2][2]}
vertex ${vs[3][0]} ${vs[3][1]} ${vs[3][2]}
end loop
endfacet`
        );
      }
    });

    const element = document.createElement('a');

    const stlContent = `solid Exported by JonasWard with babsrects
${vertexStrings.join('\n')}
endsolid Exported by JonasWard with babsrects`;

    const file = new Blob([stlContent], {
      type: 'text/plain',
    });
    element.href = URL.createObjectURL(file);
    element.download = 'babsrect.stl';
    document.body.appendChild(element);
    element.click();
  };

  static createGLTF = (meshes: ParallelTransportMesh[]) => {
    // using tris
    const positionArrays = meshes.map(
      (mesh) => mesh._constructPositions().positions
    );

    return '';
  };
}
