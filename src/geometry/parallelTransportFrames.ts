import { Buffer, Mesh, Scene, ShaderMaterial, Vector2, Vector3, VertexData } from "@babylonjs/core";

export class ParallelTransportMesh extends Mesh {

    constructor(curvePoints: Vector3[], radius = 1.5, divisions: number, material: ShaderMaterial | undefined, scene: Scene) {
        super("parallelTransportMesh", scene);

        const {positions, uvs, directions, directionA, directionB, patternUV, previousPosition, previousUVPattern, previousDirection, nextPosition, nextUVPattern, nextDirection} = this._constructPositions(curvePoints, radius, divisions);
        const indices = this._indices(divisions, curvePoints.length);

        const vertexData = new VertexData();

        vertexData.positions = positions;
        vertexData.uvs = uvs;
        vertexData.indices = indices;
        vertexData.normals = directions;

        vertexData.applyToMesh(this);

        const deformRefBufferA = new Buffer(scene.getEngine(), directionA, false, 3);
        this.setVerticesBuffer(deformRefBufferA.createVertexBuffer("directionA", 0, 3));

        const deformRefBufferB = new Buffer(scene.getEngine(), directionB, false, 3);
        this.setVerticesBuffer(deformRefBufferB.createVertexBuffer("directionB", 0, 3));

        const patterUVBuffer = new Buffer(scene.getEngine(), patternUV, false, 2);
        this.setVerticesBuffer(patterUVBuffer.createVertexBuffer("patternUV", 0, 2));

        const previousPositionBuffer = new Buffer(scene.getEngine(), directionA, false, 3);
        this.setVerticesBuffer(deformRefBufferA.createVertexBuffer("previousPosition", 0, 3));

        const previousDirectionBuffer = new Buffer(scene.getEngine(), directionA, false, 3);
        this.setVerticesBuffer(deformRefBufferA.createVertexBuffer("previousDirection", 0, 3));

        const previousUVPatternBuffer = new Buffer(scene.getEngine(), patternUV, false, 2);
        this.setVerticesBuffer(patterUVBuffer.createVertexBuffer("previousPatternUV", 0, 2));

        const nextPositionBuffer = new Buffer(scene.getEngine(), directionA, false, 3);
        this.setVerticesBuffer(deformRefBufferA.createVertexBuffer("nextPosition", 0, 3));

        const nextDirectionBuffer = new Buffer(scene.getEngine(), directionA, false, 3);
        this.setVerticesBuffer(deformRefBufferA.createVertexBuffer("nextDirection", 0, 3));

        const nextUVPatternBuffer = new Buffer(scene.getEngine(), patternUV, false, 2);
        this.setVerticesBuffer(patterUVBuffer.createVertexBuffer("nextPatternUV", 0, 2));

        if (material) {
            this.material = material;
        }   
    }

    _indices(divisions: number, n: number) {
        const indices: number[] = [];

        for (let i = 0; i < n - 1; i++) {
            const iA = i * divisions;
            const iB = (i + 1) * divisions;
            for (let j = 0; j < divisions; j++) {
                const first = iA + j;
                const second = iA + (j + 1) % divisions;
                const third = iB + j;
                const fourth = iB + (j + 1) % divisions;
                indices.push(first, second, third, second, fourth, third);
            }
        }

        return indices;
    }

    _isClosed(curvePoints: Vector3[]): boolean {
        // checking whether the polygon is closed
        return Vector3.DistanceSquared(curvePoints[0], (curvePoints[curvePoints.length - 1])) < 1e-6;
    }

    _constructPositions(curvePoints: Vector3[], radius = 1., divisions = 8, uvScale = 2.) {
        const frames = this._constructFrames(curvePoints);

        // console.log(frames.map(f => f.length))

        const ns = [];
        const bns = [];
        const vs = [];

        const alphaDelta = 2 * Math.PI / divisions;
        const vDelta = uvScale / divisions;
        const uDelta = uvScale / ( 2.0 * Math.PI * radius);

        for (let i = 0; i < divisions; i++) {
            const alpha = i * alphaDelta;
            ns.push(Math.cos(alpha));
            bns.push(Math.sin(alpha));
            vs.push(i * vDelta);
        }

        const directionA = [];
        const directionB = []
        const positions = [];
        const uvs = [];
        const directions = [];
        const patternUV = [];

        const previousStartVector = frames[0].position.add(frames[0].position.subtract(frames[1].position).normalizeToNew());
        const previousPosition = [];
        const previousUVPattern = [];
        const previousDirection = [];

        const nextEndVector = frames[frames.length - 1].position.add(frames[frames.length - 1].position.subtract(frames[frames.length - 2].position).normalizeToNew());
        const nextPosition = [];
        const nextUVPattern = [];
        const nextDirection = [];

        frames.forEach((frame, index) => {
            const {normal, biNormal, length, position} = frame;

            const u = length * uDelta;
            const vPattern = position.y * uDelta;

            const localPreviousPosition = index > 0 ? frames[index - 1].position : previousStartVector;
            const localPreviousDirection = index > 0 ? frames[index - 1].normal : frames[0].normal;
            const localPreviousUVPatternVector = index > 0 ? new Vector2(frames[index - 1].length * uDelta, frames[index - 1].position.y * uDelta): new Vector2(frames[0].length * uDelta, frames[0].position.y * uDelta);
            
            const localNextPosition = index < frames.length - 1 ? frames[index + 1].position : nextEndVector;
            const localNextDirection = index < frames.length - 1 ? frames[index + 1].normal : frames[frames.length - 1].normal;
            const localNextUVPatternVector = index < frames.length - 1 ? new Vector2(frames[index + 1].length * uDelta, frames[index + 1].position.y * uDelta): new Vector2(frames[frames.length - 1].length * uDelta, frames[frames.length - 1].position.y * uDelta);

            for (let i = 0; i < divisions; i++) {
                directionA.push(...normal.asArray());
                directionB.push(...biNormal.asArray());

                const nM = normal.scale(ns[i]);
                const bNM = biNormal.scale(bns[i]);
                const d = nM.add(bNM);
                const p = position.add(d.scale(radius));
                const v = vs[i];
                
                patternUV.push(u, vPattern);
                positions.push(...p.asArray());
                uvs.push(u, v);
                directions.push(...d.asArray());

                previousPosition.push(...localPreviousPosition.asArray());
                previousUVPattern.push(...localPreviousDirection.asArray());
                previousDirection.push(...localPreviousUVPatternVector.asArray());

                nextPosition.push(...localNextPosition.asArray());
                nextUVPattern.push(...localNextDirection.asArray());
                nextDirection.push(...localNextUVPatternVector.asArray());
            }
        });

        return {positions, uvs, directions, directionA, directionB, patternUV, previousPosition, previousUVPattern, previousDirection, nextPosition, nextUVPattern, nextDirection};
    }

    _constructRawTangents(curvePoints: Vector3[], isClosed = false): Vector3[] {
        const rawTangents = [];

        for (let i = 0; i < curvePoints.length - 1; i++) {
            rawTangents.push(curvePoints[i + 1].subtract(curvePoints[i]).normalize());
        }

        if (isClosed) {
            rawTangents.push(rawTangents[0].clone());
        } else {
            rawTangents.push(rawTangents[rawTangents.length-1].clone());
        }

        return rawTangents;
    }

    __tangentAndLength(t0: Vector3, t1: Vector3) {
        const t = t0.scale(.5).add(t1.scale(.5));
        const l = t0.length();

        if (l < 1e-6) {
            // case that two tangents are anti-parallel
            return {t: t1, l: 1.0};
        }

        return {t: t.normalize(), l: 1. / l};
    }

    _constructLocalTangents(rawTangents: Vector3[], isClosed = false) {
        const tangents = [];
        const widthScales = [];

        if (isClosed) {
            const {t, l} = this.__tangentAndLength(rawTangents[rawTangents.length - 1], rawTangents[0]);
            tangents.push(t);
            widthScales.push(l);
        } else {
            tangents.push(rawTangents[0]);
            widthScales.push(1.0);
        }

        for (let i = 0; i < rawTangents.length - 1; i++) {
            const {t, l} = this.__tangentAndLength(rawTangents[i], rawTangents[i + 1]);
            tangents.push(t);
            widthScales.push(l);
        }

        return { tangents, widthScales };
    }

    _constructFrames(curvePoints: Vector3[]) {
        const isClosed = this._isClosed(curvePoints);

        // construct tangents
        const rawTangents = this._constructRawTangents(curvePoints, isClosed);
        const {tangents, widthScales} = this._constructLocalTangents(rawTangents, isClosed);

        // construct frames
        let previousN = this.__firstNormal(tangents[0]);
        let previousL = 0.;

        const frames: {normal: Vector3, biNormal: Vector3, tangent: Vector3, width: number, length: number, position: Vector3}[] = []
        frames.push({
            position: curvePoints[0],
            normal: previousN,
            biNormal: previousN.cross(tangents[0]).normalize(),
            tangent: tangents[0],
            width: widthScales[0],
            length: previousL,
        })

        for (let i = 1; i < tangents.length; i++) {
            const {n, b} = this._newNormalBinormal(previousN, tangents[i]);

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

        return {n, b};
    }
}
