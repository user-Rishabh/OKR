-- Migration: Add full_name to users and update seeded users

ALTER TABLE users ADD COLUMN full_name TEXT;

-- Update seeded users with distinct Indian names matching their job title roles
UPDATE users SET full_name = 'Rohan Verma' WHERE job_title = 'Engineering Manager';
UPDATE users SET full_name = 'Aarav Patel' WHERE job_title = 'Backend Engineer';
UPDATE users SET full_name = 'Ananya Sharma' WHERE job_title = 'Frontend Engineer';
UPDATE users SET full_name = 'Kabir Singh' WHERE job_title = 'DevOps Engineer';
UPDATE users SET full_name = 'Meera Nair' WHERE job_title = 'QA Engineer';

-- Handle any unpopulated user rows
UPDATE users SET full_name = 'Demo User' WHERE full_name IS NULL;

-- Set column to NOT NULL
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;
