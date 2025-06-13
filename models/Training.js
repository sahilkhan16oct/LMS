const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema({
  trainingId: { type: String, required: true, unique: true },
  trainingTitle: { type: String, required: true },  // Course title
  description: { type: String },
  category: { type: String },
  duration: { type: Number },  // duration in minutes
  startTime: { type: Date },
  endTime: { type: Date },
  videoPath: { type: String },       
  videoFilename: { type: String },
  chapters: [
    {
      name: String,
      description: String,
      duration: Number,
        pdf: String, // ✅ uploaded PDF file path
        
        linkedTestId: {    //linked test
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        default: null
      },
       certificate: {
      filePath: { type: String, default: null }
    },

      unlocksChapters: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }
      ],
      dependentChapters: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }
      ],

      indexes: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
          name: String,
          pageNo: Number,
          videoStartTime: Number,  // 🆕 start time in seconds
          videoEndTime: Number,
          subIndexes: [ // ✅ new added field for nested hierarchy
            {
              _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
              name: String,
              pageNo: Number,
              videoStartTime: Number,  // 🆕 start time in seconds
              videoEndTime: Number,
              subIndexes: [ // ✅ support further nested inside sub topic
                {
                  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
                  name: String,
                  pageNo: Number,
                  videoStartTime: Number,  // 🆕 start time in seconds
                  videoEndTime: Number,
                  subIndexes: [ // ✅ support further nested inside sub topic
                    {
                      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
                      name: String,
                      pageNo: Number,
                      videoStartTime: Number,  // 🆕 start time in seconds
                      videoEndTime: Number,
                      
                    }
                  ]
                  
                }
              ]
            }
          ]
        }
      ]
      
    }
  ],
  
});

module.exports = mongoose.model('Training', trainingSchema);
