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
    vec4 localPosition = vec4(position + normalRef * (( .5 + .5 *  sin(uv.y * 6.28 + time / 4.0)) + ( .25 + .25 *  sin(uv.y * 6.283 * 5. + time / 4.0)) + ( .1 + .1 *  sin(uv.y * 314.15 + time / 4.0))), 1.0);
    gl_Position = worldViewProjection * localPosition;

    vUV = vec2(mod(localPosition.xz / 100., 1.0));
}