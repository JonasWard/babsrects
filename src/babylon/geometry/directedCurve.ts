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

export function createHelixicalCurve(startPoint: Vector3, amplitude: number, periodLength: number, resolution: number, count) {
    const curvePoints = [];

    const alphaDelta = Math.PI * resolution;
    const yStep = periodLength / Math.PI * resolution;
    let alpha = 0.;

    for (let i = 0; i < count; i++) {
        curvePoints.push(new Vector3(
            startPoint.x + amplitude * Math.sin(alpha),
            startPoint.y + yStep * i,
            startPoint.z + amplitude * Math.cos(alpha)
        ));

        alpha += alphaDelta;
    };

    return curvePoints;
} 

export function createSinoidCurve(startPoint: Vector3, amplitude: number, periodLength: number, resolution: number, count) {
    const curvePoints = [];

    const alphaDelta = Math.PI * resolution;
    const yStep = periodLength / Math.PI * resolution;
    let alpha = 0.;

    for (let i = 0; i < count; i++) {
        curvePoints.push(new Vector3(
            startPoint.x + amplitude * Math.sin(alpha),
            0.,
            startPoint.y + yStep * i,
        ));

        alpha += alphaDelta;
    };

    return curvePoints;
}

export function createCurveSet(startPoint: Vector3, movementDirection: Vector3, step: number = 1., count: number = 100) {
    const curvePoints = [];
    
    for (let i = 0; i < count; i++) {
        curvePoints.push(startPoint.add(movementDirection.scale(i * step)));
    }

    return curvePoints;
}

export const createCircle = (center: Vector3 = new Vector3(0,0,0), radius: number = 5., divisions: number = 100): Vector3[] => {
    const curvePoints = [];
    const angleDelta = Math.PI * 2. / divisions;
    
    for (let i = 0; i < divisions + 1; i++) {
        const angle = angleDelta * i;
        curvePoints.push(center.add(new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)));
    }

    return curvePoints;
}