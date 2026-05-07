const express = require('express');
const { body, validationResult } = require('express-validator');
const Note = require('../models/Note');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

const noteValidators = [
  body('note').trim().notEmpty().withMessage('Note content is required').isLength({ max: 5000 }),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array of up to 10 items')
    .customSanitizer((tags) => tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)),
];

// GET /api/notes — list all notes (with optional tag filter)
router.get('/', async (req, res) => {
  try {
    const filter = { user: req.userId };
    if (req.query.tag) filter.tags = req.query.tag.toLowerCase();

    const notes = await Note.find(filter).sort({ createdAt: -1 }).lean();
    res.json(notes);
  } catch {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// GET /api/notes/random — get one random note
router.get('/random', async (req, res) => {
  try {
    const count = await Note.countDocuments({ user: req.userId });
    if (count === 0) return res.status(404).json({ error: 'No notes found' });

    const skip = Math.floor(Math.random() * count);
    const note = await Note.findOne({ user: req.userId }).skip(skip).lean();
    res.json(note);
  } catch {
    res.status(500).json({ error: 'Failed to fetch random note' });
  }
});

// GET /api/notes/:id — get single note
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.userId }).lean();
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch {
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// POST /api/notes — create note
router.post('/', noteValidators, validate, async (req, res) => {
  try {
    const { note, tags = [] } = req.body;
    const created = await Note.create({ user: req.userId, note, tags });
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PUT /api/notes/:id — update note
router.put('/:id', noteValidators, validate, async (req, res) => {
  try {
    const { note, tags } = req.body;
    const updated = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { note, tags },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Note not found' });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id — delete note
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Note.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!deleted) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
