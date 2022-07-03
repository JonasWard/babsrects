import { Vector2, Vector3 } from '@babylonjs/core';

type HashDict = { [cellID: string]: Vector2[] };
type Interval = { min: number; max: number };

const ASCII_INTERVAL = { min: 32, max: 126 };

const distance = (v1: Vector2, v2: Vector2): number => {
  return v2.subtract(v1).length();
};

const midPoint = (v1: Vector2, v2: Vector2): Vector2 => {
  return v1.add(v2).scale(0.5);
};

const coordinateGrounding = (v: Vector2, gridFraction: number): string => {
  return (
    (v.x * gridFraction).toPrecision(1) +
    '-' +
    (v.y * gridFraction).toPrecision(1)
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
  repulsionStrength: number;
  attractionStrength: number;
  repulsionRadius: number;
  attractionRadius: number;
  splitDistance: number;
  jiggleRadius: number;
  smoothingValue: number;
  randomInsertionRate: number;
  reupulsionThreshold: number = 10;

  iteration: number = 0;
  distanceMap: Map<Vector2, Vector2[]> = new Map();

  constructor(
    vs: Vector2[],
    repulsion: number,
    attraction: number,
    repulsionRadius: number,
    attractionRadius: number,
    jiggleRadius: number,
    smoothingValue: number,
    randomInsertionRate: number
  ) {
    this.vs = vs;
    this.repulsionStrength = repulsion;
    this.attractionStrength = attraction;
    this.repulsionRadius = repulsionRadius;
    this.attractionRadius = attractionRadius;
    this.splitDistance = attractionRadius * 2;
    this.jiggleRadius = jiggleRadius;
    this.smoothingValue = smoothingValue;
    this.randomInsertionRate = randomInsertionRate;
  }

  public jiggle = () => {
    this.vs = this.vs.map((v) => {
      const alpha = Math.random() * Math.PI * 2;
      const r = Math.random() * this.jiggleRadius;

      return v.add(new Vector2(r * Math.cos(alpha), r * Math.sin(alpha)));
    });
  };

  public randomInsert = () => {
    const newVs: Vector2[] = [];
    this.vs.forEach((v, i) => {
      newVs.push(v);
      if (
        Math.random() > this.randomInsertionRate &&
        this.distanceMap.get(v).length < this.reupulsionThreshold
      ) {
        const n = this.vs[(i + 1) % this.vs.length];
        newVs.push(v.add(n).scale(0.5));
      }
    });
    this.vs = newVs;
  };

  public distanceFunction = (v: Vector2, z?: number): number => {
    return 1;
  };

  public smoothing = () => {
    this.vs = this.vs.map((v, i) => {
      const p = this.vs[(i - 1) % this.vs.length];
      const n = this.vs[(i + 1) % this.vs.length];

      const vm = v.add(p).scale(0.5).subtract(v);
      return v.add(vm.scale(this.smoothingValue));
    });
  };

  public split = () => {
    const newVs: Vector2[] = [];
    this.vs.forEach((v, i) => {
      const n = this.vs[(i + 1) % this.vs.length];

      newVs.push(v);
      if (distance(v, n) > this.splitDistance) newVs.push(midPoint(v, n));
    });
    this.vs = newVs;
  };

  public repulsion = (boundary: Vector2[]) => {
    const vectorMap = hashDistance(this.vs, this.repulsionRadius);
    const repVPairs: [Vector2, Vector2][] = [];

    Object.values(vectorMap).forEach((vectors) => {
      const oVs = getNeighbours(vectorMap, vectors[0], this.repulsionRadius);

      vectors.forEach((v) => {
        const mV = new Vector2(0, 0);
        oVs.forEach((oV) => {
          const d = v.subtract(oV).length();
          if (d < this.repulsionRadius && oV !== v) {
            const sc =
              this.repulsionStrength * (1 - d / this.repulsionRadius) ** 2;
            const locMv = oV.subtract(v).scale(sc);
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
      const p = this.vs[(i - 1) % this.vs.length];
      const n = this.vs[(i + 1) % this.vs.length];

      const localAR = this.attractionRadius * this.distanceFunction(v);

      const pv = p.subtract(v);
      const vm = pv.scale(this.attractionStrength * localAR);
      const nv = p.subtract(v);
      vm.addInPlace(nv.scale(this.attractionStrength * localAR));

      return v.add(vm);
    });
  };

  public grow = (boundary: Vector2[]) => {
    this.split();
    this.attraction();
    this.repulsion(boundary);
    this.randomInsert();
    this.jiggle();
    this.smoothing();

    this.iteration += 1;
  };

  public asPolygon = (h: number = 0) => {
    this.vs.map((v) => new Vector3(v.x, v.y, h));
  };

  public toString = () => {
    return `GrowingCurve with ${this.vs.length} Vertexes, grown ${this.iteration} times`;
  };
}
