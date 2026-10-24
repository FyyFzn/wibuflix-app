package com.fyy.stream.anime4k

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.VideoFrameProcessingException
import androidx.media3.common.util.GlProgram
import androidx.media3.common.util.GlUtil
import androidx.media3.common.util.Size
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BaseGlShaderProgram
import androidx.media3.effect.GlShaderProgram
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * Anime4kShaderProgram implements Media3's GlShaderProgram using OpenGL ES 3.0.
 * It provides an optimized Mode A (Fast Restore & Upscale) pipeline for <= 720p anime streams.
 */
@OptIn(UnstableApi::class)
class Anime4kShaderProgram(
  private val context: Context,
  useHdr: Boolean
) : BaseGlShaderProgram(useHdr, 1) {

  private var glProgram: GlProgram? = null
  private var outputWidth = 1920
  private var outputHeight = 1080

  private val vertexShader = """
    #version 300 es
    in vec4 aFramePosition;
    out vec2 v_texCoord;
    void main() {
      gl_Position = aFramePosition;
      v_texCoord = (aFramePosition.xy + vec2(1.0)) * 0.5;
    }
  """.trimIndent()

  private fun loadAssetShader(filename: String): String {
    val inputStream = context.assets.open("shaders/$filename")
    return BufferedReader(InputStreamReader(inputStream)).use { it.readText() }
  }

  override fun configure(inputWidth: Int, inputHeight: Int): Size {
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
      if (glProgram == null) {
        val fragmentShader = try {
          loadAssetShader("anime4k_upscale.frag")
        } catch (e: Exception) {
          // Fallback simple shader if asset not read
          """
          #version 300 es
          precision highp float;
          uniform sampler2D u_texture;
          in vec2 v_texCoord;
          out vec4 fragColor;
          void main() {
            fragColor = texture(u_texture, v_texCoord);
          }
          """.trimIndent()
        }

        glProgram = GlProgram(vertexShader, fragmentShader).apply {
          setBufferAttribute(
            "aFramePosition",
            GlUtil.getNormalizedCoordinateBounds(),
            GlUtil.HOMOGENEOUS_COORDINATE_VECTOR_SIZE
          )
        }
      }

      val program = glProgram ?: return
      program.use()
      program.setSamplerTexIdUniform("u_texture", inputTexId, 0)
      program.setFloatsUniform("u_texSize", floatArrayOf(outputWidth.toFloat(), outputHeight.toFloat()))
      program.bindAttributesAndUniforms()

      // Full-screen quad render to output texture
      GlUtil.checkGlError()
      android.opengl.GLES20.glDrawArrays(android.opengl.GLES20.GL_TRIANGLE_STRIP, 0, 4)
      GlUtil.checkGlError()
    } catch (e: Exception) {
      throw VideoFrameProcessingException(e)
    }
  }

  @Throws(VideoFrameProcessingException::class)
  override fun release() {
    super.release()
    try {
      glProgram?.delete()
    } catch (e: Exception) {
      throw VideoFrameProcessingException(e)
    }
  }
}
