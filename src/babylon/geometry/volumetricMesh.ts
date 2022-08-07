import { Mesh, Scene, Vector3, VertexData } from '@babylonjs/core';
import { v4 } from 'uuid';
import { catmullPolygonN } from '../../shapeGen/postProcessing';
import { findAllChainsOfDualDegreeNodes, hEdgesToGraph } from './graphs';
import { ParallelTransportMesh } from './parallelTransportFrames';

type IVector = { x: number; y: number; z: number };

const toIVector = (v: Vector3): IVector => ({ x: v.x, y: v.y, z: v.z });

export class VolumetricVertex {
  position: Vector3;
  halfEdge?: HalfEdge;
  id: string;
  private offspring?: VolumetricVertex;
  private linkedFaces: Set<VolumetricFace>;

  constructor(position: Vector3, halfEdge?: HalfEdge) {
    this.position = position;

    if (halfEdge) this.halfEdge = halfEdge;

    this.linkedFaces = new Set();

    this.id = v4();
  }

  public setHalfEdge = (he: HalfEdge) => this.halfEdge = he;
  public removeHalfEdge = () => this.halfEdge = undefined;

  public asIVector = (): IVector => toIVector(this.position);

  public positionAsArray = (): [number, number, number] => [
    this.position.x,
    this.position.y,
    this.position.z,
  ];

  public getHalfEdges = (): HalfEdge[] => {
    return this.halfEdge.getVertexEdges();
  }

  public getHalfFaces = (): VolumetricFace[] => {
    return this.halfEdge.getVertexFaces();
  }

  public getFaces = (): VolumetricFace[] =>
    this.getHalfEdges().map((he) => he.face);

  public getNormal = (): Vector3 => {
    const normal = new Vector3(0, 0, 0);
    this.getFaces().forEach((f) =>
      normal.addInPlace(f.getNormal())
    );

    console.log(this.getFaces().map(f => f.getNormal()));
    console.log(normal);
    console.log(normal.normalize());
    return normal.normalize();
  };

  public setOffspring(value: number) {
    this.offspring = new VolumetricVertex(
      this.position.add(this.getNormal().scale(value))
    );
  }

  public clearOffspring = () => (this.offspring = undefined);

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
  halfEdgePair: HalfEdge | undefined;
  halfFacePair: HalfEdge | undefined;
  previous?: HalfEdge;
  id: string;
  private faceOffspring?: VolumetricFace;

  constructor(vertex: VolumetricVertex, next?: HalfEdge, halfEdgePair?: HalfEdge, halfFacePair?: HalfEdge) {
    this.setVertex(vertex);

    if (next) this.setNext(next);
    if (halfEdgePair) this.halfEdgePair = halfEdgePair;
    if (halfFacePair) this.halfFacePair = halfFacePair;

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
    this.vertex = vertex;
    this.vertex.setHalfEdge(this);
  };

  public setPair = (other: HalfEdge) => {
    let previousOther: HalfEdge;
    if (this.halfEdgePair) previousOther = this.halfEdgePair;
    this.halfEdgePair = other;
    other.halfEdgePair = this;

    return previousOther;
  };

  public constructPair = () => {
    const halfEdgePair = new HalfEdge(this.getVertexPrevious());
    this.setPair(halfEdgePair);
    return halfEdgePair;
  };

  public setNext = (next: HalfEdge) => {
    this.next = next;
    next.previous = this;
  };

  public setFace = (face: VolumetricFace) => (this.face = face);

  public isNaked = (): boolean => this.halfEdgePair === undefined;

  public getVertex = (): VolumetricVertex => this.vertex;

  public getVertexPrevious = (): VolumetricVertex => this.previous.vertex;

  public asLine = () => {
    if (this.previous)
      return [this.previous.vertex.asIVector(), this.vertex.asIVector()];
    else console.warn('HalfEdge.asLine: no previous set');
  };

  public getChain = (): HalfEdge[] => {
    let current: HalfEdge = this;
    const hedges: HalfEdge[] = [this];

    while (this.next !== this) {
      hedges.push(this.next);
      current = this.next;
    }

    return hedges;
  }

  public getVertexEdges = (): HalfEdge[] => {
    const hedges: Set<HalfEdge> = new Set();
    let current: HalfEdge = this;

    // backwards
    while (current && !hedges.has(current)) {
      hedges.add(current);
      if (current.next.halfEdgePair) 
        current = current.next.halfEdgePair;
      else current = undefined;
    }

    console.log(hedges);

    return Array.from(hedges);
  }

  public getVertexFaces = (): VolumetricFace[] => {
    return this.getVertexEdges().map(v => v.face);
  }

  public getA = () =>
    this.vertex.position.add(
      this.next.vertex.position.subtract(this.vertex.position).scale(0.25)
    );

  public getB = () =>
    this.vertex.position.add(
      this.next.vertex.position.subtract(this.vertex.position).scale(0.75)
    );

  /**
   * Method that returns a quad face extruded, using the offsprings of VolumetrixVertexes of the start and end point of the edge
   * should only be used when actually extruding all the edges of a face
   * returns VolumetricFace with 4 edges ordered like : [original pair, next, top, previous]
   */
  public getFaceOffspring = (): VolumetricFace => {
    if (!this.faceOffspring) {
      const pair = new HalfEdge(this.previous.vertex, undefined, this);
      const previous = new HalfEdge(this.vertex, pair);
      const top = new HalfEdge(this.vertex.getOffspring(), previous);
      const next = new HalfEdge(this.previous.vertex.getOffspring(), top);
      pair.setNext(next)

      this.faceOffspring = new VolumetricFace([pair, next, top, previous]);
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
    newFaceEdges.reverse();
    HalfEdge.linkChain(newFaceEdges);
    
    const newFace = face ?? new VolumetricFace([]);
    newFace.setEdges(newFaceEdges);

    return newFace;
  };

  public static linkChain = (hEdges: HalfEdge[]) =>
    hEdges.forEach((he, i) => he.setNext(hEdges[(i + 1) % hEdges.length]));
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

  public getEdges = (): HalfEdge[] => {
    return this.edges;
  }

  public setNeigbour = (otherFace: VolumetricFace) => {
    this.neighbour = otherFace;
    otherFace.neighbour = this;
  };

  public isClosed = (): boolean => this.edges.every((edge) => edge.halfEdgePair);

  public getNakedEdges = (): HalfEdge[] =>
    this.edges.filter((edge) => edge.isNaked());

  public getCoveredEdges = (): HalfEdge[] =>
    this.edges.filter((edge) => !edge.isNaked());

  public getInteralNeighbours = (): VolumetricFace[] => {
    const internalNeighbours = [];

    this.edges.forEach((edge) => {
      if (!edge.isNaked()) internalNeighbours.push(edge.halfEdgePair.face);
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
        checkedEdges.add(edge.halfEdgePair);
        facePairs.push([this, edge.halfEdgePair.face]);
      }
    }
  }

  public vertexPolygon = (): VolumetricVertex[] =>
    this.edges.map((edge) => edge.vertex);

  private idPolygon = (): string[] => this.vertexPolygon().map((v) => v.id);

  public getPolygon = (): IVector[] =>
    catmullPolygonN(
      this.edges.map((he) => [he.getA(), he.getB()]).flat(),
      3
    ).map(toIVector);

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

  public extrudeFace = (
    height: number = 10,
    splitOffCell: boolean = false,
    linkFace: boolean = true
  ): VolumetricFace[] => {
    if (this.neighbour) return;
    this.vertexPolygon().forEach((v) => v.getOffspring(height));

    const newFaces = this.getEdges().map((edge) => edge.getFaceOffspring());
    newFaces.forEach((f, i) =>
      f.edges[3].setPair(newFaces[(i + 1) % newFaces.length].edges[1])
    );

    if (splitOffCell) {
      const topFace = HalfEdge.constructClosingFaceFromEdges(newFaces.map((f) => f.edges[2]));
      const bottomFace = HalfEdge.constructClosingFaceFromEdges(newFaces.map((f) => f.edges[0]).reverse());

      console.log(bottomFace.edges.every((he, i) => [...this.getEdges()][i].getVertex() === he.getVertex()));

      if (linkFace) bottomFace.edges.forEach((he, i) => he.setPair(this.getEdges()[i]));

      newFaces.push(...[topFace, bottomFace]);
    } else {
      newFaces.push(
        HalfEdge.constructClosingFaceFromEdges(
          newFaces.map((f) => f.edges[2]),
          this
        )
      );
    }

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
        const edge2 = new HalfEdge(v11); // top 2
        const edge1 = new HalfEdge(v01); // right 1
        const edge0 = new HalfEdge(v00); // bottom 0
        const edgeChain = [edge0, edge1, edge2, edge3];
        HalfEdge.linkChain(edgeChain);

        const volumetricFace = new VolumetricFace(edgeChain);
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

  private generateOffsprings = (h: number) =>
    this.getAllVertices().forEach((v) => v.getOffspring(h));

  public extrudeUpwards = (
    faceIndices?: number[],
    offspringHeight: number = 1,
    splitOffCell: boolean = false,
    linkFaces: boolean = true
  ): VolumetricCell[] => {
    this.generateOffsprings(offspringHeight);

    const newCells: VolumetricCell[] = [this];

    if (faceIndices && faceIndices.length > 0) {
      faceIndices.sort().reverse();

      faceIndices.forEach((i) => {
        const newFaces = this.faces[i].extrudeFace(
          offspringHeight,
          splitOffCell,
          linkFaces
        );
        if (splitOffCell) newCells.push(new VolumetricCell(newFaces));
        else this.faces.splice(i, 1, ...newFaces);
      });
    } else {
      if (splitOffCell)
        this.faces.forEach((f) =>
          newCells.push(
            new VolumetricCell(
              f.extrudeFace(offspringHeight, splitOffCell, linkFaces)
            )
          )
        );
      else
        this.faces = this.faces
          .map((f) => f.extrudeFace(offspringHeight, splitOffCell, linkFaces))
          .flat();
    }

    return newCells;
  };

  public toVolumetricMesh = (layerSize: number[] = [1]): VolumetricMesh => {
    return new VolumetricMesh([this]);
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

export class VolumetricMesh {
  cells: VolumetricCell[];
  id: string;

  constructor(cells: VolumetricCell[]) {
    this.cells = cells;

    this.id = v4();
  }

  public getNakedEdges = () => this.cells.map((c) => c.getNakedEdges()).flat();

  public getDualGraphAsLines = () =>
    this.cells.map((c) => c.getDualGraphAsLines()).flat();

  public getPolygons = () => this.cells.map((c) => c.getPolygons()).flat();

  public edgeMeshes = (scene, material) =>
    this.getPolygons().forEach(
      (vs) =>
        new ParallelTransportMesh(
          [
            ...vs.map((v) => new Vector3(v.x, v.y, v.z)),
            new Vector3(vs[0].x, vs[0].y, vs[0].z),
          ],
          0.05,
          20,
          material,
          2.5,
          scene
        )
    );

  static voxel = (size: number) => {
    // create one face
    const simpleCell = VolumetricCell.simplePlanarCell(1, 1, size);
    const voxelCell = simpleCell.extrudeUpwards([], size, true, false)[1];

    voxelCell.getAllVertices().forEach((v) => v.clearOffspring());
    return voxelCell;
  };

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
