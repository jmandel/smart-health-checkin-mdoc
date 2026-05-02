package org.smarthealthit.checkin.wallet

import java.time.Instant
import org.json.JSONArray
import org.json.JSONObject

fun smartQuestionnaireAnswerKey(credentialId: String, linkId: String): String = "$credentialId::$linkId"

object QuestionnaireResponseBuilder {
    fun build(
        requestItem: RequestItem,
        answerSnapshot: Map<String, Any>,
        authored: Instant = Instant.now(),
    ): JSONObject {
        val questionnaire = requestItem.meta.optJSONObject("questionnaire")
        val values = collectQuestionnaireValues(requestItem.id, answerSnapshot)
        val response = JSONObject()
            .put("resourceType", "QuestionnaireResponse")
            .put("id", "${requestItem.id}-response")
            .put("status", "completed")
            .put("authored", authored.toString())

        if (questionnaire != null) {
            questionnaireReference(questionnaire)?.let { response.put("questionnaire", it) }
            response.put("item", buildQuestionnaireItems(questionnaire.optJSONArray("item"), values))
        }

        return response
    }

    private fun collectQuestionnaireValues(credentialId: String, answerSnapshot: Map<String, Any>): JSONObject {
        val values = JSONObject()
        val prefix = "$credentialId::"
        answerSnapshot.forEach { (key, value) ->
            if (key.startsWith(prefix)) {
                values.put(key.removePrefix(prefix), jsonValue(value))
            }
        }
        return values
    }

    private fun buildQuestionnaireItems(sourceItems: JSONArray?, values: JSONObject): JSONArray {
        val out = JSONArray()
        jsonObjectItems(sourceItems).forEach { source ->
            if (!isEnabled(source, values)) return@forEach

            val type = source.optString("type")
            val target = JSONObject().put("linkId", source.optString("linkId"))
            if (source.optString("text").isNotBlank()) target.put("text", source.optString("text"))

            when (type) {
                "group" -> {
                    val children = buildQuestionnaireItems(source.optJSONArray("item"), values)
                    if (children.length() > 0) {
                        target.put("item", children)
                        out.put(target)
                    }
                }
                "display" -> out.put(target)
                else -> {
                    val answers = answersFor(source, values.opt(source.optString("linkId")))
                    if (answers.length() > 0) {
                        target.put("answer", answers)
                        out.put(target)
                    }
                }
            }
        }
        return out
    }

    private fun isEnabled(item: JSONObject, values: JSONObject): Boolean {
        val enableWhen = item.optJSONArray("enableWhen")
        if (enableWhen == null || enableWhen.length() == 0) return true

        val any = item.optString("enableBehavior") == "any"
        var aggregate = !any
        jsonObjectItems(enableWhen).forEach { condition ->
            val result = compare(values.opt(condition.optString("question")), condition)
            aggregate = if (any) aggregate || result else aggregate && result
        }
        return aggregate
    }

    private fun compare(actual: Any?, condition: JSONObject): Boolean {
        val operator = condition.optString("operator")
        val expected = when {
            condition.has("answerInteger") -> condition.opt("answerInteger")
            condition.has("answerDecimal") -> condition.opt("answerDecimal")
            condition.has("answerBoolean") -> condition.opt("answerBoolean")
            condition.has("answerString") -> condition.opt("answerString")
            condition.has("answerCoding") -> condition.optJSONObject("answerCoding")?.optString("code")
            else -> null
        }

        if (operator == "exists") return (actual != null && actual != JSONObject.NULL) == (expected == true)
        if (actual == null || actual == JSONObject.NULL || expected == null || expected == JSONObject.NULL) return false
        if (operator == "=") return valuesContain(actual, expected)
        if (operator == "!=") return !valuesContain(actual, expected)

        return runCatching {
            val left = actual.toString().toDouble()
            val right = expected.toString().toDouble()
            when (operator) {
                ">" -> left > right
                "<" -> left < right
                ">=" -> left >= right
                "<=" -> left <= right
                else -> false
            }
        }.getOrDefault(false)
    }

    private fun answersFor(item: JSONObject, value: Any?): JSONArray {
        val answers = JSONArray()
        if (value == null || value == JSONObject.NULL || value.toString().isBlank()) return answers

        when (value) {
            is JSONArray -> {
                for (index in 0 until value.length()) {
                    answerForScalar(item, value.opt(index))?.let(answers::put)
                }
            }
            is Collection<*> -> value.forEach { answerForScalar(item, it)?.let(answers::put) }
            else -> answerForScalar(item, value)?.let(answers::put)
        }
        return answers
    }

    private fun answerForScalar(item: JSONObject, value: Any?): JSONObject? {
        if (value == null || value == JSONObject.NULL) return null
        val answer = JSONObject()
        when (item.optString("type")) {
            "integer" -> answer.put("valueInteger", value.toString().toInt())
            "decimal" -> answer.put("valueDecimal", value.toString().toDouble())
            "boolean" -> answer.put("valueBoolean", value == true || value.toString().equals("true", ignoreCase = true))
            "date" -> answer.put("valueDate", value.toString())
            "dateTime" -> answer.put("valueDateTime", value.toString())
            "time" -> answer.put("valueTime", value.toString())
            "choice", "open-choice" -> {
                val option = findAnswerOption(item.optJSONArray("answerOption"), value.toString())
                val optionValue = option?.let(::questionnaireAnswerOptionValue)
                if (optionValue != null) {
                    answer.put(optionValue.first, optionValue.second)
                } else {
                    answer.put("valueString", value.toString())
                }
            }
            else -> answer.put("valueString", value.toString())
        }
        return answer
    }

    private fun findAnswerOption(options: JSONArray?, key: String): JSONObject? {
        return jsonObjectItems(options).firstOrNull { option -> key == answerOptionKey(option) }
    }

    private fun answerOptionKey(option: JSONObject): String {
        val coding = option.optJSONObject("valueCoding")
        if (coding != null) return coding.optString("code", coding.optString("display", coding.toString()))
        if (option.has("valueString")) return option.optString("valueString")
        if (option.has("valueInteger")) return option.optInt("valueInteger").toString()
        if (option.has("valueDecimal")) return option.optDouble("valueDecimal").toString()
        if (option.has("valueDate")) return option.optString("valueDate")
        if (option.has("valueDateTime")) return option.optString("valueDateTime")
        if (option.has("valueTime")) return option.optString("valueTime")
        return option.toString()
    }

    private fun questionnaireAnswerOptionValue(option: JSONObject): Pair<String, Any>? {
        option.optJSONObject("valueCoding")?.let { return "valueCoding" to JSONObject(it.toString()) }
        if (option.has("valueString")) return "valueString" to option.optString("valueString")
        if (option.has("valueInteger")) return "valueInteger" to option.optInt("valueInteger")
        if (option.has("valueDecimal")) return "valueDecimal" to option.optDouble("valueDecimal")
        if (option.has("valueDate")) return "valueDate" to option.optString("valueDate")
        if (option.has("valueDateTime")) return "valueDateTime" to option.optString("valueDateTime")
        if (option.has("valueTime")) return "valueTime" to option.optString("valueTime")
        return null
    }

    private fun valuesContain(actual: Any, expected: Any): Boolean {
        if (actual is JSONArray) {
            for (index in 0 until actual.length()) {
                if (actual.opt(index).toString() == expected.toString()) return true
            }
            return false
        }
        return actual.toString() == expected.toString()
    }

    private fun questionnaireReference(questionnaire: JSONObject): String? {
        val canonical = questionnaire.optString("url")
        if (canonical.isNotBlank()) {
            val version = questionnaire.optString("version")
            return if (version.isBlank()) canonical else "$canonical|$version"
        }
        val id = questionnaire.optString("id")
        return if (id.isBlank()) null else "Questionnaire/$id"
    }
}

fun jsonObjectItems(array: JSONArray?): List<JSONObject> {
    if (array == null) return emptyList()
    val values = ArrayList<JSONObject>(array.length())
    for (index in 0 until array.length()) {
        array.optJSONObject(index)?.let(values::add)
    }
    return values
}

fun jsonValue(value: Any?): Any? {
    return when (value) {
        null -> null
        is JSONObject -> JSONObject(value.toString())
        is JSONArray -> JSONArray(value.toString())
        is Collection<*> -> JSONArray(value)
        else -> value
    }
}
