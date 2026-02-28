import json
import pytest
from unittest.mock import AsyncMock

pytestmark = pytest.mark.anyio


async def test_chat_stream(client, app, mock_pool_conn):
    """Test that /chat/stream returns SSE events."""
    # Set up the mock pool conn to return chat history
    mock_pool_conn.fetch.return_value = [
        {"role": "user", "content": "hello"}
    ]
    mock_pool_conn.execute.return_value = None

    # Create a mock chunk with text content
    mock_content = AsyncMock()
    mock_content.type = "text"
    mock_content.text = "Hello! How can I help?"

    mock_done_content = AsyncMock()
    mock_done_content.type = "text"
    mock_done_content.text = ""

    mock_chunk = AsyncMock()
    mock_chunk.contents = [mock_content]
    mock_chunk.text = "Hello! How can I help?"

    # Make agent.run return an async iterable
    async def mock_run(*args, **kwargs):
        yield mock_chunk

    app.state.agent.run = mock_run

    resp = await client.post("/chat/stream", json={"message": "hello"})
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")

    # Parse SSE events from response
    lines = resp.text.strip().split("\n")
    events = []
    for line in lines:
        if line.startswith("data: "):
            events.append(json.loads(line[6:]))

    # Should have text + done events
    text_events = [e for e in events if e["type"] == "text"]
    done_events = [e for e in events if e["type"] == "done"]
    assert len(text_events) >= 1
    assert len(done_events) == 1


async def test_get_chat_history(client, mock_pool_conn):
    """Test that GET /chat/history returns last 50 messages in camelCase."""
    from datetime import datetime, timezone

    mock_pool_conn.fetch.return_value = [
        {
            "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "role": "assistant",
            "content": "Hi there!",
            "created_at": datetime(2026, 1, 15, 10, 30, 0, tzinfo=timezone.utc),
        },
        {
            "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "role": "user",
            "content": "Hello",
            "created_at": datetime(2026, 1, 15, 10, 29, 0, tzinfo=timezone.utc),
        },
    ]

    resp = await client.get("/chat/history")
    assert resp.status_code == 200
    data = resp.json()
    assert "messages" in data
    # Results are reversed (chronological order), so user msg first
    assert len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][0]["content"] == "Hello"
    assert data["messages"][0]["id"] == "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    assert "createdAt" in data["messages"][0]
    assert data["messages"][1]["role"] == "assistant"


async def test_get_chat_history_empty(client, mock_pool_conn):
    """Test that GET /chat/history returns empty list when no messages."""
    mock_pool_conn.fetch.return_value = []

    resp = await client.get("/chat/history")
    assert resp.status_code == 200
    data = resp.json()
    assert data == {"messages": []}


async def test_clear_chat_history(client, mock_pool_conn):
    mock_pool_conn.execute.return_value = "DELETE 5"
    resp = await client.delete("/chat/history")
    assert resp.status_code == 200
    data = resp.json()
    assert data["cleared"] is True
