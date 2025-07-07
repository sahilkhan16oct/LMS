// 📁 backend-api/models/Notice.js
const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notice", noticeSchema);
