import {
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
} from '@babylonjs/core';
import { NormalMaterial } from '@babylonjs/materials';
import { ParallelTransportMesh } from './parallelTransportFrames';
import { offsetPolyline, offsetSimpleValue } from './postProcessing';

type HashDict = { [cellID: string]: Vector2[] };
export type GrowthEdge = [Vector2, Vector2]

type GrowthInput = {
  vs: Vector2[];
  edges?: GrowthEdge[];
  repulsion?: number;
  attraction?: number;
  repulsionRadius?: number;
  attractionRadius?: number;
  jiggleRadius?: number;
  smoothingValue?: number;
  randomInsertionRate?: number;
};

const RANGE_OFFSET = 1000;

const distance = (v1: Vector2, v2: Vector2): number => {
  return v2.subtract(v1).length();
};

const midPoint = (v1: Vector2, v2: Vector2): Vector2 => {
  return v1.add(v2).scale(0.5);
};

const interpolations = (
  v1: Vector2,
  v2: Vector2,
  goalDistance: number
): Vector2[] => {
  const dir = v2.subtract(v1);
  const distance = dir.length();
  const numInterpolations = Math.floor(distance / goalDistance);
  const step = dir.scale(1 / numInterpolations);
  const pts = [];
  for (let i = 1; i < numInterpolations; i++) {
    pts.push(v1.add(step.scale(i)));
  }

  return pts;
};

const coordinateGrounding = (v: Vector2, gridFraction: number): string => {
  return (
    (RANGE_OFFSET + v.x * gridFraction).toFixed() +
    '-' +
    (RANGE_OFFSET + v.y * gridFraction).toFixed()
  );
};

const hashDistance = (vs: Vector2[], gridSpacing: number): HashDict => {
  const vectorMap: HashDict = {};

  const gridFraction = 1 / gridSpacing;

  vs.forEach((v) => {
    const key = coordinateGrounding(v, gridFraction);
    if (!vectorMap[key]) {
      vectorMap[key] = [];
    }
    vectorMap[key].push(v);
  });

  return vectorMap;
};

const _getNeighbourhoodOffsets = (gridSpacing: number): Vector2[] => {
  const offsets: Vector2[] = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      offsets.push(new Vector2(i * gridSpacing, j * gridSpacing));
    }
  }

  return offsets;
};

const getNeighbours = (
  vectorMap: HashDict,
  v: Vector2,
  gridSpacing: number
): Vector2[] => {
  const vectors: Vector2[] = [];
  const gridFraction = 1 / gridSpacing;

  _getNeighbourhoodOffsets(gridSpacing).forEach((offset) => {
    const key = coordinateGrounding(v.add(offset), gridFraction);
    if (vectorMap[key]) vectors.push(...vectorMap[key]);
  });

  return vectors;
};

export class Growth {
  vs: Vector2[];
  edges: GrowthEdge[];
  repulsionStrength: number;
  attractionStrength: number;
  repulsionRadius: number;
  attractionRadius: number;
  splitDistance: number;
  jiggleRadius: number;
  smoothingValue: number;
  randomInsertionRate: number;
  postProcessing: (v: Vector2, h: number, hIndex: number) => number = offsetSimpleValue;

  static repulsionMaximumThreshold: number = 45;
  static repulsionMinimumThreshold: number = 20;

  hashDict: HashDict;
  hashDictBoundary: HashDict;
  h: number = 0;

  iteration: number = 0;
  splitCount: number = 0;
  insertionCount: number = 0;

  static DEFAULT: GrowthInput = {
    vs: [],
    edges: undefined,
    repulsion: 0.75,
    attraction: 0.55,
    repulsionRadius: 60.,
    attractionRadius: 90.,
    jiggleRadius: 0.01,
    smoothingValue: .75,
    randomInsertionRate: 0.001,
  };

  constructor(input: GrowthInput) {
    const {
      vs,
      edges,
      repulsion,
      attraction,
      repulsionRadius,
      attractionRadius,
      jiggleRadius,
      smoothingValue,
      randomInsertionRate,
    } = input;

    this.vs = vs;
    this.edges = edges ? edges : vs.map((v, i) => [v, vs[(i+1)%vs.length]]);
    this.repulsionStrength = repulsion ?? Growth.DEFAULT.repulsion;
    this.attractionStrength = attraction ?? Growth.DEFAULT.attraction;
    this.repulsionRadius = repulsionRadius ?? Growth.DEFAULT.repulsionRadius;
    this.attractionRadius = attractionRadius ?? Growth.DEFAULT.attractionRadius;
    this.splitDistance =
      attractionRadius * 2 ?? Growth.DEFAULT.attractionRadius * 2;
    this.jiggleRadius = jiggleRadius ?? Growth.DEFAULT.jiggleRadius;
    this.smoothingValue = smoothingValue ?? Growth.DEFAULT.smoothingValue;
    this.randomInsertionRate =
      randomInsertionRate ?? Growth.DEFAULT.randomInsertionRate;
  }

  public jiggle = () => {
    this.vs.forEach((v) => {
      const alpha = Math.random() * Math.PI * 2;
      const r = Math.random() * this.jiggleRadius;
      v.addInPlace(new Vector2(r * Math.cos(alpha), r * Math.sin(alpha)));
    });
  };

  public randomInsert = () => {
    const newEdges: GrowthEdge[] = [];

    let notInsert = 0;

    this.edges.forEach(e =>{
      const [e0, e1] = e;
      const neighbourhoudCount = getNeighbours(
        this.hashDict,
        e0,
        this.repulsionRadius
      ).length;

      const boundaryCount = getNeighbours(
        this.hashDictBoundary,
        e0,
        this.repulsionRadius
      ).length;

      const neighbourCountAllows =
        neighbourhoudCount + boundaryCount < Growth.repulsionMaximumThreshold;
      const neigbourCountForces =
        neighbourhoudCount + boundaryCount < Growth.repulsionMinimumThreshold * this.distanceFunction(e0);

      const shouldInsert = Math.random() < this.randomInsertionRate;
      if (neighbourCountAllows && (neigbourCountForces || shouldInsert)) {
        const eM = midPoint(e0, e1);
        this.vs.push(eM);
        newEdges.push([e0, eM]);
        newEdges.push([eM, e1]);
        this.insertionCount++;
      } else {
        if (shouldInsert) notInsert++;
        newEdges.push(e);
      }
    });
    this.edges = newEdges;
    // console.log(`amount of times notInsert:   ${notInsert}`);
  };

  public distanceFunction = (v: Vector2): number => {
    return 1.;
    // return Math.min(0, 1. + .5 * sdGyroid(new Vector3(v.x, v.y, this.h), sdGyroid(new Vector3(v.x, v.y, this.h), .01)));
  };

  public smoothing = () => {
    this.vs = this.vs.map((v, i) => {
      const p = this.vs[(i + this.vs.length - 1) % this.vs.length];
      const n = this.vs[(i + 1) % this.vs.length];

      const vm = midPoint(n, p).subtract(v);
      return v.add(vm.scale(this.smoothingValue));
    });
  };

  public split = () => {
    const newEdges: GrowthEdge[] = [];
    this.edges.forEach(e => {
      const [e0, e1] = e;

      if (distance(e0, e1) > this.splitDistance) {
        const newVs = interpolations(e0, e1, this.attractionRadius)
        const allVs = [e0, ...newVs, e1];
        this.vs.push(...newVs);

        for (let i = 0; i < allVs.length - 1; i ++) newEdges.push([allVs[i], allVs[i+1]]);

        this.splitCount++;
      } else newEdges.push(e)
    });
    this.edges = newEdges;
  };

  public repulsion = () => {
    const repVPairs: [Vector2, Vector2][] = [];

    Object.values(this.hashDict).forEach((vectors) => {
      const oVs = getNeighbours(
        this.hashDict,
        vectors[0],
        this.repulsionRadius
      );

      const boundaryoVs = getNeighbours(
        this.hashDictBoundary,
        vectors[0],
        this.repulsionRadius
      );

      vectors.forEach((v) => {
        const mV = new Vector2(0, 0);
        oVs.forEach((oV) => {
          const oMv = v.subtract(oV);
          const d = oMv.length();
          if (d < this.repulsionRadius && oV !== v) {
            const sc =
              this.repulsionStrength * (1 - d / this.repulsionRadius) ** 2;
            const locMv = oMv.normalize().scale(sc);
            mV.addInPlace(locMv);
          }
        });

        boundaryoVs.forEach((oV) => {
          const oMv = v.subtract(oV);
          const d = oMv.length();
          if (d < this.repulsionRadius && oV !== v) {
            const sc =
              this.repulsionStrength * 10. * (1 - d / this.repulsionRadius) ** 2;
            const locMv = oMv.normalize().scale(sc);
            mV.addInPlace(locMv);
          }
        });

        repVPairs.push([v, mV]);
      });
    });

    repVPairs.forEach(([v, mV]) => {
      v.addInPlace(mV);
    });
  };

  public attraction = () => {
    return this.vs.map((v, i) => {
      const p = this.vs[(i + this.vs.length - 1) % this.vs.length];
      const n = this.vs[(i + 1) % this.vs.length];

      const localAR = this.attractionRadius * this.distanceFunction(v);

      const pv = p.subtract(v);
      const vm = pv.scale(this.attractionStrength * localAR);
      const nv = p.subtract(v);
      vm.addInPlace(nv.scale(this.attractionStrength * localAR));

      return v.add(vm);
    });
  };

  public grow = (boundary: Vector2[], h?: number) => {
    this.hashDict = hashDistance(this.vs, this.repulsionRadius);
    this.hashDictBoundary = hashDistance(boundary, this.repulsionRadius);
    if (h) this.h = h;

    this.split();
    this.attraction();
    this.repulsion();
    this.randomInsert();
    // this.jiggle();
    this.smoothing();

    this.iteration += 1;
  };

  private postProcessResult = (h: number, hIndex: number) => offsetPolyline(this.vs, h, hIndex, this.postProcessing);

  public asPolygon = (h: number = 0, withPostProcessing: boolean = false, hIndex: number) => {
    if (withPostProcessing) return this.postProcessResult(h, hIndex).map((v) => new Vector3(v.x, v.y, h));

    return this.vs.map((v) => new Vector3(v.x, v.y, h));
  };

  public asPipe = (
    h: number = 0,
    radius: number = 1.5,
    material: ShaderMaterial,
    scene: Scene,
    vCount: number = 15,
    uCount: number = 2.5,
    withPostProcessing: boolean = true,
    hIndex: number = 0
  ) => {
    const parallelTransportMesh = new ParallelTransportMesh(
      this.asPolygon(h, withPostProcessing, hIndex),
      radius,
      vCount,
      new NormalMaterial('normalMaterial', scene),
      uCount,
      scene
    );
  };

  public toString = () => {
    return `GrowingCurve with ${this.vs.length} Vertexes, grown ${this.iteration} times, split ${this.splitCount} times, inserted ${this.insertionCount} times`;
  };
}
