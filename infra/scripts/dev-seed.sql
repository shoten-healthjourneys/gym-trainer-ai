-- Dev seed data — local development user
-- Password: set in your local .env or use: python -c "import bcrypt; print(bcrypt.hashpw(b'YOUR_PASSWORD', bcrypt.gensalt()).decode())"

INSERT INTO profiles (id, display_name, email, password_hash, experience_level, training_goals, available_days, preferred_unit)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Shoten',
    'shotend@gmail.com',
    '$2b$12$C1vfvXSolWbLSuu6xowxT.TvpB6FbkxhwJzeDzRSjKd6254hLCRni',
    'intermediate',
    '["hypertrophy", "strength"]',
    4,
    'kg'
) ON CONFLICT (id) DO NOTHING;
