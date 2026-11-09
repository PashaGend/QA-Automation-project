import http from 'k6/http';
import { check, sleep } from 'k6';

// Local only, same as every other test in this repo — never point this at production.
const REST_URL = __ENV.REST_URL || 'http://localhost:3000';
const ANON_JWT = __ENV.SUPABASE_ANON_KEY;

export const options = {
  stages: [
    { duration: '10s', target: 20 }, // ramp up to 20 concurrent users
    { duration: '20s', target: 20 }, // hold at 20
    { duration: '5s', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const headers = {
  apikey: ANON_JWT,
  Authorization: 'Bearer ' + ANON_JWT,
  'Content-Type': 'application/json',
};

export default function () {
  // phones always start with 055 so this load test's data can never collide
  // with the other spec files' prefixes (051/052/053) or the seeded admin
  // (0548009108) — same collision-avoidance scheme as the rest of the suite.
  const phone = '05' + (50000000 + Math.floor(Math.random() * 10000000));

  const signupRes = http.post(
    REST_URL + '/users',
    JSON.stringify({ phone: phone, nickname: 'k6_load_' + phone }),
    { headers: Object.assign({}, headers, { Prefer: 'return=representation' }) },
  );
  check(signupRes, { 'signup succeeded': (r) => r.status === 201 });
  const user = JSON.parse(signupRes.body)[0];

  const matchesRes = http.get(REST_URL + '/matches?select=id,match_date&limit=5', { headers: headers });
  check(matchesRes, { 'fetched matches': (r) => r.status === 200 });

  const predictRes = http.post(
    REST_URL + '/predictions',
    JSON.stringify({ user_id: user.id, match_id: 1, prediction: 'home' }),
    { headers: headers },
  );
  check(predictRes, { 'prediction accepted': (r) => r.status === 201 });

  sleep(1);
}
