import { useEffect, useRef } from 'react';
import { Engine, Scene} from '@babylonjs/core';
import * as React from 'react';

export default ({ antialias, engineOptions, adaptToDeviceRatio, sceneOptions, onRender, onSceneReady, ...rest}) => {
    const reactCanvas = useRef(null);

    // set up basic engine and scene
    useEffect(() => {
        const {current: canvas} = reactCanvas;

        canvas.style.width = '100vw';
        canvas.style.height = '100vh';

        // registering webgl parameters
        const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });   // WebGL 2

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        if (!canvas) return;

        const engine = new Engine(canvas, antialias, engineOptions, adaptToDeviceRatio);
        const scene = new Scene(engine, sceneOptions);

        if (scene.isReady()) {
            onSceneReady(scene, canvas);
        } else {
            scene.onReadyObservable.addOnce((scene) => onSceneReady(scene, canvas));
        }

        engine.runRenderLoop(() => {
            if (typeof onRender === 'function') onRender(scene);
            scene.render();
        });

        const resize = () => {scene.getEngine().resize()};

        if (window) {
            window.addEventListener('resize', resize);
        }

        return () => {
            scene.getEngine().dispose();

            if (window) {
                window.removeEventListener('resize', resize);
            };
        };
        

    }, [antialias, engineOptions, adaptToDeviceRatio, sceneOptions, onRender, onSceneReady]);
    
    return <canvas ref={reactCanvas} {...rest} />;
}