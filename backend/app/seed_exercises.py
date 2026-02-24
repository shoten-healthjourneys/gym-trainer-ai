import logging

import asyncpg

logger = logging.getLogger("seed_exercises")

EXERCISES = [
    # Chest
    {"name": "Barbell Bench Press", "aliases": ["Bench Press", "Flat Bench", "BB Bench"], "muscle_group": "chest", "category": "compound", "equipment": "barbell"},
    {"name": "Incline Barbell Bench Press", "aliases": ["Incline Bench", "Incline Press", "Incline BB Bench"], "muscle_group": "chest", "category": "compound", "equipment": "barbell"},
    {"name": "Dumbbell Bench Press", "aliases": ["DB Bench Press", "DB Bench", "Flat DB Bench"], "muscle_group": "chest", "category": "compound", "equipment": "dumbbell"},
    {"name": "Incline Dumbbell Bench Press", "aliases": ["Incline DB Bench", "Incline DB Press"], "muscle_group": "chest", "category": "compound", "equipment": "dumbbell"},
    {"name": "Dumbbell Fly", "aliases": ["DB Fly", "Chest Fly", "Flat Fly"], "muscle_group": "chest", "category": "isolation", "equipment": "dumbbell"},
    {"name": "Cable Crossover", "aliases": ["Cable Fly", "Cable Chest Fly"], "muscle_group": "chest", "category": "isolation", "equipment": "cable"},
    {"name": "Chest Dip", "aliases": ["Dip", "Weighted Dip"], "muscle_group": "chest", "category": "compound", "equipment": "bodyweight"},
    {"name": "Machine Chest Press", "aliases": ["Chest Press Machine", "Seated Chest Press"], "muscle_group": "chest", "category": "compound", "equipment": "machine"},
    {"name": "Pec Deck", "aliases": ["Pec Deck Fly", "Machine Fly"], "muscle_group": "chest", "category": "isolation", "equipment": "machine"},

    # Back
    {"name": "Conventional Deadlift", "aliases": ["Deadlift", "DL"], "muscle_group": "back", "category": "compound", "equipment": "barbell"},
    {"name": "Sumo Deadlift", "aliases": ["Sumo DL"], "muscle_group": "back", "category": "compound", "equipment": "barbell"},
    {"name": "Romanian Deadlift", "aliases": ["RDL", "Stiff Leg Deadlift"], "muscle_group": "back", "category": "compound", "equipment": "barbell"},
    {"name": "Barbell Row", "aliases": ["Bent Over Row", "BB Row", "Barbell Bent Over Row"], "muscle_group": "back", "category": "compound", "equipment": "barbell"},
    {"name": "Dumbbell Row", "aliases": ["DB Row", "Single Arm Row", "One Arm DB Row"], "muscle_group": "back", "category": "compound", "equipment": "dumbbell"},
    {"name": "Pull-Up", "aliases": ["Pullup", "Pull Up", "Weighted Pull-Up"], "muscle_group": "back", "category": "bodyweight", "equipment": "bodyweight"},
    {"name": "Chin-Up", "aliases": ["Chinup", "Chin Up", "Weighted Chin-Up"], "muscle_group": "back", "category": "bodyweight", "equipment": "bodyweight"},
    {"name": "Lat Pulldown", "aliases": ["Lat Pull Down", "Cable Pulldown", "Wide Grip Pulldown"], "muscle_group": "back", "category": "compound", "equipment": "cable"},
    {"name": "Seated Cable Row", "aliases": ["Cable Row", "Seated Row"], "muscle_group": "back", "category": "compound", "equipment": "cable"},
    {"name": "T-Bar Row", "aliases": ["T Bar Row", "Landmine Row"], "muscle_group": "back", "category": "compound", "equipment": "barbell"},
    {"name": "Face Pull", "aliases": ["Cable Face Pull"], "muscle_group": "back", "category": "isolation", "equipment": "cable"},

    # Shoulders
    {"name": "Overhead Press", "aliases": ["OHP", "Shoulder Press", "Military Press", "Standing Press"], "muscle_group": "shoulders", "category": "compound", "equipment": "barbell"},
    {"name": "Dumbbell Shoulder Press", "aliases": ["DB Shoulder Press", "Seated DB Press", "DB OHP"], "muscle_group": "shoulders", "category": "compound", "equipment": "dumbbell"},
    {"name": "Arnold Press", "aliases": ["Arnold Dumbbell Press"], "muscle_group": "shoulders", "category": "compound", "equipment": "dumbbell"},
    {"name": "Lateral Raise", "aliases": ["Side Raise", "DB Lateral Raise", "Side Lateral Raise"], "muscle_group": "shoulders", "category": "isolation", "equipment": "dumbbell"},
    {"name": "Front Raise", "aliases": ["DB Front Raise", "Dumbbell Front Raise"], "muscle_group": "shoulders", "category": "isolation", "equipment": "dumbbell"},
    {"name": "Reverse Fly", "aliases": ["Rear Delt Fly", "Reverse Dumbbell Fly", "Bent Over Reverse Fly"], "muscle_group": "shoulders", "category": "isolation", "equipment": "dumbbell"},
    {"name": "Upright Row", "aliases": ["Barbell Upright Row", "Cable Upright Row"], "muscle_group": "shoulders", "category": "compound", "equipment": "barbell"},

    # Legs
    {"name": "Barbell Back Squat", "aliases": ["Back Squat", "Squat", "BB Squat"], "muscle_group": "legs", "category": "compound", "equipment": "barbell"},
    {"name": "Front Squat", "aliases": ["Barbell Front Squat", "BB Front Squat"], "muscle_group": "legs", "category": "compound", "equipment": "barbell"},
    {"name": "Goblet Squat", "aliases": ["DB Goblet Squat", "Kettlebell Goblet Squat"], "muscle_group": "legs", "category": "compound", "equipment": "dumbbell"},
    {"name": "Bulgarian Split Squat", "aliases": ["BSS", "Rear Foot Elevated Split Squat"], "muscle_group": "legs", "category": "compound", "equipment": "dumbbell"},
    {"name": "Leg Press", "aliases": ["Machine Leg Press", "45 Degree Leg Press"], "muscle_group": "legs", "category": "compound", "equipment": "machine"},
    {"name": "Hack Squat", "aliases": ["Machine Hack Squat"], "muscle_group": "legs", "category": "compound", "equipment": "machine"},
    {"name": "Leg Extension", "aliases": ["Machine Leg Extension", "Quad Extension"], "muscle_group": "legs", "category": "isolation", "equipment": "machine"},
    {"name": "Leg Curl", "aliases": ["Lying Leg Curl", "Hamstring Curl", "Seated Leg Curl"], "muscle_group": "legs", "category": "isolation", "equipment": "machine"},
    {"name": "Walking Lunge", "aliases": ["Lunge", "DB Walking Lunge", "Dumbbell Lunge"], "muscle_group": "legs", "category": "compound", "equipment": "dumbbell"},
    {"name": "Calf Raise", "aliases": ["Standing Calf Raise", "Machine Calf Raise"], "muscle_group": "legs", "category": "isolation", "equipment": "machine"},
    {"name": "Seated Calf Raise", "aliases": ["Seated Calf"], "muscle_group": "legs", "category": "isolation", "equipment": "machine"},
    {"name": "Hip Thrust", "aliases": ["Barbell Hip Thrust", "Glute Bridge"], "muscle_group": "legs", "category": "compound", "equipment": "barbell"},
    {"name": "Good Morning", "aliases": ["Barbell Good Morning"], "muscle_group": "legs", "category": "compound", "equipment": "barbell"},

    # Arms - Biceps
    {"name": "Barbell Curl", "aliases": ["BB Curl", "Standing Barbell Curl", "Bicep Curl"], "muscle_group": "arms", "category": "isolation", "equipment": "barbell"},
    {"name": "Dumbbell Curl", "aliases": ["DB Curl", "Standing DB Curl", "Bicep DB Curl"], "muscle_group": "arms", "category": "isolation", "equipment": "dumbbell"},
    {"name": "Hammer Curl", "aliases": ["DB Hammer Curl", "Dumbbell Hammer Curl"], "muscle_group": "arms", "category": "isolation", "equipment": "dumbbell"},
    {"name": "Incline Dumbbell Curl", "aliases": ["Incline DB Curl", "Incline Curl"], "muscle_group": "arms", "category": "isolation", "equipment": "dumbbell"},
    {"name": "Preacher Curl", "aliases": ["EZ Bar Preacher Curl", "Machine Preacher Curl"], "muscle_group": "arms", "category": "isolation", "equipment": "barbell"},
    {"name": "Cable Curl", "aliases": ["Cable Bicep Curl", "Standing Cable Curl"], "muscle_group": "arms", "category": "isolation", "equipment": "cable"},
    {"name": "Concentration Curl", "aliases": ["Seated Concentration Curl", "DB Concentration Curl"], "muscle_group": "arms", "category": "isolation", "equipment": "dumbbell"},

    # Arms - Triceps
    {"name": "Tricep Pushdown", "aliases": ["Cable Pushdown", "Rope Pushdown", "Tricep Cable Pushdown"], "muscle_group": "arms", "category": "isolation", "equipment": "cable"},
    {"name": "Overhead Tricep Extension", "aliases": ["Tricep Extension", "Cable Overhead Extension", "DB Overhead Extension"], "muscle_group": "arms", "category": "isolation", "equipment": "cable"},
    {"name": "Skull Crusher", "aliases": ["Lying Tricep Extension", "EZ Bar Skull Crusher"], "muscle_group": "arms", "category": "isolation", "equipment": "barbell"},
    {"name": "Close Grip Bench Press", "aliases": ["CGBP", "Close Grip BP", "Narrow Grip Bench"], "muscle_group": "arms", "category": "compound", "equipment": "barbell"},
    {"name": "Tricep Dip", "aliases": ["Bench Dip", "Bodyweight Tricep Dip"], "muscle_group": "arms", "category": "bodyweight", "equipment": "bodyweight"},

    # Core
    {"name": "Plank", "aliases": ["Front Plank", "Forearm Plank"], "muscle_group": "core", "category": "bodyweight", "equipment": "bodyweight"},
    {"name": "Hanging Leg Raise", "aliases": ["Leg Raise", "Hanging Knee Raise"], "muscle_group": "core", "category": "bodyweight", "equipment": "bodyweight"},
    {"name": "Cable Crunch", "aliases": ["Kneeling Cable Crunch"], "muscle_group": "core", "category": "isolation", "equipment": "cable"},
    {"name": "Ab Wheel Rollout", "aliases": ["Ab Roller", "Ab Wheel"], "muscle_group": "core", "category": "bodyweight", "equipment": "bodyweight"},
    {"name": "Russian Twist", "aliases": ["Weighted Russian Twist"], "muscle_group": "core", "category": "bodyweight", "equipment": "bodyweight"},
    {"name": "Dead Bug", "aliases": [], "muscle_group": "core", "category": "bodyweight", "equipment": "bodyweight"},

    # Cardio
    {"name": "Treadmill Run", "aliases": ["Treadmill", "Running"], "muscle_group": "full_body", "category": "cardio", "equipment": "machine"},
    {"name": "Rowing Machine", "aliases": ["Rower", "Erg", "Indoor Row"], "muscle_group": "full_body", "category": "cardio", "equipment": "machine"},
    {"name": "Assault Bike", "aliases": ["Air Bike", "Fan Bike"], "muscle_group": "full_body", "category": "cardio", "equipment": "machine"},
    {"name": "Battle Ropes", "aliases": ["Battle Rope", "Rope Slams"], "muscle_group": "full_body", "category": "cardio", "equipment": "bodyweight"},
]


async def seed_exercises(conn: asyncpg.Connection) -> None:
    """Insert canonical exercises on startup (ON CONFLICT DO NOTHING)."""
    inserted = 0
    for ex in EXERCISES:
        result = await conn.execute(
            """INSERT INTO exercises (name, aliases, muscle_group, category, equipment)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (name) DO NOTHING""",
            ex["name"],
            ex["aliases"],
            ex["muscle_group"],
            ex["category"],
            ex["equipment"],
        )
        if result == "INSERT 0 1":
            inserted += 1
    logger.info("Seeded %d new exercises (%d total in seed list)", inserted, len(EXERCISES))
