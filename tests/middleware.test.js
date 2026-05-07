const request = require('supertest');
const app = require('../api/index');

describe('Auth middleware', () => {
  it('rejects requests with no Authorization header', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  it('rejects requests with a malformed token', async () => {
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', 'Bearer not.a.valid.token');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or expired token/i);
  });

  it('rejects requests with wrong scheme (no Bearer prefix)', async () => {
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', 'Token sometoken');

    expect(res.status).toBe(401);
  });
});
