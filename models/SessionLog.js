const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
  },
  

  loginTime: {
    type: Date,
    default: Date.now,
  },
  logoutTime: {
    type: Date,
  },

  visitedTrainings: [  // ✅ new structure
    {
      trainingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Training',
      },
      trainingTitle: String,
      visitedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
  },
  chapterName: String,

  percentage: Number,
}, { timestamps: true });

module.exports = mongoose.model('SessionLog', sessionLogSchema);
