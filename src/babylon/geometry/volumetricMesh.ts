import {
  Mesh,
  Scene,
  Vector3,
  VertexBuffer,
  VertexData,
} from '@babylonjs/core';
import { v4 } from 'uuid';
import { findAllChainsOfDualDegreeNodes, hEdgesToGraph } from './graphs';

type IVector = { x: number; y: number; z: number };

const toIVector = (v: Vector3): IVector => ({ x: v.x, y: v.y, z: v.z });

export class VolumetricVertex {
  position: Vector3;
  halfEdges: Set<HalfEdge>;
  id: string;
  private offspring?: VolumetricVertex;
  private linkedFaces: Set<VolumetricFace>;

  constructor(position: Vector3, halfEdges?: HalfEdge[]) {
    this.position = position;
    this.halfEdges = new Set<HalfEdge>();

    if (halfEdges) halfEdges.forEach((he) => this.halfEdges.add(he));

    this.linkedFaces = new Set();

    this.id = v4();
  }

  public addHalfEdge = (he: HalfEdge) => this.halfEdges.add(he);

  public removeHalfEdge = (he: HalfEdge) => this.halfEdges.delete(he);

  public asIVector = (): IVector => toIVector(this.position);

  public positionAsArray = (): [number, number, number] => [
    this.position.x,
    this.position.y,
    this.position.z,
  ];

  public getHalfEdges = (): HalfEdge[] => Array.from(this.halfEdges);

  public getFaces = (): VolumetricFace[] =>
    this.getHalfEdges().map((he) => he.face);

  public getNormal = (): Vector3 => {
    const normal = new Vector3(0, 0, 0);
    Array.from(this.linkedFaces.values()).forEach((f) =>
      normal.addInPlace(f.getNormal())
    );

    return normal.normalize();
  };

  public setOffspring(value: number) {
    this.offspring = new VolumetricVertex(
      this.position.add(this.getNormal().scale(value))
    );
  }

  public getOffspring(value?: number): VolumetricVertex {
    if (!this.offspring) this.setOffspring(value);
    return this.offspring;
  }

  public clearLinkedFaces = () =>
    (this.linkedFaces = new Set<VolumetricFace>());
  public addLinkedFace = (face: VolumetricFace) => this.linkedFaces.add(face);
}

export class HalfEdge {
  vertex: VolumetricVertex;
  face?: VolumetricFace;
  next: HalfEdge;
  opposite: HalfEdge;
  previous?: HalfEdge;
  id: string;
  private faceOffspring?: VolumetricFace;

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
  };

  public setVertex = (vertex: VolumetricVertex) => {
    if (this.vertex) this.vertex.removeHalfEdge(this);
    this.vertex = vertex;
    this.vertex.addHalfEdge(this);
  };

  public setPair = (other: HalfEdge) => {
    this.opposite = other;
    other.opposite = this;
  };

  public constructPair = () => {
    const opposite = new HalfEdge(this.getVertexPrevious());
    this.setPair(opposite);
    return opposite;
  };

  public setNext = (next: HalfEdge) => {
    this.next = next;
    next.previous = this;
  };

  public setFace = (face: VolumetricFace) => (this.face = face);

  public isNaked = (): boolean => this.opposite === undefined;

  public getVertex = (): VolumetricVertex => this.vertex;

  public getVertexPrevious = (): VolumetricVertex => this.previous.vertex;

  public asLine = () => {
    if (this.previous)
      return [this.previous.vertex.asIVector(), this.vertex.asIVector()];
    else console.warn('HalfEdge.asLine: no previous set');
  };

  /**
   * Method that returns a quad face extruded, using the offsprings of VolumetrixVertexes of the start and end point of the edge
   * should only be used when actually extruding all the edges of a face
   * returns VolumetricFace with 4 edges ordered like : [original, next, top, previous]
   */
  public getFaceOffspring = (): VolumetricFace => {
    if (!this.faceOffspring) {
      const nextTop = this.vertex.getOffspring();
      const previous = this.previous.vertex;
      const previousTop = this.previous.vertex.getOffspring();

      const previousE = new HalfEdge(previous, this);
      const topE = new HalfEdge(previousTop, previousE);
      const nextE = new HalfEdge(nextTop, topE);

      this.faceOffspring = new VolumetricFace([this, nextE, topE, previousE]);
    }

    return this.faceOffspring;
  };

  public static constructClosingFaceFromEdges = (
    hEdges: HalfEdge[],
    face?: VolumetricFace
  ) => {
    // assumes that the given edges form a ring

    // check whether the chains are closed & order them
    const { vertexMap, undirectedEdgesMap } = hEdgesToGraph(hEdges);
    const chains = findAllChainsOfDualDegreeNodes(undirectedEdgesMap);

    const newFaceEdges = hEdges.map((e) => e.constructPair());

    // assigning the vertices to one another
    // newFaceEdges.reverse();
    newFaceEdges.forEach((he, i) =>
      he.setNext(newFaceEdges[(i + 1) % newFaceEdges.length])
    );

    const newFace = face ?? new VolumetricFace([]);
    newFace.setEdges(newFaceEdges);

    return face;
  };
}

class VolumetricFace {
  edges: HalfEdge[];
  neighbour?: VolumetricFace;
  cell?: VolumetricCell;
  id: string;
  name?: string;

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
  };

  public isClosed = (): boolean => this.edges.every((edge) => edge.opposite);

  public getNakedEdges = (): HalfEdge[] =>
    this.edges.filter((edge) => edge.isNaked());

  public getCoveredEdges = (): HalfEdge[] =>
    this.edges.filter((edge) => !edge.isNaked());

  public getInteralNeighbours = (): VolumetricFace[] => {
    const internalNeighbours = [];

    this.edges.forEach((edge) => {
      if (!edge.isNaked()) internalNeighbours.push(edge.opposite.face);
    });

    return internalNeighbours;
  };

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

  public vertexPolygon = (): VolumetricVertex[] =>
    this.edges.map((edge) => edge.vertex);

  private idPolygon = (): string[] => this.vertexPolygon().map((v) => v.id);

  public getPolygon = (): IVector[] =>
    this.vertexPolygon().map((v) => v.asIVector());

  public getCenter = (): Vector3 => {
    let center = new Vector3(0, 0, 0);

    this.edges.forEach((edge) => (center = center.add(edge.vertex.position)));
    return center.scale(1 / this.edges.length);
  };

  public getNormal = (): Vector3 | undefined => {
    if (this.edges.length < 3) return;
    // if (!this.isClosed()) return;

    const edge0dir = this.edges[0].getDirectionVector();
    if (!edge0dir) return;
    for (let i = 0; i < this.edges.length; i++) {
      const edge1dir = this.edges[i].getDirectionVector();
      const normal = edge1dir.cross(edge0dir);
      if (normal.length() > 0.00001) return normal.normalizeToNew();
    }
  };

  public toTriangles = (): string[] => {
    if (this.edges.length === 3) return this.idPolygon();
    if (this.edges.length === 4) {
      const [a, b, c, d] = this.idPolygon();
      return [a, b, c, a, c, d];
    } else return [];
  };

  public extrudeFace = (height: number = 10) => {

    if (this.neighbour) return;
    this.vertexPolygon().forEach((v) => v.getOffspring(height));

    const newFaces = this.edges.map((edge) => edge.getFaceOffspring());
    newFaces.forEach((f, i) =>
      f.edges[1].setPair(newFaces[(i + 1) % newFaces.length].edges[3])
    );

    const topEdges = newFaces.map((f) => f.edges[2]);
    newFaces.push(HalfEdge.constructClosingFaceFromEdges(topEdges, this));

    return newFaces;
  };

  /**
   * method that expands a face into a cell
   * @param size
   * @param mesh
   * @returns
   */
  public toCell = (size: number, mesh?: VolumetricMesh): VolumetricCell => {
    // potential scenarios
    // 1. face creates a set of new faces -> extending the cell instead of creating an extra cell -> mutates the parent volumetric cell
    // 2. face creates a set of new faces -> and create a new cell -> returns a new cell, stores the cell in this one
    // Other function
    // 3. face creates a set of new faces -> and create a new cell for this one and all the other faces of the volumetric cell
    //    a. the volumetric cell is closed
    //    b. the volumetric cell is not closed

    // takes the faces halfedges

    // construct new vertices for every vertex related to these halfEdges
    // or constructs a bunch of vertices for the volumetric cell as a whole
    const newFaces: VolumetricFace[] = [];

    return new VolumetricCell(newFaces);
  };
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
  };

  public getCoveredEdges = (): HalfEdge[] => {
    const coveredEdges: HalfEdge[] = [];

    this.faces.forEach((face) => coveredEdges.push(...face.getCoveredEdges()));

    return coveredEdges;
  };

  public getPolygons = (): IVector[][] => {
    return this.faces.map((face) => face.getPolygon());
  };

  public getDualGraph = (): [VolumetricFace, VolumetricFace][] => {
    const facePairs: [VolumetricFace, VolumetricFace][] = [];
    const checkedEdges = new Set<HalfEdge>();

    this.faces.forEach((face) =>
      face.constructNeighbourMap(checkedEdges, facePairs)
    );

    return facePairs;
  };

  public getDualGraphAsLines = (): [IVector, IVector][] => {
    return this.getDualGraph().map((fs) => [
      toIVector(fs[0].getCenter()),
      toIVector(fs[1].getCenter()),
    ]);
  };

  public expand = (
    expansionL: number,
    withNeighbours = false
  ): VolumetricMesh => {
    return new VolumetricMesh(
      this.faces.map((face) => face.toCell(expansionL))
    );
  };

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
  };

  public getAllVertices = (): VolumetricVertex[] => {
    const vertices: Set<VolumetricVertex> = new Set();

    this.faces.forEach((face) =>
      face.vertexPolygon().forEach((v) => vertices.add(v))
    );

    return Array.from(vertices);
  };

  private applyNormalCalculation = () => {
    this.getAllVertices().forEach((v) => v.clearLinkedFaces());
    console.log(this.faces.map((f) => f.vertexPolygon()));
    this.faces.forEach((f) =>
      f.vertexPolygon().forEach((v) => v.addLinkedFace(f))
    );
  };

  public extrudeUpwards = (faceIndices?: number[], offspringHeight: number = 1) => {
    this.applyNormalCalculation();

    if (faceIndices && faceIndices.length > 0) {
      faceIndices.sort().reverse();

    faceIndices.forEach((i) => {
      this.faces.splice(i, 1, ...this.faces[i].extrudeFace(offspringHeight));
    });
    } else {
      this.faces = this.faces.map(f => f.extrudeFace(offspringHeight)).flat();
    }
  };

  public toVolumetricMesh = (layerSize: number[] = [1]): VolumetricMesh => {
    return new VolumetricMesh([]);
  };

  public babylonMesh = (scene: Scene) => {
    const vertexIdMap: { [key: string]: number } = {};
    const vertexGeometryArray: number[] = [];
    const faceVIds: number[] = [];

    this.getAllVertices().forEach((v, i) => {
      vertexIdMap[v.id] = i;
      vertexGeometryArray.push(...v.positionAsArray());
    });

    this.faces.forEach((face) =>
      faceVIds.push(...face.toTriangles().map((id) => vertexIdMap[id]))
    );

    const mesh = new Mesh('volMesh', scene);
    const vertexDate = new VertexData();

    vertexDate.positions = vertexGeometryArray;
    vertexDate.indices = faceVIds;

    vertexDate.applyToMesh(mesh);

    return mesh;
  };
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
  };
}
