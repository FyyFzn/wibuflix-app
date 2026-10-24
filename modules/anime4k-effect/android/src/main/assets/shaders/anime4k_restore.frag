#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_texSize;

in vec2 v_texCoord;
out vec4 fragColor;

float getLuma(vec4 color) {
  return dot(color.rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 d = 1.0 / u_texSize;
  vec4 cc = texture(u_texture, v_texCoord);

  // 3x3 kernel sampling
  vec4 tl = texture(u_texture, v_texCoord + vec2(-d.x, -d.y));
  vec4 tc = texture(u_texture, v_texCoord + vec2(0.0, -d.y));
  vec4 tr = texture(u_texture, v_texCoord + vec2(d.x, -d.y));
  vec4 ml = texture(u_texture, v_texCoord + vec2(-d.x, 0.0));
  vec4 mr = texture(u_texture, v_texCoord + vec2(d.x, 0.0));
  vec4 bl = texture(u_texture, v_texCoord + vec2(-d.x, d.y));
  vec4 bc = texture(u_texture, v_texCoord + vec2(0.0, d.y));
  vec4 br = texture(u_texture, v_texCoord + vec2(d.x, d.y));

  // Sobel edge detect
  float xGrad = (tr.r + 2.0 * mr.r + br.r) - (tl.r + 2.0 * ml.r + bl.r);
  float yGrad = (bl.r + 2.0 * bc.r + br.r) - (tl.r + 2.0 * tc.r + tr.r);
  float edge = clamp(length(vec2(xGrad, yGrad)), 0.0, 1.0);

  // High-pass line thinning
  vec4 avg = (tl + tc + tr + ml + mr + bl + bc + br) * 0.125;
  vec4 restored = mix(cc, cc + (cc - avg) * 0.45, edge);

  fragColor = clamp(restored, 0.0, 1.0);
}
