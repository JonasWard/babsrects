import { Vector3 } from '@babylonjs/core'

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
G1 Z4.500 F4800`

// G1 X199.596 Y139.065 F4800
// G1 E0.0000 F1800
// G92 E0.0000`



export const createGcode = (positions: Vector3[], extrusionValue: number = .5) => {
    // clone start sequence
    const gcodeString = ''+startCode;
    // move to the first position
    const movingToFirstPosition = `
G1 X${positions[0].x} Y${positions[0].y} F4800
G1 E0.0000 F1800
G92 E0.0000`

    const positionLines = []

    for (let i = 0; i < positions.length - 1; i ++) {
        const v0 = positions[i];
        const v1 = positions[i+1];
        const l = v1.subtract(v0).length();

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