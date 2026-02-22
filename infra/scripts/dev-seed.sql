-- Dev seed data — fallback user for testing without B2C
-- This UUID is used by the DEV_MODE auth bypass in backend/app/auth.py

INSERT INTO profiles (id, display_name, email, experience_level, training_goals, available_days, preferred_unit)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Dev User',
    'dev@gymtrainer.local',
    'intermediate',
    '["hypertrophy", "strength"]',
    4,
    'kg'
) ON CONFLICT (id) DO NOTHING;
