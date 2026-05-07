const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  note: {
    type: String,
    required: [true, 'Note content is required'],
    trim: true,
    maxlength: [5000, 'Note cannot exceed 5000 characters'],
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: (v) => v.length <= 10,
      message: 'Cannot have more than 10 tags',
    },
  },
}, { timestamps: true });

noteSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.models.Note || mongoose.model('Note', noteSchema);
