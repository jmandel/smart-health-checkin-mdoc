package org.smarthealthit.checkin.wallet

import org.json.JSONArray
import org.json.JSONObject

internal object SmartCheckinResponseFactory {
    fun build(
        request: VerifiedRequest,
        selectedItems: Map<String, Boolean>,
        questionnaireAnswers: Map<String, Any>,
        walletStore: SmartHealthWalletStore,
    ): JSONObject {
        val artifacts = JSONArray()
        val answers = JSONObject()

        request.items
            .filter { selectedItems[it.id] != false }
            .forEach { item ->
                val artifactId = "artifact-${item.id}"
                val artifact = walletStore.resolveArtifact(item, questionnaireAnswers)
                artifacts.put(
                    JSONObject()
                        .put("id", artifactId)
                        .put("type", artifact.type)
                        .put("data", artifact.data),
                )
                answers.put(item.id, JSONArray().put(artifactId))
            }

        return JSONObject()
            .put("version", "1")
            .put("artifacts", artifacts)
            .put("answers", answers)
    }
}
