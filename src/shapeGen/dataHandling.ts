import * as bspline from 'b-spline';

const dnumberRemapping = (data: number[], min: number, max: number) => {
  const delta = max - min;

  const dataMin = data.reduce((min, v) => (min < v ? min : v), Infinity);
  const dataMax = data.reduce((max, v) => (max > v ? max : v), -Infinity);

  const multiplier = delta / (dataMax - dataMin);
  return data.map((v) => (v - dataMin) * multiplier + min);
};

const laplacianSmoothing = (data: number[], neighbourCount: number) => {
  if (neighbourCount < 1) return data;
  const finalIndex = data.length - 1;
  return data.map((v, i, arr) => {
    let start = i - neighbourCount;
    let end = i + neighbourCount;
    start = start < 0 ? 0 : start;
    end = end > finalIndex ? finalIndex : end;

    const count = end - start;
    let newV = 0;
    for (let j = start; j < end; j++) newV += arr[j];
    return newV / count;
  });
};

const bezierSampling = (z: number, zDomain: [number, number]): number => {
  if (z > zDomain[1]) console.log(z);

  // quadratic bezier
  const vs = [[0.8], [0.9], [1], [0.9], [0.7], [0.4], [0.4], [0.2]];
  const t = (z - zDomain[0]) / (zDomain[1] - zDomain[0]);

  return bspline(t, 2, vs)[0];
};
