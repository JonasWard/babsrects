import { Vector3 } from '@babylonjs/core';
import { v4 } from 'uuid';

type IVector = { x: number; y: number; z: number };

const toIVector = (v: Vector3): IVector => ({ x: v.x, y: v.y, z: v.z });

class VolumetricVertex {
  position: Vector3;
  halfEdges: Set<HalfEdge>;
  id: string;

  constructor(position: Vector3, halfEdges?: HalfEdge[]) {
    this.position = position;
    this.halfEdges = new Set<HalfEdge>();

    if (halfEdges) halfEdges.forEach((he) => this.halfEdges.add(he));

    this.id = v4();
  }

  public addHalfEdge = (he: HalfEdge) => this.halfEdges.add(he);

  public removeHalfEdge = (he: HalfEdge) => this.halfEdges.delete(he);

  public asIVector = (): IVector => toIVector(this.position);
}

class HalfEdge {
  vertex: VolumetricVertex;
  face?: VolumetricFace;
  next: HalfEdge;
  opposite: HalfEdge;
  previous?: HalfEdge;
  id: string;

  constructor(vertex: VolumetricVertex, next?: HalfEdge, opposite?: HalfEdge) {
    this.vertex = vertex;
    if (next) this.setNext(next);
    this.opposite = opposite;

    this.id = v4();
  }

  public getDirectionVector = (): Vector3 | undefined => {
    if (this.previous)
      return this.vertex.position.subtract(this.previous.vertex.position);
    console.warn(
      'this edge does not have a previous edge defined, can not calculate its direction vector'
    );
  }

  public setVertex = (vertex: VolumetricVertex) => {
    if (this.vertex) this.vertex.removeHalfEdge(this);
    this.vertex = vertex;
    this.vertex.addHalfEdge(this);
  }

  public setPair = (other: HalfEdge) => {
    this.opposite = other;
    other.opposite = this;
  }

  public setNext = (next: HalfEdge) => {
    this.next = next;
    next.previous = this;
  };

  public setFace = (face: VolumetricFace) => (this.face = face);

  public isNaked = (): boolean => this.opposite === undefined;

  public asLine = () => {
    if (this.previous)
      return [this.previous.vertex.asIVector(), this.vertex.asIVector()];
    else console.warn('HalfEdge.asLine: no previous set');
  };
}

class VolumetricFace {
  edges: HalfEdge[];
  neighbour?: VolumetricFace;
  cell?: VolumetricCell;
  id: string;

  constructor(
    edges: HalfEdge[],
    neighbour?: VolumetricFace,
    cell?: VolumetricCell
  ) {
    this.setEdges(edges);

    this.neighbour = neighbour;
    this.cell = cell;

    this.id = v4();
  }

  public setEdges = (edges: HalfEdge[]) => {
    this.edges = edges;
    edges.forEach((edge) => edge.setFace(this));
  }

  public isClosed = (): boolean => this.edges.every((edge) => edge.opposite);

  public getNakedEdges = (): HalfEdge[] => this.edges.filter((edge) => edge.isNaked());

  public getCoveredEdges = (): HalfEdge[] => this.edges.filter((edge) => !edge.isNaked());

  public getInteralNeighbours = (): VolumetricFace[] => {
    const internalNeighbours = [];

    this.edges.forEach((edge) => {
      if (!edge.isNaked()) internalNeighbours.push(edge.opposite.face);
    });

    return internalNeighbours;
  }

  public constructNeighbourMap(
    checkedEdges: Set<HalfEdge>,
    facePairs: [VolumetricFace, VolumetricFace][]
  ) {
    for (const edge of this.edges) {
      if (checkedEdges.has(edge)) continue;
      checkedEdges.add(edge);
      if (!edge.isNaked()) {
        checkedEdges.add(edge.opposite);
        facePairs.push([this, edge.opposite.face]);
      }
    }
  }

  public getPolygons = (): IVector[] => this.edges.map((edge) => edge.vertex.asIVector());

  public getCenter = (): Vector3 => {
    let center = new Vector3(0, 0, 0);

    this.edges.forEach((edge) => (center = center.add(edge.vertex.position)));
    return center.scale(1 / this.edges.length);
  }

  public getNorma = (): Vector3 | undefined => {
    if (this.edges.length < 3) return;
    if (!this.isClosed()) return;

    const edge0dir = this.edges[0].getDirectionVector();
    if (!edge0dir) return;
    for (let i = 0; i < this.edges.length; i++) {
      const edge1dir = this.edges[i].getDirectionVector();
      const normal = edge1dir.cross(edge0dir);
      if (normal.length() > 0.00001) return normal.normalizeToNew();
    }
  }

  public toCell = (size: number): VolumetricCell => new VolumetricCell([]);
}

export class VolumetricCell {
  faces: VolumetricFace[];
  mesh?: VolumetricMesh;
  state: boolean;
  id: string;
  geometricID?: number[];

  constructor(
    faces: VolumetricFace[],
    mesh?: VolumetricMesh,
    geometricID?: number[],
    state = true
  ) {
    this.faces = faces;
    this.mesh = mesh;
    this.state = state;

    this.geometricID = geometricID;

    this.id = v4();
  }

  public getNakedEdges = (): HalfEdge[] => {
    const nakedEdges: HalfEdge[] = [];

    this.faces.forEach((face) => nakedEdges.push(...face.getNakedEdges()));

    return nakedEdges;
  }

  public getCoveredEdges = (): HalfEdge[] => {
    const coveredEdges: HalfEdge[] = [];

    this.faces.forEach((face) => coveredEdges.push(...face.getCoveredEdges()));

    return coveredEdges;
  }

  public getPolygons = (): IVector[][] => {
    return this.faces.map((face) => face.getPolygons());
  }

  public getDualGraph = (): [VolumetricFace, VolumetricFace][] => {
    const facePairs: [VolumetricFace, VolumetricFace][] = [];
    const checkedEdges = new Set<HalfEdge>();

    this.faces.forEach((face) =>
      face.constructNeighbourMap(checkedEdges, facePairs)
    );

    return facePairs;
  }

  public getDualGraphAsLines = (): [IVector, IVector][] => {
    return this.getDualGraph().map((fs) => [
      toIVector(fs[0].getCenter()),
      toIVector(fs[1].getCenter()),
    ]);
  }

  public expand = (expansionL: number, withNeighbours = false): VolumetricMesh => {
    return new VolumetricMesh(
      this.faces.map((face) => face.toCell(expansionL))
    );
  }

  public static simplePlanarCell = (
    xCount = 4,
    yCount = 4,
    sideL = 1
  ): VolumetricCell => {
    // base grid -> flat VolumetricCell
    const baseGridVertices: VolumetricVertex[][] = [];

    for (let i = 0; i < xCount + 1; i++) {
      const yArray: VolumetricVertex[] = [];
      const x = i * sideL;
      for (let j = 0; j < yCount + 1; j++) {
        const y = j * sideL;

        yArray.push(new VolumetricVertex(new Vector3(x, y, 0)));
      }

      baseGridVertices.push(yArray);
    }

    const faceGrid: VolumetricFace[][] = [];
    const faces: VolumetricFace[] = [];

    // constructing the edges
    for (let i = 0; i < xCount; i++) {
      const yFaceRow: VolumetricFace[] = [];
      for (let j = 0; j < yCount; j++) {
        const v00 = baseGridVertices[i][j];
        const v01 = baseGridVertices[i][j + 1];
        const v11 = baseGridVertices[i + 1][j + 1];
        const v10 = baseGridVertices[i + 1][j];

        const edge3 = new HalfEdge(v10); // left 3
        const edge2 = new HalfEdge(v11, edge3); // top 2
        const edge1 = new HalfEdge(v01, edge2); // right 1
        const edge0 = new HalfEdge(v00, edge1); // bottom 0
        edge3.setNext(edge0);

        const volumetricFace = new VolumetricFace([edge0, edge1, edge2, edge3]);
        faces.push(volumetricFace);

        yFaceRow.push(volumetricFace);
      }

      faceGrid.push(yFaceRow);
    }

    console.log(faceGrid);

    // connecting the edges
    // right to left
    for (let i = 1; i < xCount; i++) {
      for (let j = 0; j < yCount; j++) {
        const face0 = faceGrid[i - 1][j];
        const face1 = faceGrid[i][j];

        face0.edges[3].setPair(face1.edges[1]);
      }
    }

    // right to left
    for (let i = 0; i < xCount; i++) {
      for (let j = 1; j < yCount; j++) {
        const face0 = faceGrid[i][j - 1];
        const face1 = faceGrid[i][j];

        face0.edges[2].setPair(face1.edges[0]);
      }
    }

    return new VolumetricCell(faces);
  }
}

class VolumetricMesh {
  cells: VolumetricCell[];
  id: string;

  constructor(cells: VolumetricCell[]) {
    this.cells = cells;

    this.id = v4();
  }

  static simpleBoxModel = (xCount = 4, yCount = 4, zCount = 4, sideL = 1) => {
    // initialize a base grid of faces that we will then copy over a bunch of times

    const baseVolCellPlane = VolumetricCell.simplePlanarCell(
      xCount,
      yCount,
      sideL
    );

    // constructing one layer

    // constructing the cells

    // populating the mesh
  }
}
