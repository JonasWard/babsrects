precision highp float;

// Attributes
attribute vec3 position;
attribute vec2 uv;
attribute vec3 normalRef;

// Uniforms
uniform mat4 worldViewProjection;
uniform float time;

// Varying
varying vec2 vUV;

void main(void) {
    vec4 localPosition = vec4(position.x + 10. * sin(normalRef.y + normalRef.z + time / 4.0), position.y + 10.0 * sin(normalRef.x + normalRef.y + time / 4.0), position.z + 1. * sin(normalRef.y + normalRef.x + time / 4.0), 1.0);
    gl_Position = worldViewProjection * localPosition;

    vUV = vec2(mod(localPosition.xz, 2.0));
}