import { Vector3 } from "@babylonjs/core";
import { VolumetricCell } from './volumetricMesh';

const rotateVector = (v: Vector3, a: number) => new Vector3(v.x * Math.cos(a) - v.y * Math.sin(a), v.x * Math.sin(a) + v.y * Math.cos(a), v.z)

export const profile = (l: number, r: number, spacing: number = 5., h = 0.) => {
    const vDiv = Math.max(Math.round(l / spacing), 1.);
    const aDiv = Math.max(Math.round(r * Math.PI * .5 / spacing), 1);

    const vDelta = l / vDiv;
    const aDelta = Math.PI * .5 / aDiv;
    const hVec = new Vector3(0,0,h);
    const vVec = new Vector3(vDelta, 0,0,);

    const cPtA = new Vector3(-l * .5, 0,);
    const cPtB = new Vector3(l * .5, 0,);

    const dirX = new Vector3(r, 0, 0);
    const dirY = new Vector3(0, r, 0);
    
    const pts = [cPtB.add(dirX).add(hVec)];

    for (let i = 0; i < aDiv; i++) {
        const pt = pts[pts.length - 1].subtract(cPtB);
        pts.push(rotateVector(pt, aDelta).add(cPtB));
    }

    for (let i = 0; i < vDiv; i++) {
        const pt = pts[pts.length - 1];
        pts.push(pt.subtract(vVec))
    }

    for (let i = 0; i < aDiv * 2; i++) {
        const pt = pts[pts.length - 1].subtract(cPtA);
        pts.push(rotateVector(pt, aDelta).add(cPtA));
    }

    for (let i = 0; i < vDiv; i++) {
        const pt = pts[pts.length - 1];
        pts.push(pt.add(vVec))
    }

    for (let i = 0; i < aDiv; i++) {
        const pt = pts[pts.length - 1].subtract(cPtB);
        pts.push(rotateVector(pt, aDelta).add(cPtB));
    }

    return pts;
}