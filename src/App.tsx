import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import OldRenderer from './Components/OldRenderer';

import './App.css';

ReactDOM.render(
    <React.StrictMode>
      <OldRenderer />
    </React.StrictMode>,
    document.getElementById('root')
  );