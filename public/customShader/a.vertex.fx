precision highp float;

// Attributes
attribute vec3 position;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform float time;

// Varying
varying vec2 vUV;

void main(void) {
    vec4 localPosition = vec4(position.x + 1. * sin(position.y + position.z + time / 4.0), position.y + 1.0 * sin(position.x + position.y + time / 4.0), position.z + 1. * sin(position.y + position.x + time / 4.0), 1.0);
    gl_Position = worldViewProjection * localPosition;

    vUV = vec2(mod(localPosition.xz, 2.0));
}