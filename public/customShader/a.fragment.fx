precision highp float;

varying vec3 normalVec;
varying vec3 directionVecA;
varying vec3 positionVec;

void main(void) {
    // mod(time * 0.01, 1.0), 0.
    vec3 l = vec3(.5) + .5 * normalVec;
    gl_FragColor = vec4(l, 1.0);
}