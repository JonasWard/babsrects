import { Vector3 } from '@babylonjs/core';
import * as React from 'react';
import { depricatedLightAndSoundToThing } from '../../shapeGen/depricatedDataToShape';

interface DepricatedLightAndSoundProps {
  style: React.CSSProperties;
  buttonStyle: React.CSSProperties;
  updatePositions: (newPositions: Vector3[]) => void;
}

const DepricatedLightAndSound: React.FC<DepricatedLightAndSoundProps> = ({
  style,
  updatePositions,
  buttonStyle,
}) => {
  const update = () => {
    // clearing and overwriting positions
    const positions = depricatedLightAndSoundToThing();
    updatePositions(positions);
  };

  return (
    <div style={{...style}}>
      <button style={buttonStyle} onClick={update}>Light and Sound (old)</button>
    </div>
  );
};

export default DepricatedLightAndSound;
