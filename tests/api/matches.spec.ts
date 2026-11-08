import { test, expect } from '@playwright/test';
import { REST_URL, SUPABASE_ANON_KEY } from '../config';

test(' fetch first three matches from the API', async ({ request }) => {
  const res = await request.get(`${REST_URL}/matches?select=id,match_date&limit=3`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data).toHaveLength(3);
  expect(data[0]).toHaveProperty('id');
  expect(data[0]).toHaveProperty('match_date');
});

test('fetching all matches returns exactly 104', async ({ request }) => {
  const res = await request.get(`${REST_URL}/matches`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data).toHaveLength(104);
});

test('fetching a match that does not exist returns an empty array, not an error', async ({ request }) => {
  const res = await request.get(`${REST_URL}/matches?id=eq.9999`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data).toEqual([]);
});
