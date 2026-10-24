package com.fyy.stream.anime4k

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class Anime4kEffectModule : Module() {
  companion object {
    @Volatile
    var isEnabled: Boolean = false
  }

  override fun definition() = ModuleDefinition {
    Name("Anime4kEffect")

    Function("isAnime4kSupported") {
      // Android GLES 3.0 supported on all modern Android devices (API >= 24)
      true
    }

    Function("setAnime4kEnabled") { enabled: Boolean ->
      isEnabled = enabled
    }

    Function("isAnime4kEnabled") {
      isEnabled
    }
  }
}
