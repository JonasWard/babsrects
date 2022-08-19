import { Vector3 } from '@babylonjs/core';
import * as React from 'react';
import { depricatedDataToObject } from '../../shapeGen/depricatedDataToShape';

interface DepricatedLightAndSoundProps {
  style: React.CSSProperties;
  buttonStyle: React.CSSProperties;
  updatePositions: (newPositions: Vector3[]) => void;
}

const DepricatedLightAndSound: React.FC<DepricatedLightAndSoundProps> = ({
  style,
  updatePositions,
  buttonStyle
}) => {
  const update = () => {
    // clearing and overwriting positions
    const positions = depricatedDataToObject();
    updatePositions(positions);
  };

  return (
    <div style={style}>
      <button style={buttonStyle} onClick={update}>Data to Object (old)</button>
    </div>
  );
};

export default DepricatedLightAndSound;
