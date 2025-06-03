const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  uploadedFiles: [
  {
    filename: String,
    originalname: String,
    path: String,
    uploadedAt: Date,
  },
],

});

module.exports = mongoose.model('Batch', batchSchema);
