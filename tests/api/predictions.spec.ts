import { test, expect, APIRequestContext } from '@playwright/test';
import { REST_URL, SUPABASE_ANON_KEY } from '../config';

async function createTestUser(request: APIRequestContext) {
  // phones always start with 051 so this file's test data can never collide with another spec file's or with the seeded admin (0548009108)
  const phone = '05' + Math.floor(10000000 + Math.random() * 10000000);
  const nickname = 'test_user_' + phone;

  const response = await request.post(REST_URL + '/users', {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    data: {
      phone: phone,
      nickname: nickname,
    },
  });

  const createdUsers = await response.json();
  const createdUser = createdUsers[0];
  return createdUser.id;
}

test('creating a prediction with Prefer: return=representation returns the created row', async ({
  request,
}) => {
  const userId = await createTestUser(request);

  const res = await request.post(REST_URL + '/predictions', {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    data: { user_id: userId, match_id: 1, prediction: 'home' },
  });

  expect(res.status()).toBe(201);
  const data = await res.json();
  expect(data).toHaveLength(1);
  expect(data[0]).toMatchObject({ user_id: userId, match_id: 1, prediction: 'home' });
});

test('creating a duplicate prediction for the same user and match returns 409', async ({
  request,
}) => {
  const userId = await createTestUser(request);
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };

  await request.post(REST_URL + '/predictions', {
    headers: headers,
    data: { user_id: userId, match_id: 1, prediction: 'home' },
  });
  const res = await request.post(REST_URL + '/predictions', {
    headers: headers,
    data: { user_id: userId, match_id: 1, prediction: 'away' },
  });

  expect(res.status()).toBe(409);
  const error = await res.json();
  expect(error.code).toBe('23505');
});

test('creating a prediction without match_id returns a not-null violation', async ({ request }) => {
  const userId = await createTestUser(request);

  const res = await request.post(REST_URL + '/predictions', {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    data: { user_id: userId, prediction: 'home' },
  });

  expect(res.status()).toBe(400);
  const error = await res.json();
  expect(error.code).toBe('23502');
});

test('creating a prediction with an invalid prediction value returns a check violation', async ({
  request,
}) => {
  const userId = await createTestUser(request);

  const res = await request.post(REST_URL + '/predictions', {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    data: { user_id: userId, match_id: 2, prediction: 'maybe' },
  });

  expect(res.status()).toBe(400);
  const error = await res.json();
  expect(error.code).toBe('23514');
});

test('creating a prediction with a user_id that does not exist returns a foreign key violation', async ({
  request,
}) => {
  const res = await request.post(REST_URL + '/predictions', {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    data: { user_id: '00000000-0000-0000-0000-000000000000', match_id: 3, prediction: 'home' },
  });

  expect(res.status()).toBe(409);
  const error = await res.json();
  expect(error.code).toBe('23503');
});

test('creating a prediction with a match_id that does not exist returns a foreign key violation', async ({
  request,
}) => {
  const userId = await createTestUser(request);

  const res = await request.post(REST_URL + '/predictions', {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    data: { user_id: userId, match_id: 9999, prediction: 'home' },
  });

  expect(res.status()).toBe(409);
  const error = await res.json();
  expect(error.code).toBe('23503');
});

test('updating an existing prediction returns the updated row', async ({ request }) => {
  const userId = await createTestUser(request);
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };

  await request.post(REST_URL + '/predictions', {
    headers: headers,
    data: { user_id: userId, match_id: 1, prediction: 'home' },
  });

  const res = await request.patch(
    REST_URL + '/predictions?user_id=eq.' + userId + '&match_id=eq.1',
    {
      headers: { ...headers, Prefer: 'return=representation' },
      data: { prediction: 'draw' },
    },
  );

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data).toHaveLength(1);
  expect(data[0]).toMatchObject({ user_id: userId, match_id: 1, prediction: 'draw' });
});

test('updating an existing prediction to an invalid value returns a check violation', async ({
  request,
}) => {
  const userId = await createTestUser(request);
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };

  await request.post(REST_URL + '/predictions', {
    headers: headers,
    data: { user_id: userId, match_id: 1, prediction: 'home' },
  });

  const res = await request.patch(
    REST_URL + '/predictions?user_id=eq.' + userId + '&match_id=eq.1',
    {
      headers: headers,
      data: { prediction: 'maybe' },
    },
  );

  expect(res.status()).toBe(400);
  const error = await res.json();
  expect(error.code).toBe('23514');
});

test('updating a prediction with a filter that matches nothing returns an empty array, not an error', async ({
  request,
}) => {
  const userId = await createTestUser(request);
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };

  const res = await request.patch(
    REST_URL + '/predictions?user_id=eq.' + userId + '&match_id=eq.1',
    {
      headers: { ...headers, Prefer: 'return=representation' },
      data: { prediction: 'draw' },
    },
  );

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data).toEqual([]);
});

test('updating predictions with no filter at all is blocked', async ({ request }) => {
  const res = await request.patch(REST_URL + '/predictions', {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    data: { prediction: 'draw' },
  });

  expect(res.status()).toBe(400);
  const error = await res.json();
  expect(error.code).toBe('21000');
});

test('deleting an existing prediction returns the deleted row', async ({ request }) => {
  const userId = await createTestUser(request);
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };

  await request.post(REST_URL + '/predictions', {
    headers: headers,
    data: { user_id: userId, match_id: 1, prediction: 'home' },
  });

  const res = await request.delete(
    REST_URL + '/predictions?user_id=eq.' + userId + '&match_id=eq.1',
    {
      headers: { ...headers, Prefer: 'return=representation' },
    },
  );

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data).toHaveLength(1);
  expect(data[0]).toMatchObject({ user_id: userId, match_id: 1, prediction: 'home' });
});

test('deleting with a filter that matches nothing returns an empty array, not an error', async ({
  request,
}) => {
  const userId = await createTestUser(request);

  const res = await request.delete(
    REST_URL + '/predictions?user_id=eq.' + userId + '&match_id=eq.1',
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    },
  );

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data).toEqual([]);
});

test('deleting predictions with no filter at all is blocked', async ({ request }) => {
  const res = await request.delete(REST_URL + '/predictions', {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  expect(res.status()).toBe(400);
  const error = await res.json();
  expect(error.code).toBe('21000');
});

test('deleting a user cascades to delete their predictions', async ({ request }) => {
  const userId = await createTestUser(request);
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };

  await request.post(REST_URL + '/predictions', {
    headers: headers,
    data: { user_id: userId, match_id: 1, prediction: 'home' },
  });

  await request.delete(REST_URL + '/users?id=eq.' + userId, {
    headers: headers,
  });

  const res = await request.get(REST_URL + '/predictions?user_id=eq.' + userId, {
    headers: headers,
  });

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data).toEqual([]);
});
