import json
import logging
import uuid

import anthropic
from deepgram import DeepgramClient, PrerecordedOptions
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.auth import get_current_user
from app.config import settings
from app.db import get_db, fetch_one, fetch_all, execute
from app.exercise_resolver import resolve_exercise_name

logger = logging.getLogger("voice")

router = APIRouter(prefix="/api/voice", tags=["voice"])


def _log_to_camel(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "userId": str(row["user_id"]),
        "sessionId": str(row["session_id"]),
        "exerciseName": row["exercise_name"],
        "setNumber": row["set_number"],
        "weightKg": float(row["weight_kg"]) if row.get("weight_kg") is not None else None,
        "reps": row.get("reps"),
        "rpe": float(row["rpe"]) if row.get("rpe") is not None else None,
        "distanceM": float(row["distance_m"]) if row.get("distance_m") is not None else None,
        "durationSeconds": row.get("duration_seconds"),
        "notes": row.get("notes"),
        "loggedAt": row["logged_at"].isoformat() if row.get("logged_at") else None,
    }


@router.post("/parse")
async def voice_parse(
    audio: UploadFile = File(...),
    exercise_name: str = Form(...),
    session_id: str = Form(...),
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    user_id = uuid.UUID(user["user_id"])
    sid = uuid.UUID(session_id)

    # Validate session
    session = await fetch_one(
        conn,
        "SELECT id, user_id, status FROM workout_sessions WHERE id = $1",
        sid,
    )
    if not session or str(session["user_id"]) != str(user_id):
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not in progress")

    # Look up exercise category (cardio vs strength)
    resolved_name = await resolve_exercise_name(conn, exercise_name)
    ex_row = await fetch_one(
        conn,
        "SELECT category FROM exercises WHERE LOWER(name) = LOWER($1)",
        resolved_name,
    )
    is_cardio = ex_row["category"] == "cardio" if ex_row and ex_row.get("category") else False

    # 1. Transcribe with Deepgram
    audio_bytes = await audio.read()
    dg = DeepgramClient(settings.DEEPGRAM_API_KEY)
    base_keywords = ["reps:2", "sets:2", "kilograms:2", "kg:2", "lbs:2", "RPE:2"]
    if is_cardio:
        base_keywords.extend(["meters:2", "metres:2", "distance:2", "seconds:2", "minutes:2"])
    options = PrerecordedOptions(
        model="nova-2",
        language="en",
        keywords=base_keywords,
    )
    dg_response = dg.listen.rest.v("1").transcribe_file(
        {"buffer": audio_bytes, "mimetype": audio.content_type or "audio/mp4"},
        options,
    )
    transcript = ""
    confidence = 0.0
    try:
        alt = dg_response.results.channels[0].alternatives[0]
        transcript = alt.transcript
        confidence = alt.confidence
    except (IndexError, AttributeError):
        pass

    logger.info("[voice] transcript=%r confidence=%.2f", transcript, confidence)

    if not transcript or confidence < 0.5:
        logger.warning("[voice] low confidence or empty transcript, asking for clarification")
        return {"needsClarification": "Could not understand audio. Please try again."}

    # 2. Get previous sets for context
    prev_rows = await fetch_all(
        conn,
        """SELECT weight_kg, reps, rpe FROM exercise_logs
           WHERE session_id = $1 AND exercise_name = $2
           ORDER BY set_number""",
        sid, exercise_name,
    )
    prev_sets = [
        {"weightKg": float(r["weight_kg"]) if r["weight_kg"] else 0, "reps": r["reps"], "rpe": float(r["rpe"]) if r.get("rpe") else None}
        for r in prev_rows
    ]

    # 3. Parse with Claude Haiku
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    if is_cardio:
        prompt = f"""Parse this cardio exercise log into JSON. Exercise: {exercise_name}.
Previous entries this session: {json.dumps(prev_sets)}.
Transcript: "{transcript}"

Return JSON only, no other text: {{ "distanceM": number|null, "durationSeconds": number|null, "rpe": number|null }}
Convert time to total seconds (e.g. "2 minutes 30" = 150, "1 hour 10 minutes" = 4200).
Convert distance to meters (e.g. "5k" or "5 km" = 5000, "1 mile" = 1609).
If ambiguous, return {{ "needsClarification": "question" }}"""
    else:
        prompt = f"""Parse this gym set log into JSON. Exercise: {exercise_name}.
Previous sets this session: {json.dumps(prev_sets)}.
Transcript: "{transcript}"

Return JSON only, no other text: {{ "weightKg": number, "reps": number, "rpe": number|null }}
If units are lbs, convert to kg (divide by 2.205 and round to 1 decimal).
If ambiguous, return {{ "needsClarification": "question" }}"""

    haiku_response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=150,
        messages=[{"role": "user", "content": prompt}],
    )
    response_text = haiku_response.content[0].text.strip()
    logger.info("[voice] claude raw response=%r", response_text)

    # Try to extract JSON from response
    try:
        # Handle potential markdown code block
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
        parsed = json.loads(response_text)
    except (json.JSONDecodeError, IndexError):
        logger.error("[voice] failed to parse claude response as JSON: %r", response_text)
        return {"needsClarification": "Could not parse the voice input. Please try again or enter manually."}

    logger.info("[voice] parsed result=%r", parsed)

    if "needsClarification" in parsed:
        logger.info("[voice] clarification needed: %s", parsed["needsClarification"])
        return {"transcript": transcript, "needsClarification": parsed["needsClarification"]}

    # 4. Return parsed data for user confirmation (don't auto-insert)
    if is_cardio:
        distance_m = parsed.get("distanceM")
        duration_seconds = parsed.get("durationSeconds")
        rpe = parsed.get("rpe")

        if distance_m is None and duration_seconds is None:
            logger.warning("[voice] missing distance and duration for cardio")
            return {"transcript": transcript, "needsClarification": "Could not determine distance or duration. Please try again."}

        logger.info("[voice] parsed cardio: %sm, %ss (rpe=%s)", distance_m, duration_seconds, rpe)
        return {
            "transcript": transcript,
            "parsed": {"distanceM": distance_m, "durationSeconds": duration_seconds, "rpe": rpe},
        }

    weight_kg = parsed.get("weightKg")
    reps = parsed.get("reps")
    rpe = parsed.get("rpe")

    if weight_kg is None or reps is None:
        logger.warning("[voice] missing weight or reps: weight_kg=%r reps=%r", weight_kg, reps)
        return {"transcript": transcript, "needsClarification": "Could not determine weight and reps. Please try again."}

    logger.info("[voice] parsed: %skg x %s reps (rpe=%s)", weight_kg, reps, rpe)
    return {
        "transcript": transcript,
        "parsed": {"weightKg": weight_kg, "reps": reps, "rpe": rpe},
    }
