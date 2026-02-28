import json
import logging
import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str


def _get_tool_name(content) -> str:
    """Extract tool name from a content object, trying multiple attribute names."""
    for attr in ("name", "function_name", "tool_name"):
        val = getattr(content, attr, None)
        if val:
            return val
    return ""


@router.post("/chat/stream")
async def chat_stream(
    body: ChatRequest,
    request: Request,
    user: dict = Depends(get_current_user),
):
    agent = request.app.state.agent
    pool = request.app.state.pool
    user_id = uuid.UUID(user["user_id"])

    # Save user message
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)",
            user_id,
            "user",
            body.message,
        )
        # Fetch recent history (last 20 messages)
        rows = await conn.fetch(
            """SELECT role, content FROM chat_messages
               WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20""",
            user_id,
        )

    # Build conversation in chronological order
    history = [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

    # Prepend context the agent needs (user_id for tool calls, current date for week_start)
    today = date.today()
    # Calculate Monday of the current week
    monday = today - timedelta(days=today.weekday())

    context_prefix = (
        f"[System context — user_id: {user_id}, "
        f"today: {today.isoformat()}, "
        f"current_week_start: {monday.isoformat()}]\n\n"
    )

    # Format as conversation string for the agent
    conversation = context_prefix + "\n".join(
        f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
        for m in history
    )

    async def event_stream():
        full_text = ""
        # Map call_id -> tool name for matching function_call to function_result
        pending_calls: dict[str, str] = {}
        emitted_names: set[str] = set()
        try:
            async for chunk in agent.run(conversation, stream=True):
                if chunk.contents:
                    for content in chunk.contents:
                        ct = getattr(content, "type", "")

                        if ct == "text_reasoning":
                            text = getattr(content, "text", "")
                            if text:
                                yield f"data: {json.dumps({'type': 'thinking', 'text': text})}\n\n"

                        elif ct == "function_call":
                            name = _get_tool_name(content)
                            call_id = getattr(content, "call_id", "") or ""
                            if name and name not in emitted_names:
                                emitted_names.add(name)
                                if call_id:
                                    pending_calls[call_id] = name
                                yield f"data: {json.dumps({'type': 'tool_start', 'name': name})}\n\n"
                            elif call_id and name:
                                # Subsequent chunks for same call — just track the call_id
                                pending_calls[call_id] = name

                        elif ct == "function_result":
                            # Try to find the tool name via call_id first, then name attr
                            call_id = getattr(content, "call_id", "") or ""
                            name = pending_calls.pop(call_id, "") or _get_tool_name(content)
                            if name and name in emitted_names:
                                yield f"data: {json.dumps({'type': 'tool_done', 'name': name})}\n\n"
                                emitted_names.discard(name)

                        elif ct == "text":
                            text = getattr(content, "text", "")
                            if text:
                                full_text += text
                                yield f"data: {json.dumps({'type': 'text', 'text': full_text})}\n\n"

                # Also check chunk-level text (cumulative) as a fallback
                elif chunk.text and chunk.text != full_text:
                    full_text = chunk.text
                    yield f"data: {json.dumps({'type': 'text', 'text': full_text})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

            # Save assistant response
            if full_text:
                async with pool.acquire() as conn:
                    await conn.execute(
                        "INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)",
                        user_id,
                        "assistant",
                        full_text,
                    )
        except Exception as e:
            logger.exception("[stream] error during streaming")
            yield f"data: {json.dumps({'type': 'error', 'text': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chat/history")
async def get_chat_history(
    request: Request,
    user: dict = Depends(get_current_user),
):
    pool = request.app.state.pool
    user_id = uuid.UUID(user["user_id"])
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, role, content, created_at FROM chat_messages
               WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50""",
            user_id,
        )
    messages = [
        {
            "id": str(r["id"]),
            "role": r["role"],
            "content": r["content"],
            "createdAt": r["created_at"].isoformat(),
        }
        for r in reversed(rows)
    ]
    return {"messages": messages}


@router.delete("/chat/history")
async def clear_chat_history(
    request: Request,
    user: dict = Depends(get_current_user),
):
    pool = request.app.state.pool
    user_id = uuid.UUID(user["user_id"])
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM chat_messages WHERE user_id = $1", user_id
        )
    return {"cleared": True}
