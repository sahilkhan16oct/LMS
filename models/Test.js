const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  Question: String,
  A: String,
  B: String,
  C: String,
  D: String,
  Answer: String,
});

const testSchema = new mongoose.Schema({
  title: String,
  filePath: String,
  duration: Number,
  totalQuestionCount: Number, 
  randomizedQuestionCount: Number,
  passingPercentage: Number,
   questions: [questionSchema],
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);
