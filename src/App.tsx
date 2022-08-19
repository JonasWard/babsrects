import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Renderer from './Components/Renderer';
import './App.css';

ReactDOM.render(
    <React.StrictMode>
      <Renderer />
    </React.StrictMode>,
    document.getElementById('root')
  );