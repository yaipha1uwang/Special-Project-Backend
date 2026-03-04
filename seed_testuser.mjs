import { neon } from '@neondatabase/serverless';
import { hash } from 'argon2';
import { config } from 'dotenv';
config();

const sql = neon(process.env.DATABASE_URL);

// Current time in IST (UTC+5:30) — matches the user's timezone
const nowIST = new Date('2026-03-04T21:37:37+05:30');

function daysAgo(n) {
    const d = new Date(nowIST);
    d.setDate(d.getDate() - n);
    return d;
}

function daysFromNow(n) {
    const d = new Date(nowIST);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
}

function isoAt(date, hour = 10) {
    const d = new Date(date);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
}

async function seed() {
    console.log('🌱 Starting seed for Test User...');

    // 1. Find the Test User
    const users = await sql`SELECT id FROM auth_users WHERE email = 'testuser_cogniX_2@test.com'`;
    if (users.length === 0) {
        console.error('❌ Test User not found. Please sign up first at /account/signup.');
        process.exit(1);
    }
    const userId = users[0].id;
    console.log(`✅ Found Test User: ${userId}`);

    // 1b. Fix Password Hash
    const hashedPassword = await hash('ValidPass1!');
    await sql`
    UPDATE auth_accounts 
    SET password = ${hashedPassword}
    WHERE "userId" = ${userId} AND provider = 'credentials'
  `;
    console.log('🔑 Set correct password hash for ValidPass1!');

    // 2. Clean existing seed data for this user (safe re-run)
    await sql`DELETE FROM pomodoro_sessions WHERE user_id = ${userId}`;
    await sql`DELETE FROM tasks WHERE user_id = ${userId}`;
    await sql`DELETE FROM subjects WHERE user_id = ${userId}`;
    console.log('🧹 Cleared old data for Test User.');

    // 3. Create Subjects
    const subjectRows = await sql`
    INSERT INTO subjects (user_id, name, color, exam_date, is_weak)
    VALUES
      (${userId}, 'Mathematics',       '#8B70F6', ${daysFromNow(30)}, false),
      (${userId}, 'Computer Science',  '#4ECDC4', ${daysFromNow(45)}, false),
      (${userId}, 'Physics',           '#FF6B6B', ${daysFromNow(20)}, true),
      (${userId}, 'English Literature','#F7B731', ${daysFromNow(60)}, false),
      (${userId}, 'Chemistry',         '#FC5C65', ${daysFromNow(25)}, true)
    RETURNING id, name
  `;
    const [math, cs, physics, english, chemistry] = subjectRows;
    const subjectMap = { math, cs, physics, english, chemistry };
    console.log('📚 Created 5 subjects.');

    // 4. Create Tasks — mix of completed, in_progress, todo, overdue
    const taskDefs = [
        // Mathematics
        { title: 'Calculus: Integration by Parts', subject: math.id, status: 'completed', due: daysFromNow(-14), priority: 'high', completed_at: isoAt(daysAgo(14)) },
        { title: 'Linear Algebra: Eigenvalues', subject: math.id, status: 'completed', due: daysFromNow(-10), priority: 'high', completed_at: isoAt(daysAgo(10)) },
        { title: 'Statistics: Probability Distributions', subject: math.id, status: 'completed', due: daysFromNow(-7), priority: 'medium', completed_at: isoAt(daysAgo(7)) },
        { title: 'Differential Equations Assignment', subject: math.id, status: 'in_progress', due: daysFromNow(3), priority: 'high' },
        { title: 'Trigonometry Practice Sheet', subject: math.id, status: 'todo', due: daysFromNow(7), priority: 'low' },
        { title: 'Math Mock Exam', subject: math.id, status: 'todo', due: daysFromNow(28), priority: 'high' },

        // Computer Science
        { title: 'Data Structures: Binary Trees', subject: cs.id, status: 'completed', due: daysFromNow(-12), priority: 'high', completed_at: isoAt(daysAgo(12)) },
        { title: 'Algorithm Analysis: Big O', subject: cs.id, status: 'completed', due: daysFromNow(-8), priority: 'medium', completed_at: isoAt(daysAgo(8)) },
        { title: 'Sorting Algorithms Lab', subject: cs.id, status: 'completed', due: daysFromNow(-3), priority: 'medium', completed_at: isoAt(daysAgo(3)) },
        { title: 'Graph Theory Assignment', subject: cs.id, status: 'in_progress', due: daysFromNow(4), priority: 'high' },
        { title: 'OS: Process Scheduling', subject: cs.id, status: 'todo', due: daysFromNow(9), priority: 'medium' },
        { title: 'Database Normalization', subject: cs.id, status: 'todo', due: daysFromNow(14), priority: 'medium' },

        // Physics
        { title: 'Mechanics: Newton\'s Laws', subject: physics.id, status: 'completed', due: daysFromNow(-15), priority: 'high', completed_at: isoAt(daysAgo(15)) },
        { title: 'Thermodynamics Chapter 3', subject: physics.id, status: 'completed', due: daysFromNow(-9), priority: 'medium', completed_at: isoAt(daysAgo(9)) },
        { title: 'Electricity & Magnetism', subject: physics.id, status: 'in_progress', due: daysFromNow(2), priority: 'high' },
        { title: 'Optics Lab Report', subject: physics.id, status: 'todo', due: daysFromNow(-1), priority: 'high' }, // overdue
        { title: 'Wave Motion Study', subject: physics.id, status: 'todo', due: daysFromNow(12), priority: 'medium' },

        // English
        { title: 'Shakespeare: Hamlet Analysis', subject: english.id, status: 'completed', due: daysFromNow(-11), priority: 'medium', completed_at: isoAt(daysAgo(11)) },
        { title: 'Poetry Essay: Keats', subject: english.id, status: 'completed', due: daysFromNow(-5), priority: 'medium', completed_at: isoAt(daysAgo(5)) },
        { title: 'Novel Study: Great Expectations', subject: english.id, status: 'todo', due: daysFromNow(15), priority: 'low' },
        { title: 'Comparative Essay Draft', subject: english.id, status: 'in_progress', due: daysFromNow(6), priority: 'medium' },

        // Chemistry
        { title: 'Organic Chemistry: Alkanes', subject: chemistry.id, status: 'completed', due: daysFromNow(-13), priority: 'high', completed_at: isoAt(daysAgo(13)) },
        { title: 'Periodic Table Elements', subject: chemistry.id, status: 'completed', due: daysFromNow(-6), priority: 'medium', completed_at: isoAt(daysAgo(6)) },
        { title: 'Chemical Bonding Assignment', subject: chemistry.id, status: 'in_progress', due: daysFromNow(1), priority: 'high' },
        { title: 'Electrochemistry Lab', subject: chemistry.id, status: 'todo', due: daysFromNow(-2), priority: 'high' }, // overdue
        { title: 'Reaction Kinetics Chapter', subject: chemistry.id, status: 'todo', due: daysFromNow(10), priority: 'medium' },
    ];

    const insertedTasks = [];
    for (const t of taskDefs) {
        const rows = await sql`
      INSERT INTO tasks (user_id, title, subject_id, status, due_date, priority, completed_at)
      VALUES (
        ${userId},
        ${t.title},
        ${t.subject},
        ${t.status},
        ${t.due},
        ${t.priority},
        ${t.completed_at || null}
      )
      RETURNING id, subject_id
    `;
        insertedTasks.push(rows[0]);
    }
    console.log(`✅ Created ${insertedTasks.length} tasks.`);

    // 5. Build a task id lookup per subject for Pomodoro linking
    const tasksBySubject = {};
    for (const t of insertedTasks) {
        if (!tasksBySubject[t.subject_id]) tasksBySubject[t.subject_id] = [];
        tasksBySubject[t.subject_id].push(t.id);
    }

    // 6. Pomodoro Sessions — rich data for analytics heatmap + streaks
    // Spread over the last 30 days with varying intensities
    const sessions = [];

    // Days 0–6: active streak (for streak display)
    for (let i = 0; i <= 6; i++) {
        const d = daysAgo(i);
        const subjects = [math, cs, physics];
        for (const subj of subjects) {
            const numSessions = i === 0 ? 4 : (i <= 2 ? 3 : 2);
            for (let s = 0; s < numSessions; s++) {
                sessions.push({ date: d, hour: 9 + s * 2, subjectId: subj.id, duration: 25 });
            }
        }
    }

    // Days 7–14: moderate activity
    for (let i = 7; i <= 14; i++) {
        if (i % 2 === 0) continue; // skip alternate days for realism
        const d = daysAgo(i);
        const subjectPairs = [[math.id, cs.id], [physics.id, chemistry.id], [english.id, math.id]];
        const pair = subjectPairs[i % 3];
        for (const subjId of pair) {
            sessions.push({ date: d, hour: 10, subjectId: subjId, duration: 25 });
            sessions.push({ date: d, hour: 15, subjectId: subjId, duration: 50 }); // longer session
        }
    }

    // Days 15–30: sporadic earlier activity
    for (let i = 15; i <= 30; i++) {
        if (i % 3 === 0) continue; // gaps for realism
        const d = daysAgo(i);
        const allSubjects = [math.id, cs.id, physics.id, english.id, chemistry.id];
        const subjId = allSubjects[i % allSubjects.length];
        sessions.push({ date: d, hour: 11, subjectId: subjId, duration: 25 });
        if (i % 4 === 0) {
            sessions.push({ date: d, hour: 14, subjectId: allSubjects[(i + 2) % allSubjects.length], duration: 25 });
        }
    }

    // Insert all sessions
    for (const sess of sessions) {
        const completedAt = isoAt(sess.date, sess.hour);
        await sql`
      INSERT INTO pomodoro_sessions (user_id, subject_id, duration_minutes, completed, completed_at)
      VALUES (
        ${userId},
        ${sess.subjectId},
        ${sess.duration},
        true,
        ${completedAt}
      )
    `;
    }
    console.log(`⏱️  Created ${sessions.length} pomodoro sessions over the last 30 days.`);

    console.log('\n✅ Seed complete! Test User now has:');
    console.log('   • 5 subjects (Mathematics, Computer Science, Physics, English, Chemistry)');
    console.log('   • 26 tasks across all subjects (completed, in_progress, todo, overdue)');
    console.log(`   • ${sessions.length} pomodoro sessions with a 7-day active streak`);
    console.log('   • Data spans the last 30 days for a rich analytics heatmap');
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
