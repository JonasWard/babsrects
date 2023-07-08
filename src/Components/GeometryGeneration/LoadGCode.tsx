import { Quaternion, Vector3 } from '@babylonjs/core';
import { Button, Input, message, Upload } from 'antd';
import * as React from 'react';

interface LoadGCodeProps {
  style: React.CSSProperties;
  buttonStyle: React.CSSProperties;
  updatePositions: (newPositions: Vector3[]) => void;
}

const LoadGCode: React.FC<LoadGCodeProps> = ({ style, updatePositions, buttonStyle }) => {
  const readPositions = (s: string) => {
    // reading G1 lines from the gcode in the file
    const lines = s.split('\n');
    const positions: Vector3[] = [];
    for (const line of lines) {
      if (line.startsWith('G1') && line.includes('X') && line.includes('Y') && line.includes('Z') && line.includes('E')) {
        // G1 X735.6140836043271 Y304.16656866555303 Z0.28052234649658203 E
        const coordinateData = line.split(' E')[0]
        const [xy, z] = coordinateData.split(' Z');
        const [xs, y] = xy.split(' Y');
        const x = xs.split('X')[1];
        positions.push(new Vector3(parseFloat(x), parseFloat(y), parseFloat(z)));
      }
    }

    // get bounding boxes of the positions
    const xMin = Math.min(...positions.map((p) => p.x));
    const xMax = Math.max(...positions.map((p) => p.x));
    const yMin = Math.min(...positions.map((p) => p.y));
    const yMax = Math.max(...positions.map((p) => p.y));
    const zMin = Math.min(...positions.map((p) => p.z));
    const zMax = Math.max(...positions.map((p) => p.z));

    // center the positions
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;
    const zCenter = (zMin + zMax) / 2;

    for (const position of positions) {
      position.x -= xCenter;
      position.y -= yCenter;
      position.z -= zCenter;
      position.z *= -1;
    }

    // for (const position of positions) {
    //   position.rotate
    // }

    updatePositions(positions.map(p => p.rotateByQuaternionAroundPointToRef(Quaternion.RotationAxis(Vector3.Right(), Math.PI / 2), Vector3.Zero(), p)));
  };

  return (
    <div style={style}>
      <Upload
        accept={'.gcode'}
        beforeUpload={(file) => {
          const reader = new FileReader();

          reader.onload = (e) => {
            readPositions(e.target.result as string);
            // console.log(e.target.result);
          };
          reader.readAsText(file);

          // Prevent upload
          return false;
        }}
      >
        <Button style={buttonStyle}>Upload GCode</Button>
      </Upload>
    </div>
  );
};

export default LoadGCode;
