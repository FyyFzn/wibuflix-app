package com.fyy.stream.anime4k

import android.content.Context
import android.opengl.GLES30
import androidx.annotation.OptIn
import androidx.media3.common.VideoFrameProcessingException
import androidx.media3.common.util.GlProgram
import androidx.media3.common.util.GlUtil
import androidx.media3.common.util.Size
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BaseGlShaderProgram
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * Anime4kShaderProgram implements Media3's GlShaderProgram using OpenGL ES 3.0.
 * It provides an optimized 2-pass Mode A (Fast Restore & Upscale) pipeline for <= 720p anime streams:
 * Pass 1: Restore / PushColor line thinning at native input resolution.
 * Pass 2: Luminance-adaptive sharpening and anti-ringing upscale at target output resolution.
 */
@OptIn(UnstableApi::class)
class Anime4kShaderProgram(
  private val context: Context,
  useHdr: Boolean
) : BaseGlShaderProgram(useHdr, 1) {

  private var restoreProgram: GlProgram? = null
  private var glProgram: GlProgram? = null
  private var inputWidth = 0
  private var inputHeight = 0
  private var outputWidth = 1920
  private var outputHeight = 1080
  private var restoreFbo = -1
  private var restoreTexId = -1

  private val vertexShader = """
    #version 300 es
    in vec4 aFramePosition;
    out vec2 v_texCoord;
    void main() {
      gl_Position = aFramePosition;
      v_texCoord = (aFramePosition.xy + vec2(1.0)) * 0.5;
    }
  """.trimIndent()

  private val fallbackShader = """
    #version 300 es
    precision highp float;
    uniform sampler2D u_texture;
    uniform vec2 u_texSize;
    in vec2 v_texCoord;
    out vec4 fragColor;
    void main() {
      fragColor = texture(u_texture, v_texCoord);
    }
  """.trimIndent()

  private fun loadAssetShader(filename: String): String {
    val inputStream = context.assets.open("shaders/$filename")
    return BufferedReader(InputStreamReader(inputStream)).use { it.readText() }
  }

  private fun cleanupIntermediateFbo() {
    if (restoreTexId != -1) {
      GLES30.glDeleteTextures(1, intArrayOf(restoreTexId), 0)
      restoreTexId = -1
    }
    if (restoreFbo != -1) {
      GLES30.glDeleteFramebuffers(1, intArrayOf(restoreFbo), 0)
      restoreFbo = -1
    }
  }

  private fun initIntermediateFbo() {
    if (inputWidth <= 0 || inputHeight <= 0) return

    val texIds = IntArray(1)
    GLES30.glGenTextures(1, texIds, 0)
    restoreTexId = texIds[0]

    GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, restoreTexId)
    GLES30.glTexImage2D(
      GLES30.GL_TEXTURE_2D,
      0,
      GLES30.GL_RGBA8,
      inputWidth,
      inputHeight,
      0,
      GLES30.GL_RGBA,
      GLES30.GL_UNSIGNED_BYTE,
      null
    )
    GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MIN_FILTER, GLES30.GL_LINEAR)
    GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MAG_FILTER, GLES30.GL_LINEAR)
    GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_S, GLES30.GL_CLAMP_TO_EDGE)
    GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_T, GLES30.GL_CLAMP_TO_EDGE)

    val fboIds = IntArray(1)
    GLES30.glGenFramebuffers(1, fboIds, 0)
    restoreFbo = fboIds[0]

    GLES30.glBindFramebuffer(GLES30.GL_FRAMEBUFFER, restoreFbo)
    GLES30.glFramebufferTexture2D(
      GLES30.GL_FRAMEBUFFER,
      GLES30.GL_COLOR_ATTACHMENT0,
      GLES30.GL_TEXTURE_2D,
      restoreTexId,
      0
    )

    val status = GLES30.glCheckFramebufferStatus(GLES30.GL_FRAMEBUFFER)
    if (status != GLES30.GL_FRAMEBUFFER_COMPLETE) {
      throw RuntimeException("Anime4K intermediate FBO incomplete: $status")
    }
  }

  override fun configure(inputWidth: Int, inputHeight: Int): Size {
    if (this.inputWidth != inputWidth || this.inputHeight != inputHeight) {
      cleanupIntermediateFbo()
    }
    this.inputWidth = inputWidth
    this.inputHeight = inputHeight

    // Preserve 16:9 1080p target standard or scale proportionally
    val targetHeight = 1080
    val targetWidth = if (inputHeight > 0) {
      (inputWidth.toFloat() / inputHeight.toFloat() * targetHeight).toInt()
    } else {
      1920
    }
    outputWidth = targetWidth
    outputHeight = targetHeight
    return Size(outputWidth, outputHeight)
  }

  @Throws(VideoFrameProcessingException::class)
  override fun drawFrame(inputTexId: Int, presentationTimeUs: Long) {
    try {
      if (restoreProgram == null) {
        val restoreShader = try {
          loadAssetShader("anime4k_restore.frag")
        } catch (e: Exception) {
          fallbackShader
        }
        restoreProgram = GlProgram(vertexShader, restoreShader).apply {
          setBufferAttribute(
            "aFramePosition",
            GlUtil.getNormalizedCoordinateBounds(),
            GlUtil.HOMOGENEOUS_COORDINATE_VECTOR_SIZE
          )
        }
      }

      if (glProgram == null) {
        val upscaleShader = try {
          loadAssetShader("anime4k_upscale.frag")
        } catch (e: Exception) {
          fallbackShader
        }
        glProgram = GlProgram(vertexShader, upscaleShader).apply {
          setBufferAttribute(
            "aFramePosition",
            GlUtil.getNormalizedCoordinateBounds(),
            GlUtil.HOMOGENEOUS_COORDINATE_VECTOR_SIZE
          )
        }
      }

      val rProgram = restoreProgram ?: return
      val uProgram = glProgram ?: return

      if (restoreFbo == -1 || restoreTexId == -1) {
        initIntermediateFbo()
      }

      // Save currently-bound output framebuffer
      val savedFbo = IntArray(1)
      GLES30.glGetIntegerv(GLES30.GL_FRAMEBUFFER_BINDING, savedFbo, 0)

      // ==========================================
      // Pass 1: Restore (input resolution)
      // ==========================================
      GLES30.glBindFramebuffer(GLES30.GL_FRAMEBUFFER, restoreFbo)
      GLES30.glViewport(0, 0, inputWidth, inputHeight)

      rProgram.use()
      rProgram.setSamplerTexIdUniform("u_texture", inputTexId, 0)
      rProgram.setFloatsUniform("u_texSize", floatArrayOf(inputWidth.toFloat(), inputHeight.toFloat()))
      rProgram.bindAttributesAndUniforms()

      GlUtil.checkGlError()
      GLES30.glDrawArrays(GLES30.GL_TRIANGLE_STRIP, 0, 4)
      GlUtil.checkGlError()

      // ==========================================
      // Pass 2: Upscale + Sharpen (output resolution)
      // ==========================================
      GLES30.glBindFramebuffer(GLES30.GL_FRAMEBUFFER, savedFbo[0])
      GLES30.glViewport(0, 0, outputWidth, outputHeight)

      uProgram.use()
      uProgram.setSamplerTexIdUniform("u_texture", restoreTexId, 0)
      uProgram.setFloatsUniform("u_texSize", floatArrayOf(outputWidth.toFloat(), outputHeight.toFloat()))
      uProgram.bindAttributesAndUniforms()

      GlUtil.checkGlError()
      GLES30.glDrawArrays(GLES30.GL_TRIANGLE_STRIP, 0, 4)
      GlUtil.checkGlError()

    } catch (e: Exception) {
      throw VideoFrameProcessingException(e)
    }
  }

  @Throws(VideoFrameProcessingException::class)
  override fun release() {
    super.release()
    try {
      cleanupIntermediateFbo()
      restoreProgram?.delete()
      glProgram?.delete()
      restoreProgram = null
      glProgram = null
    } catch (e: Exception) {
      throw VideoFrameProcessingException(e)
    }
  }
}
