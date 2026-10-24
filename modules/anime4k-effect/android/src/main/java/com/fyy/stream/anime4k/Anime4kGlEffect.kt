package com.fyy.stream.anime4k

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.GlEffect
import androidx.media3.effect.GlShaderProgram

/**
 * Anime4kGlEffect wraps Anime4K OpenGL ES 3.0 upscaling for Media3 video frame processor pipelines.
 */
@OptIn(UnstableApi::class)
class Anime4kGlEffect : GlEffect {
  override fun toGlShaderProgram(context: Context, useHdr: Boolean): GlShaderProgram {
    return Anime4kShaderProgram(context, useHdr)
  }
}
