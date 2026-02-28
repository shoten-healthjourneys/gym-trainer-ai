import logging

import asyncpg

logger = logging.getLogger("exercise_resolver")

# Map keywords found in user input to muscle_group values in the database
_MUSCLE_KEYWORDS: dict[str, str] = {
    "shoulder": "shoulders",
    "delt": "shoulders",
    "chest": "chest",
    "pec": "chest",
    "back": "back",
    "lat": "back",
    "leg": "legs",
    "quad": "legs",
    "hamstring": "legs",
    "glute": "legs",
    "arm": "arms",
    "bicep": "arms",
    "tricep": "arms",
    "core": "core",
    "ab": "core",
}


def _extract_muscle_group(raw_name: str) -> str | None:
    """Extract a muscle_group hint from user input based on keyword matching."""
    lower = raw_name.lower()
    for keyword, group in _MUSCLE_KEYWORDS.items():
        if keyword in lower:
            return group
    return None


async def resolve_exercise_name(conn: asyncpg.Connection, raw_name: str) -> str:
    """Resolve a raw exercise name to its canonical form.

    Returns the canonical name, or the original if no match found.

    Strategy:
    1. Exact match (case-insensitive) on exercises.name
    2. Alias match (case-insensitive) on exercises.aliases array
    3. Trigram similarity >= 0.4 on exercises.name, preferring matching muscle_group
    """
    if not raw_name or not raw_name.strip():
        return raw_name

    raw_name = raw_name.strip()

    # 1. Exact match on canonical name
    row = await conn.fetchrow(
        "SELECT name FROM exercises WHERE LOWER(name) = LOWER($1)",
        raw_name,
    )
    if row:
        return row["name"]

    # 2. Alias match
    row = await conn.fetchrow(
        """SELECT name FROM exercises
           WHERE EXISTS (
               SELECT 1 FROM unnest(aliases) AS a WHERE LOWER(a) = LOWER($1)
           )""",
        raw_name,
    )
    if row:
        logger.info("Resolved '%s' via alias to '%s'", raw_name, row["name"])
        return row["name"]

    # 3. Trigram similarity with muscle-group preference
    muscle_hint = _extract_muscle_group(raw_name)

    if muscle_hint:
        # Prefer exercises whose muscle_group matches the keyword in user input.
        # Fetch top candidates and re-rank: matching muscle_group gets a bonus.
        rows = await conn.fetch(
            """SELECT name, muscle_group, similarity(name, $1) AS sim
               FROM exercises
               WHERE similarity(name, $1) >= 0.3
               ORDER BY sim DESC
               LIMIT 10""",
            raw_name,
        )
        if rows:
            # Re-rank: add 0.15 bonus to sim for matching muscle_group
            best = max(
                rows,
                key=lambda r: float(r["sim"]) + (0.15 if r["muscle_group"] == muscle_hint else 0.0),
            )
            effective_sim = float(best["sim"]) + (0.15 if best["muscle_group"] == muscle_hint else 0.0)
            if effective_sim >= 0.4:
                logger.warning(
                    "Resolved '%s' via trigram+muscle (sim=%.2f, muscle=%s, effective=%.2f) to '%s'",
                    raw_name,
                    best["sim"],
                    muscle_hint,
                    effective_sim,
                    best["name"],
                )
                return best["name"]
    else:
        row = await conn.fetchrow(
            """SELECT name, similarity(name, $1) AS sim
               FROM exercises
               WHERE similarity(name, $1) >= 0.4
               ORDER BY sim DESC
               LIMIT 1""",
            raw_name,
        )
        if row:
            logger.warning(
                "Resolved '%s' via trigram (sim=%.2f) to '%s'",
                raw_name,
                row["sim"],
                row["name"],
            )
            return row["name"]

    # No match found — auto-insert as a new canonical exercise
    await conn.execute(
        """INSERT INTO exercises (name)
           VALUES ($1)
           ON CONFLICT (name) DO NOTHING""",
        raw_name,
    )
    logger.info("Auto-inserted new exercise: '%s'", raw_name)
    return raw_name
