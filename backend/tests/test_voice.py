import json
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
import pytest
from httpx import AsyncClient

TEST_SESSION_ID = "11111111-1111-1111-1111-111111111111"
TEST_USER_ID = "00000000-0000-0000-0000-000000000099"


def _mock_deepgram_response(transcript: str, confidence: float):
    alt = MagicMock()
    alt.transcript = transcript
    alt.confidence = confidence
    channel = MagicMock()
    channel.alternatives = [alt]
    results = MagicMock()
    results.channels = [channel]
    response = MagicMock()
    response.results = results
    return response


def _mock_haiku_response(content: str):
    text_block = MagicMock()
    text_block.text = content
    response = MagicMock()
    response.content = [text_block]
    return response


@pytest.mark.asyncio
@patch("app.routes.voice.anthropic.Anthropic")
@patch("app.routes.voice.DeepgramClient")
async def test_voice_parse_success(MockDG, MockAnthropic, client: AsyncClient, mock_conn):
    # Setup Deepgram mock
    dg_instance = MockDG.return_value
    dg_instance.listen.rest.v.return_value.transcribe_file.return_value = _mock_deepgram_response("80 kg for 8 reps", 0.95)

    # Setup Haiku mock
    haiku_instance = MockAnthropic.return_value
    haiku_instance.messages.create.return_value = _mock_haiku_response('{"weightKg": 80, "reps": 8, "rpe": null}')

    now = datetime.now(timezone.utc)
    log_id = uuid.uuid4()

    mock_conn.fetchrow.return_value = {
        "id": uuid.UUID(TEST_SESSION_ID), "user_id": uuid.UUID(TEST_USER_ID), "status": "in_progress",
    }
    mock_conn.fetch.return_value = []  # no previous sets

    resp = await client.post(
        "/api/voice/parse",
        files={"audio": ("test.m4a", b"fake audio data", "audio/mp4")},
        data={"exercise_name": "Bench Press", "session_id": TEST_SESSION_ID},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["transcript"] == "80 kg for 8 reps"
    assert data["parsed"]["weightKg"] == 80
    assert data["parsed"]["reps"] == 8


@pytest.mark.asyncio
@patch("app.routes.voice.DeepgramClient")
async def test_voice_parse_low_confidence(MockDG, client: AsyncClient, mock_conn):
    dg_instance = MockDG.return_value
    dg_instance.listen.rest.v.return_value.transcribe_file.return_value = _mock_deepgram_response("", 0.3)

    mock_conn.fetchrow.return_value = {"id": uuid.UUID(TEST_SESSION_ID), "user_id": uuid.UUID(TEST_USER_ID), "status": "in_progress"}

    resp = await client.post(
        "/api/voice/parse",
        files={"audio": ("test.m4a", b"fake", "audio/mp4")},
        data={"exercise_name": "Squat", "session_id": TEST_SESSION_ID},
    )
    assert resp.status_code == 200
    assert "needsClarification" in resp.json()


@pytest.mark.asyncio
@patch("app.routes.voice.anthropic.Anthropic")
@patch("app.routes.voice.DeepgramClient")
async def test_voice_parse_ambiguous(MockDG, MockAnthropic, client: AsyncClient, mock_conn):
    dg_instance = MockDG.return_value
    dg_instance.listen.rest.v.return_value.transcribe_file.return_value = _mock_deepgram_response("did some bench", 0.9)

    haiku_instance = MockAnthropic.return_value
    haiku_instance.messages.create.return_value = _mock_haiku_response('{"needsClarification": "How much weight did you use?"}')

    mock_conn.fetchrow.return_value = {"id": uuid.UUID(TEST_SESSION_ID), "user_id": uuid.UUID(TEST_USER_ID), "status": "in_progress"}
    mock_conn.fetch.return_value = []

    resp = await client.post(
        "/api/voice/parse",
        files={"audio": ("test.m4a", b"fake", "audio/mp4")},
        data={"exercise_name": "Bench Press", "session_id": TEST_SESSION_ID},
    )
    assert resp.status_code == 200
    assert resp.json()["needsClarification"] == "How much weight did you use?"
