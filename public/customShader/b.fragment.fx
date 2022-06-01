precision highp float;

varying vec3 normalVec;
varying vec3 directionVecA;
varying vec3 positionVec;

varying vec2 letsColor;

void main(void) {
    // mod(time * 0.01, 1.0), 0.
    // vec3 color = vec3(.5) + .5 * normalVec;
    // vec3 color = vec3(mod(letsColor * .1, 1.), 1.);
    gl_FragColor = vec4(normalVec, 1.0);
}