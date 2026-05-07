const request = require('supertest');
const app = require('../api/index');

let token;

beforeEach(async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });
  token = res.body.token;
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('POST /api/notes', () => {
  it('creates a note and returns 201', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set(auth())
      .send({ note: 'My first note', tags: ['javascript', 'learning'] });

    expect(res.status).toBe(201);
    expect(res.body.note).toBe('My first note');
    expect(res.body.tags).toEqual(['javascript', 'learning']);
  });

  it('rejects empty note content with 400', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set(auth())
      .send({ note: '' });

    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({ note: 'No auth' });

    expect(res.status).toBe(401);
  });

  it('rejects more than 10 tags with 400', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set(auth())
      .send({ note: 'Too many tags', tags: Array.from({ length: 11 }, (_, i) => `tag${i}`) });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/notes', () => {
  beforeEach(async () => {
    await request(app).post('/api/notes').set(auth()).send({ note: 'Note A', tags: ['js'] });
    await request(app).post('/api/notes').set(auth()).send({ note: 'Note B', tags: ['python'] });
  });

  it('returns all notes for the user', async () => {
    const res = await request(app).get('/api/notes').set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters notes by tag', async () => {
    const res = await request(app).get('/api/notes?tag=js').set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].note).toBe('Note A');
  });

  it('returns empty array when no notes exist', async () => {
    // Register a fresh user with no notes
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'password123' });
    const freshToken = reg.body.token;

    const res = await request(app)
      .get('/api/notes')
      .set({ Authorization: `Bearer ${freshToken}` });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('GET /api/notes/random', () => {
  it('returns a note when notes exist', async () => {
    await request(app).post('/api/notes').set(auth()).send({ note: 'Random note' });
    const res = await request(app).get('/api/notes/random').set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('note');
  });

  it('returns 404 when no notes exist', async () => {
    const res = await request(app).get('/api/notes/random').set(auth());

    expect(res.status).toBe(404);
  });
});

describe('GET /api/notes/:id', () => {
  it('returns the note for a valid id', async () => {
    const created = await request(app)
      .post('/api/notes')
      .set(auth())
      .send({ note: 'Specific note' });

    const res = await request(app)
      .get(`/api/notes/${created.body._id}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.note).toBe('Specific note');
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app)
      .get('/api/notes/000000000000000000000000')
      .set(auth());

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/notes/:id', () => {
  it('updates note content and tags', async () => {
    const created = await request(app)
      .post('/api/notes')
      .set(auth())
      .send({ note: 'Old content', tags: ['old'] });

    const res = await request(app)
      .put(`/api/notes/${created.body._id}`)
      .set(auth())
      .send({ note: 'New content', tags: ['new'] });

    expect(res.status).toBe(200);
    expect(res.body.note).toBe('New content');
    expect(res.body.tags).toEqual(['new']);
  });

  it('returns 404 for another user\'s note', async () => {
    const created = await request(app)
      .post('/api/notes')
      .set(auth())
      .send({ note: 'Alice note' });

    const bob = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'password123' });

    const res = await request(app)
      .put(`/api/notes/${created.body._id}`)
      .set({ Authorization: `Bearer ${bob.body.token}` })
      .send({ note: 'Bob tries to update', tags: [] });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/notes/:id', () => {
  it('deletes a note and returns confirmation', async () => {
    const created = await request(app)
      .post('/api/notes')
      .set(auth())
      .send({ note: 'To be deleted' });

    const res = await request(app)
      .delete(`/api/notes/${created.body._id}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 404 for a non-existent note', async () => {
    const res = await request(app)
      .delete('/api/notes/000000000000000000000000')
      .set(auth());

    expect(res.status).toBe(404);
  });

  it('returns 404 when another user tries to delete', async () => {
    const created = await request(app)
      .post('/api/notes')
      .set(auth())
      .send({ note: 'Alice note' });

    const bob = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'password123' });

    const res = await request(app)
      .delete(`/api/notes/${created.body._id}`)
      .set({ Authorization: `Bearer ${bob.body.token}` });

    expect(res.status).toBe(404);
  });
});
