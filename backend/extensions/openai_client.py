"""OpenAI client helpers for structured AI responses."""

import json
import os
from urllib import error as urllib_error
from urllib import request as urllib_request

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = (os.environ.get("OPENAI_MODEL") or "gpt-4o-mini").strip()
AI_BUSY_MESSAGE = "Server is busy. Please try again later."


def normalize_schema_for_openai(schema):
    if isinstance(schema, list):
        return [normalize_schema_for_openai(item) for item in schema]
    if not isinstance(schema, dict):
        return schema

    normalized = {}
    for key, value in schema.items():
        if key == "type" and isinstance(value, str):
            normalized[key] = value.lower()
        else:
            normalized[key] = normalize_schema_for_openai(value)

    if normalized.get("type") == "object" and "properties" in normalized:
        normalized.setdefault("additionalProperties", False)
    return normalized


def extract_openai_response_text(parsed):
    direct_text = parsed.get("output_text")
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text.strip()

    text_parts = []
    for item in parsed.get("output") or []:
        for content in (item or {}).get("content") or []:
            if not isinstance(content, dict):
                continue
            if content.get("type") in {"output_text", "text"} and isinstance(content.get("text"), str):
                text_parts.append(content["text"])
    return "".join(text_parts).strip()


def call_openai_with_raw_structured_output(prompt, schema, schema_name="structured_output"):
    if not OPENAI_API_KEY:
        raise ValueError("Missing OPENAI_API_KEY in backend environment.")

    payload = {
        "model": OPENAI_MODEL,
        "input": [
            {"role": "system", "content": "Return only JSON that matches the supplied schema."},
            {"role": "user", "content": prompt},
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": schema_name,
                "schema": normalize_schema_for_openai(schema),
                "strict": True,
            }
        },
    }

    req = urllib_request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {OPENAI_API_KEY}"},
        method="POST"
    )

    try:
        with urllib_request.urlopen(req, timeout=45) as response:
            raw = response.read().decode("utf-8")
    except urllib_error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise ValueError(f"OpenAI API error ({e.code}): {error_body}")
    except urllib_error.URLError as e:
        raise ValueError(f"OpenAI API connection error: {e}")

    parsed = json.loads(raw)
    text = extract_openai_response_text(parsed)
    if not text:
        raise ValueError("OpenAI returned an empty response.")

    result = json.loads(text)
    result["model"] = OPENAI_MODEL
    return result