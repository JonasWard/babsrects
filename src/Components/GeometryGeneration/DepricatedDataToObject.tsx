import { Vector3 } from '@babylonjs/core';
import * as React from 'react';
import { depricatedDataToObject } from '../../shapeGen/depricatedDataToShape';

interface DepricatedLightAndSoundProps {
  updatePositions: (newPositions: Vector3[]) => void;
  updateTransportMeshes: (newPositions: Vector3[]) => void;
}

const DepricatedLightAndSound: React.FC<DepricatedLightAndSoundProps> = ({
  updatePositions,
  updateTransportMeshes,
}) => {
  const update = () => {
    // clearing and overwriting positions
    const positions = depricatedDataToObject();
    updatePositions(positions);
    updateTransportMeshes(positions);
  };

  return (
    <div>
      <button onClick={update}>DepricatedLightAndSound</button>
    </div>
  );
};

export default DepricatedLightAndSound;
