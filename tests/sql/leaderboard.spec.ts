import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { REST_URL, SUPABASE_ANON_KEY, DB_URL } from '../config';

test('a correct prediction is counted in the leaderboard query', async ({ request }) => {
  const pool = new Pool({ connectionString: DB_URL });
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  // phones always start with 053 so this file's test data can never collide with another spec file's or with the seeded admin (0548009108)
  const phone = '05' + Math.floor(30000000 + Math.random() * 10000000);
  const userRes = await request.post(REST_URL + '/users', {
    headers: headers,
    data: { phone: phone, nickname: 'sql_test_' + phone },
  });
  const [user] = await userRes.json();

  try {
    await request.post(REST_URL + '/predictions', {
      headers: headers,
      data: { user_id: user.id, match_id: 1, prediction: 'home' },
    });
    await request.post(REST_URL + '/results', {
      headers: headers,
      data: { match_id: 1, result: 'home', home_score: 2, away_score: 1 },
    });

    const leaderboardQuery = `
      select count(*)::int as correct_predictions
      from predictions p
      join results r on r.match_id = p.match_id
      join users u on u.id = p.user_id
      where p.prediction = r.result and u.id = $1
    `;

    const afterCreate = await pool.query(leaderboardQuery, [user.id]);
    expect(afterCreate.rows[0].correct_predictions).toBe(1);

    await request.delete(REST_URL + '/predictions?user_id=eq.' + user.id + '&match_id=eq.1', {
      headers: headers,
    });
    await request.delete(REST_URL + '/results?match_id=eq.1', { headers: headers });

    const afterDelete = await pool.query(leaderboardQuery, [user.id]);
    expect(afterDelete.rows[0].correct_predictions).toBe(0);
  } finally {
    // cleanup always runs, even if an assertion above fails mid-test — DELETE on
    // a row that's already gone just returns an empty array, not an error
    await request.delete(REST_URL + '/predictions?user_id=eq.' + user.id + '&match_id=eq.1', {
      headers: headers,
    });
    await request.delete(REST_URL + '/results?match_id=eq.1', { headers: headers });
    await request.delete(REST_URL + '/users?id=eq.' + user.id, { headers: headers });
    await pool.end();
  }
});

test('counting predictions grouped by outcome type', async ({ request }) => {
  const pool = new Pool({ connectionString: DB_URL });
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  // phones always start with 053 so this file's test data can never collide with another spec file's or with the seeded admin (0548009108)
  const createTestUser = async () => {
    const phone = '05' + Math.floor(30000000 + Math.random() * 10000000);
    const res = await request.post(REST_URL + '/users', {
      headers: headers,
      data: { phone: phone, nickname: 'sql_test_' + phone },
    });
    const [user] = await res.json();
    return user.id;
  };

  const userIds = [await createTestUser(), await createTestUser(), await createTestUser()];

  try {
    await request.post(REST_URL + '/predictions', {
      headers: headers,
      data: { user_id: userIds[0], match_id: 2, prediction: 'home' },
    });
    await request.post(REST_URL + '/predictions', {
      headers: headers,
      data: { user_id: userIds[1], match_id: 2, prediction: 'home' },
    });
    await request.post(REST_URL + '/predictions', {
      headers: headers,
      data: { user_id: userIds[2], match_id: 2, prediction: 'draw' },
    });

    const result = await pool.query(
      `select prediction, count(*)::int as total
       from predictions
       where user_id = any($1)
       group by prediction
       order by prediction`,
      [userIds],
    );

    expect(result.rows).toEqual([
      { prediction: 'draw', total: 1 },
      { prediction: 'home', total: 2 },
    ]);
    // cleanup always runs, even if an assertion above fails mid-test
  } finally {
    for (const userId of userIds) {
      await request.delete(REST_URL + '/predictions?user_id=eq.' + userId, { headers: headers });
      await request.delete(REST_URL + '/users?id=eq.' + userId, { headers: headers });
    }
    await pool.end();
  }
});

test('no two users share the same phone number', async () => {
  const pool = new Pool({ connectionString: DB_URL });
  try {
    const result = await pool.query(
      `select phone, count(*)::int as total
       from users
       group by phone
       having count(*) > 1`,
    );
    expect(result.rows).toEqual([]);
  } finally {
    await pool.end();
  }
});

test('leaderboard ranks users by number of correct predictions', async ({ request }) => {
  const pool = new Pool({ connectionString: DB_URL });
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  // phones always start with 053 so this file's test data can never collide with another spec file's or with the seeded admin (0548009108)
  const createTestUser = async () => {
    const phone = '05' + Math.floor(30000000 + Math.random() * 10000000);
    const nickname = 'sql_test_' + phone;
    const res = await request.post(REST_URL + '/users', {
      headers: headers,
      data: { phone: phone, nickname: nickname },
    });
    const [user] = await res.json();
    return { id: user.id, nickname: nickname };
  };

  const userA = await createTestUser();
  const userB = await createTestUser();
  const userIds = [userA.id, userB.id];

  try {
    // match 3 result is 'home', match 4 result is 'away'
    await request.post(REST_URL + '/results', {
      headers: headers,
      data: { match_id: 3, result: 'home', home_score: 1, away_score: 0 },
    });
    await request.post(REST_URL + '/results', {
      headers: headers,
      data: { match_id: 4, result: 'away', home_score: 0, away_score: 1 },
    });

    // userA predicts both correctly, userB predicts only match_id 3 correctly
    await request.post(REST_URL + '/predictions', {
      headers: headers,
      data: { user_id: userA.id, match_id: 3, prediction: 'home' },
    });
    await request.post(REST_URL + '/predictions', {
      headers: headers,
      data: { user_id: userA.id, match_id: 4, prediction: 'away' },
    });
    await request.post(REST_URL + '/predictions', {
      headers: headers,
      data: { user_id: userB.id, match_id: 3, prediction: 'home' },
    });
    await request.post(REST_URL + '/predictions', {
      headers: headers,
      data: { user_id: userB.id, match_id: 4, prediction: 'home' },
    });

    const result = await pool.query(
      `select u.nickname, count(*)::int as correct_predictions
       from predictions p
       join results r on r.match_id = p.match_id
       join users u on u.id = p.user_id
       where p.prediction = r.result and u.id = any($1)
       group by u.nickname
       order by correct_predictions desc`,
      [userIds],
    );

    expect(result.rows).toEqual([
      { nickname: userA.nickname, correct_predictions: 2 },
      { nickname: userB.nickname, correct_predictions: 1 },
    ]);
  } finally {
    for (const userId of userIds) {
      await request.delete(REST_URL + '/predictions?user_id=eq.' + userId, { headers: headers });
      await request.delete(REST_URL + '/users?id=eq.' + userId, { headers: headers });
    }
    await request.delete(REST_URL + '/results?match_id=eq.3', { headers: headers });
    await request.delete(REST_URL + '/results?match_id=eq.4', { headers: headers });
    await pool.end();
  }
});
