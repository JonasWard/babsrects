import { Scene, Vector3 } from '@babylonjs/core';
import * as React from 'react';
import DepricatedDataToObject from './DepricatedDataToObject';
import DepricatedLightAndSound from './DepricatedLightAndSound';
import LoadGCode from './LoadGCode';

const width = 150;
const buttonMargin = 2;
const buttonH = 25;

const rightSidebarStyle = { transition: 'all 0.5s', width: `${width}px` };
const commonStyle: React.CSSProperties = {
  ...rightSidebarStyle,
  position: 'absolute',
  left: 0,
  top: 0,
};
const rightSideBarButton = {
    width: `${width - buttonMargin * 4}px`,
  margin: `${buttonMargin * 3}px ${buttonMargin}px ${buttonMargin * 1.5}px ${buttonMargin * 1.5}px`,
  height: `${buttonH}px`,
  overflow: 'hidden',
  border: 'none',
  boxShadow: '0px 0px 5px 2.5px lightgray',
};

export interface IGeometrySidebarProps {
  setPositions?: (vs: Vector3[]) => void;
}

const GeometrySidebar: React.FC<IGeometrySidebarProps> = ({ setPositions }) => {
  const [isVisible, setIsVisible] = React.useState(true);

  const visibleStyle: React.CSSProperties = {
    ...commonStyle,
    zIndex: 1,
    height: '100vh',
    background: 'ivory',
    boxShadow: '0 0 25px 2px black',
    marginTop: '20px',
  };
  const invisibleStyle: React.CSSProperties = {
    ...commonStyle,
    left: '-150px',
    zIndex: 1,
    height: '100vh',
    background: 'ivory',
    boxShadow: '0 0 0 0 black',
    marginTop: '20px',
  };

  const visibleToggleButtonStyle: React.CSSProperties = {
    ...commonStyle,
    zIndex: 2,
    height: '20px',
    background: 'ivory',
  };
  const invisibleToggleButtonStyle: React.CSSProperties = {
    ...commonStyle,
    zIndex: 2,
    height: '20px',
    background: '',
  };

  return (
    <>
      <button
        style={
          isVisible ? visibleToggleButtonStyle : invisibleToggleButtonStyle
        }
        onClick={() => setIsVisible(!isVisible)}
      >
        {isVisible ? 'Hide' : 'Show'}
      </button>

      <div style={isVisible ? visibleStyle : invisibleStyle}>
        <DepricatedLightAndSound
          style={rightSidebarStyle}
          buttonStyle={rightSideBarButton}
          updatePositions={setPositions}
        />
        <DepricatedDataToObject
          style={rightSidebarStyle}
          buttonStyle={rightSideBarButton}
          updatePositions={setPositions}
        />
        <LoadGCode
          style={rightSidebarStyle}
          buttonStyle={rightSideBarButton}
          updatePositions={setPositions}
        />
      </div>
    </>
  );
};

export default GeometrySidebar;
