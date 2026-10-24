#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_texSize;

in vec2 v_texCoord;
out vec4 fragColor;

float getLuma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 d = 1.0 / u_texSize;

  vec4 c  = texture(u_texture, v_texCoord);
  vec4 t  = texture(u_texture, v_texCoord - vec2(0.0, d.y));
  vec4 b  = texture(u_texture, v_texCoord + vec2(0.0, d.y));
  vec4 l  = texture(u_texture, v_texCoord - vec2(d.x, 0.0));
  vec4 r  = texture(u_texture, v_texCoord + vec2(d.x, 0.0));

  vec4 tl = texture(u_texture, v_texCoord + vec2(-d.x, -d.y));
  vec4 tr = texture(u_texture, v_texCoord + vec2(d.x, -d.y));
  vec4 bl = texture(u_texture, v_texCoord + vec2(-d.x, d.y));
  vec4 br = texture(u_texture, v_texCoord + vec2(d.x, d.y));

  // Compute luminance of center and 4 cardinal neighbors
  float lumaC = getLuma(c.rgb);
  float lumaT = getLuma(t.rgb);
  float lumaB = getLuma(b.rgb);
  float lumaL = getLuma(l.rgb);
  float lumaR = getLuma(r.rgb);

  // Compute edge strength: clamp(maxLuma - minLuma, 0.0, 1.0)
  float minLuma = min(min(lumaT, lumaB), min(lumaL, lumaR));
  float maxLuma = max(max(lumaT, lumaB), max(lumaL, lumaR));
  float edge = clamp(maxLuma - minLuma, 0.0, 1.0);

  // Weighted blur: cross * 0.70 + diag * 0.30
  vec4 crossNeighbors = (t + b + l + r) * 0.25;
  vec4 diagNeighbors  = (tl + tr + bl + br) * 0.25;
  vec4 blur = crossNeighbors * 0.70 + diagNeighbors * 0.30;

  // Detail: center - blur
  vec4 detail = c - blur;

  // Adaptive sharpening: gentle on flat areas (0.3), strong on edges (1.2)
  vec4 sharp = c + detail * mix(0.3, 1.2, edge);

  // Anti-ringing clamp: minNeighbor and maxNeighbor across all 8 neighbors per channel
  vec4 minNeighbor = min(min(min(t, b), min(l, r)), min(min(tl, tr), min(bl, br)));
  vec4 maxNeighbor = max(max(max(t, b), max(l, r)), max(max(tl, tr), max(bl, br)));

  fragColor = clamp(sharp, max(minNeighbor - 0.02, 0.0), min(maxNeighbor + 0.02, 1.0));
}
