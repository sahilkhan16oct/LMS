const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({
  name: String,
  candidateId: String,
  email: { type: String, required: true },
  password: { type: String, required: true },
  dob: String,
  phone: String,
  gender: String,
  category: String,
  disability: String,
  typeOfDisability: String,
  domicileState: String,
  domicileDistrict: String,
  educationLevel: String,
  permanentAddress: String,
 batches: [
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    fileId: { type: mongoose.Schema.Types.ObjectId },
    rawData: Object
  }
],
   assignedTrainings: [
  {
    trainingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Training",
    },
    assignedAt: Date,
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started"
    },
     batchId: { // ✅ ADD THIS LINE
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch"
    }
  }
],
testResults: [
  {
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
    scorePercentage: Number,
    status: { type: String, enum: ['pass', 'fail'] },
    attemptedAt: { type: Date, default: Date.now },
    attemptCount: { type: Number, default: 1 }
  }
]


});

module.exports = mongoose.model("Candidate", candidateSchema);
