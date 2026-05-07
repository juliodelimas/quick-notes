const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRES_IN = '1h';

  // Reset cached connection so tests use the in-memory URI
  global.mongoose = { conn: null, promise: null };
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  // Reset the db.js cache between tests
  global.mongoose = { conn: mongoose.connection, promise: null };
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
