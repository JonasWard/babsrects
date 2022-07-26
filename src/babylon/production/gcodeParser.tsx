import { Vector3 } from '@babylonjs/core'
import { createCircle } from '../geometry/directedCurve'

const centerOfPrint = new Vector3(200,200,235);

const startCode = `G90
M82
M106 S0
M104 S190 T0
M109 S190 T0
G28 ; home all axes
; process first test pinche
; layer 1, Z = 4.500
T0
G92 E0.0000
G1 E-0.5000 F1800
; feature outer perimeter
; tool H4.500 W9.500
G1 X${centerOfPrint.x} Y${centerOfPrint.y} Z600
G1 Z${4.500 + centerOfPrint.z} F4800`

// G1 X199.596 Y139.065 F4800
// G1 E0.0000 F1800
// G92 E0.0000`

export const testCircle = (radius, layerCount, layerHeight) => {
    const positions: Vector3[] = []

    for (let i =0; i < layerCount; i++) {
        positions.push(...createCircle(new Vector3(0,i * layerHeight,0), radius, 64).map(v => new Vector3(v.x, v.z, v.y)));
    }

    downloadGCode(positions);
}

export const createGcode = (positions: Vector3[], extrusionValue: number = .5, originOffset: Vector3 = centerOfPrint) => {
    // getting the bouding box of all the positions
    const positionArray = {x: [], y: [], z: []};
    positions.forEach(v => {
        positionArray.x.push(v.x);
        positionArray.y.push(v.y);
        positionArray.z.push(v.z);
    });

    const minX = positionArray.x.reduce((min, v) => min < v ? min : v, Infinity);
    const minY = positionArray.y.reduce((min, v) => min < v ? min : v, Infinity);
    const minZ = positionArray.z.reduce((min, v) => min < v ? min : v, Infinity);

    const maxX = positionArray.x.reduce((max, v) => max > v ? max : v, -Infinity);
    const maxY = positionArray.y.reduce((max, v) => max > v ? max : v, -Infinity);
    const maxZ = positionArray.z.reduce((max, v) => max > v ? max : v, -Infinity);

    console.log('xSize: '+ (maxX - minX).toString());
    console.log('ySize: '+ (maxY - minY).toString());
    console.log('zSize: '+ (maxZ - minZ).toString());

    const offsetVector = originOffset.subtract(new Vector3((minX + maxX) * .5, (minY + maxY) * .5, 0.));
    const mappedPositions = positions.map(v => v.add(offsetVector));

    // clone start sequence
    const gcodeString = ''+startCode;
    // move to the first position
    const movingToFirstPosition = `
G1 X${mappedPositions[0].x} Y${mappedPositions[0].y} F4800
G1 E0.0000 F1800
G92 E0.0000`

    const positionLines = []

    let l = 0;

    for (let i = 0; i < mappedPositions.length - 1; i ++) {
        const v0 = mappedPositions[i];
        const v1 = mappedPositions[i+1];
        l += v1.subtract(v0).length();

        positionLines.push(`G1 X${v1.x} Y${v1.y} Z${v1.z} E${l*extrusionValue}`)
    }

    const dataArray = [
        gcodeString,
        movingToFirstPosition,
        positionLines.join('\n')
    ]

    return dataArray.join('\n');
}

export const downloadGCode = (positions: Vector3[]) => {
    const element = document.createElement("a");

    // const gcode = ()

    const file = new Blob([createGcode(positions)], {
      type: "text/plain"
    });
    element.href = URL.createObjectURL(file);
    element.download = "thisFileGCode.gcode";
    document.body.appendChild(element);
    element.click();
  };