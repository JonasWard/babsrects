import { Vector3 } from "@babylonjs/core";

export function createDirectedCurve(startPoint: Vector3, startDirectionAngles: {alpha: number, beta: number, gamma: number}, segLength, alphaDelta, segDelta, segCount) {
    const curvePoints = [];
    let previousPoint = startPoint;

    let {alpha, beta, gamma} = startDirectionAngles;

    for (let i = 0; i < segCount; i++) {
        const x = -Math.cos(alpha) * Math.sin(beta) * Math.sin(gamma)-Math.sin(alpha) * Math.cos(gamma)
        const y = -Math.sin(alpha) * Math.sin(beta) * Math.sin(gamma)+Math.cos(alpha) * Math.cos(gamma)
        const z =  Math.cos(beta) * Math.sin(gamma)

        alpha += Math.random() * alphaDelta;
        beta += Math.random() * alphaDelta;
        gamma += Math.random() * alphaDelta;

        const point = new Vector3(x, y, z).scale(segLength + (Math.random() - .5) * segDelta);

        const nPoint = point.add(previousPoint);
        curvePoints.push(point.add(nPoint));
        previousPoint = nPoint;
    }

    return curvePoints;
}