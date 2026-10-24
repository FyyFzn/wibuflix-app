#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_texSize;

in vec2 v_texCoord;
out vec4 fragColor;

float getLum(vec4 rgb) {
  return (rgb.r * 2.0 + rgb.g * 3.0 + rgb.b) / 6.0;
}

vec4 getRGBL(sampler2D tex, vec2 pos) {
  vec4 col = texture(tex, pos);
  return vec4(col.rgb, getLum(col));
}

float min3v(vec4 a, vec4 b, vec4 c) { return min(min(a.a, b.a), c.a); }
float max3v(vec4 a, vec4 b, vec4 c) { return max(max(a.a, b.a), c.a); }

vec4 getLargest(vec4 cc, vec4 lightest, vec4 a, vec4 b, vec4 c, float strength) {
  vec4 newColor = cc * (1.0 - strength) + ((a + b + c) / 3.0) * strength;
  if (newColor.a > lightest.a) {
    return newColor;
  }
  return lightest;
}

void main() {
  vec2 d = 1.0 / u_texSize;
  vec4 cc = getRGBL(u_texture, v_texCoord);

  vec4 t  = getRGBL(u_texture, v_texCoord + vec2(0.0, -d.y));
  vec4 b  = getRGBL(u_texture, v_texCoord + vec2(0.0, d.y));
  vec4 l  = getRGBL(u_texture, v_texCoord + vec2(-d.x, 0.0));
  vec4 r  = getRGBL(u_texture, v_texCoord + vec2(d.x, 0.0));

  vec4 tl = getRGBL(u_texture, v_texCoord + vec2(-d.x, -d.y));
  vec4 tr = getRGBL(u_texture, v_texCoord + vec2(d.x, -d.y));
  vec4 bl = getRGBL(u_texture, v_texCoord + vec2(-d.x, d.y));
  vec4 br = getRGBL(u_texture, v_texCoord + vec2(d.x, d.y));

  vec4 lightestColor = cc;
  float strength = 0.75;

  // Kernel 0 and 4 (Vertical)
  float maxDark = max3v(br, b, bl);
  float minLight = min3v(tl, t, tr);
  if (minLight > cc.a && minLight > maxDark) {
    lightestColor = getLargest(cc, lightestColor, tl, t, tr, strength);
  } else {
    maxDark = max3v(tl, t, tr);
    minLight = min3v(br, b, bl);
    if (minLight > cc.a && minLight > maxDark) {
      lightestColor = getLargest(cc, lightestColor, br, b, bl, strength);
    }
  }

  // Kernel 1 and 5 (Diagonal 1)
  maxDark = max3v(cc, l, b);
  minLight = min3v(r, t, tr);
  if (minLight > maxDark) {
    lightestColor = getLargest(cc, lightestColor, r, t, tr, strength);
  } else {
    maxDark = max3v(cc, r, t);
    minLight = min3v(bl, l, b);
    if (minLight > maxDark) {
      lightestColor = getLargest(cc, lightestColor, bl, l, b, strength);
    }
  }

  // Kernel 2 and 6 (Horizontal)
  maxDark = max3v(l, tl, bl);
  minLight = min3v(r, br, tr);
  if (minLight > cc.a && minLight > maxDark) {
    lightestColor = getLargest(cc, lightestColor, r, br, tr, strength);
  } else {
    maxDark = max3v(r, br, tr);
    minLight = min3v(l, tl, bl);
    if (minLight > cc.a && minLight > maxDark) {
      lightestColor = getLargest(cc, lightestColor, l, tl, bl, strength);
    }
  }

  // Kernel 3 and 7 (Diagonal 2)
  maxDark = max3v(cc, l, t);
  minLight = min3v(r, br, b);
  if (minLight > maxDark) {
    lightestColor = getLargest(cc, lightestColor, r, br, b, strength);
  } else {
    maxDark = max3v(cc, r, b);
    minLight = min3v(t, l, tl);
    if (minLight > maxDark) {
      lightestColor = getLargest(cc, lightestColor, t, l, tl, strength);
    }
  }

  fragColor = vec4(lightestColor.rgb, 1.0);
}
