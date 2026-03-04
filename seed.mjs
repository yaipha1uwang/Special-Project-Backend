import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function seed() {
  console.log("Starting DB initialization and seeding...");

  // Create tables if they do not exist
  await sql`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
      daily_study_hours INT DEFAULT 2,
      preferred_study_time TEXT DEFAULT 'morning',
      theme_preference TEXT DEFAULT 'system',
      notification_preferences JSONB DEFAULT '{}'::jsonb,
      enable_spaced_repetition BOOLEAN DEFAULT true,
      enable_ai_optimization BOOLEAN DEFAULT true,
      weak_subjects JSONB DEFAULT '[]'::jsonb,
      onboarding_completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS subjects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      exam_date TEXT,
      weak_areas TEXT,
      color TEXT,
      is_weak BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATE,
      subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'todo',
      is_revision BOOLEAN DEFAULT false,
      revision_number INT DEFAULT 0,
      original_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
      task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
      subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
      duration_minutes INT DEFAULT 25,
      completed BOOLEAN DEFAULT false,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_data JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  console.log("Schema initialized.");

  // 1. Get first user
  const users = await sql`SELECT id FROM auth_users LIMIT 1`;
  if (users.length === 0) {
    console.error("No users found. Please sign up first.");
    process.exit(1);
  }
  const userId = users[0].id;
  console.log(`Seeding data for user: ${userId}`);

  // 2. Create subjects
  const subjects = await sql`
    INSERT INTO subjects (user_id, name, color)
    VALUES 
      (${userId}, 'Mathematics', '#8B70F6'),
      (${userId}, 'Computer Science', '#4ECDC4'),
      (${userId}, 'History', '#FFA07A')
    RETURNING id
  `;
  const [mathId, csId, historyId] = subjects.map(s => s.id);
  console.log("Created 3 subjects.");

  // 3. Create tasks (Overdue, Pending, Completed)
  await sql`
    INSERT INTO tasks (user_id, title, status, due_date, subject_id)
    VALUES
      (${userId}, 'Calculus Assignment', 'completed', CURRENT_DATE - INTERVAL '1 day', ${mathId}),
      (${userId}, 'Linear Algebra Quiz', 'in_progress', CURRENT_DATE + INTERVAL '2 days', ${mathId}),
      (${userId}, 'Data Structures Lab', 'todo', CURRENT_DATE + INTERVAL '5 days', ${csId}),
      (${userId}, 'Algorithm Analysis', 'completed', CURRENT_DATE - INTERVAL '3 days', ${csId}),
      (${userId}, 'World War II Essay', 'todo', CURRENT_DATE - INTERVAL '2 days', ${historyId}),
      (${userId}, 'Read Chapter 5', 'todo', CURRENT_DATE + INTERVAL '1 day', ${historyId}),
      (${userId}, 'Read Chapter 6', 'todo', CURRENT_DATE + INTERVAL '3 days', ${historyId})
  `;
  console.log("Created 7 tasks.");

  // 4. Create Pomodoro Sessions
  const sessions = [];
  const today = new Date();

  // Create 5 day streak leading up to today
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    sessions.push({ date: d, duration: 25, subjectId: mathId });
    sessions.push({ date: d, duration: 25, subjectId: csId });
  }

  // Random days over the last 30 days
  for (let i = 6; i < 30; i += 2) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    sessions.push({ date: d, duration: 25, subjectId: historyId });
    sessions.push({ date: d, duration: 25, subjectId: mathId });
    if (i % 3 === 0) {
      sessions.push({ date: d, duration: 25, subjectId: csId });
    }
  }

  let sessionCount = 0;
  for (const session of sessions) {
    await sql`
      INSERT INTO pomodoro_sessions (user_id, subject_id, duration_minutes, completed, completed_at)
      VALUES (${userId}, ${session.subjectId}, ${session.duration}, true, ${session.date.toISOString()})
    `;
    sessionCount++;
  }

  console.log(`Created ${sessionCount} pomodoro sessions over the last 30 days.`);
  console.log("✅ Hypothetical data seeded successfully.");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
