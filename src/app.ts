import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, Sound, ShaderMaterial } from "@babylonjs/core";
import { DynamicSurface } from "./geometry/dynamicSurface";
import { createCustomShader } from "./geometry/dynamicShader";
import { ParallelTransportMesh } from "./geometry/parallelTransportFrames";
import { createCurveSet, createDirectedCurve, createSinoidCurve } from "./geometry/directedCurve";

class App {
    constructor() {
        // create the canvas html element and attach it to the webpage
        var canvas = document.createElement("canvas");
        canvas.style.padding = "0px";
        canvas.style.margin = "0px";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);
        document.body.style.margin = "0px";
    
        // initialize babylon scene and engine
        var engine = new Engine(canvas, true);
        var scene = new Scene(engine);

        var camera: ArcRotateCamera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene);
        camera.attachControl(canvas, true);
        var light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
        // const ground = MeshBuilder.CreateGround("ground", {width:10, height: 10}, scene);
        // var sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
        // sphere.position.y = 0.5;

        // const pts = createDirectedCurve(new Vector3(0, 0, 0), {alpha: 0, beta: 0, gamma: 0}, .05, 0.01, 0.01, 10000);
        // const pts = createSinoidCurve(new Vector3(0, 0, 0), 100., 25., .001, 30000);

        // // const dynamicSurface = new DynamicSurface(.1, 100, 100, scene);
        // const parallelTransportMesh = new ParallelTransportMesh(pts, 1.5, 100, scene);

        const material = createCustomShader(scene) as ShaderMaterial;

        let time = 0.;

        const spacing = 4.;
        const count = 50;
        const offset = spacing * count * .5


        for (let i = 0; i < count; i ++) {
            const pts = createCurveSet(new Vector3(-offset, i *  spacing - offset, -offset), new Vector3(1., 0, 0), 1., 1000);
            const parallelTransportMesh = new ParallelTransportMesh(pts, spacing * .55, 32, material, scene);
        }

        // const sound = new Sound("name", "soviet-anthem.mp3", scene, null, { loop: true, autoplay: true });

        // const roof = MeshBuilder.CreateCylinder("roof", {diameter: 1.3, height: 1.2, tessellation: 3}, scene);
        // roof.scaling.x = 0.75;
        // roof.rotation.z = Math.PI / 2;
        // roof.position.y = 1.22;

        scene.registerBeforeRender(() => {
            time += .01666;
            // @ts-ignore
            material.setFloat("time", time);
        });

        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show();
                }
            }
        });

        // run the main render loop
        engine.runRenderLoop(() => {
            scene.render();
            // console.log(scene.getTotalVertices());
        });
    }
}
new App();