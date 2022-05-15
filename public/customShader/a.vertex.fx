precision highp float;

// Attributes
attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;
attribute vec3 directionA;
attribute vec3 directionB;

// Uniforms
uniform mat4 worldViewProjection;
uniform float time;

// Varying
varying vec3 normalVec;
varying vec3 positionVec;

void main(void) {
    vec4 localPosition = vec4(position + directionA * (10. * sin(position.x * .1 + time)) + directionA * (5. * sin(uv.x * .002 + time) ), 1.0);
    gl_Position = worldViewProjection * localPosition;

    positionVec = gl_Position.xyz;
    normalVec = normal;
}