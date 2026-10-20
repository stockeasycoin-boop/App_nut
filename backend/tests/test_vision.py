import json

import anthropic
import httpx2
import pytest

from app.config import Settings
from app.vision import ClaudeRecognizer, RecognitionError

RESULT = {
    "contains_food": True,
    "meal_name": "Dal and rice",
    "foods": [
        {
            "name": "Dal",
            "database_id": "dal",
            "emoji": "🍲",
            "grams": 200,
            "confidence": 0.9,
            "x": 40,
            "y": 50,
            "estimate_per_100g": {"calories": 120, "protein": 6, "carbs": 16, "fat": 3, "fiber": 4, "sugar": 1, "sodium": 300},
        }
    ],
}


def fake_client(stop_reason="end_turn", text=json.dumps(RESULT)):
    seen = {}

    def handler(request):
        seen["headers"] = request.headers
        seen["body"] = json.loads(request.content)
        content = [] if stop_reason == "refusal" else [{"type": "text", "text": text}]
        return httpx2.Response(
            200,
            json={
                "id": "msg_test",
                "type": "message",
                "role": "assistant",
                "model": "claude-opus-5-5",
                "content": content,
                "stop_reason": stop_reason,
                "stop_sequence": None,
                "usage": {"input_tokens": 10, "output_tokens": 10},
            },
        )

    client = anthropic.Anthropic(api_key="test", http_client=httpx2.Client(transport=httpx2.MockTransport(handler)))
    return client, seen


def test_request_shape_and_parsing():
    client, seen = fake_client()
    result = ClaudeRecognizer(Settings(), client=client).recognize(b"\xff\xd8jpeg", "image/jpeg")

    assert result.meal_name == "Dal and rice"
    assert result.foods[0].database_id == "dal"

    body = seen["body"]
    assert body["model"] == "claude-opus-5-5"
    assert body["fallbacks"] == "default"
    assert "server-side-fallback-2026-07-01" in seen["headers"]["anthropic-beta"]
    assert body["output_config"]["effort"] == "medium"
    assert body["output_config"]["format"]["type"] == "json_schema"
    assert "thinking" not in body  # Opus 5.5 always thinks; effort is the control
    image = body["messages"][0]["content"][0]
    assert image["type"] == "image" and image["source"]["media_type"] == "image/jpeg"
    assert "dal: Dal" in body["system"][0]["text"]


def test_refusal_raises():
    client, _ = fake_client(stop_reason="refusal")
    with pytest.raises(RecognitionError):
        ClaudeRecognizer(Settings(), client=client).recognize(b"x", "image/jpeg")


def test_truncated_output_raises():
    client, _ = fake_client(stop_reason="max_tokens", text='{"contains_food": true, "meal_')
    with pytest.raises(RecognitionError):
        ClaudeRecognizer(Settings(), client=client).recognize(b"x", "image/jpeg")
