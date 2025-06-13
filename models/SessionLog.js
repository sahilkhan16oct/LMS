const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
  },
  email: String,
  name: String,
  phone: String,

  loginTime: {
    type: Date,
    default: Date.now,
  },
  logoutTime: {
    type: Date,
  },

  trainingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Training',
  },
  trainingTitle: String,

  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
  },
  chapterName: String,

  percentage: Number,
}, { timestamps: true });

module.exports = mongoose.model('SessionLog', sessionLogSchema);
