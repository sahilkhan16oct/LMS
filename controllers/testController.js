const path = require('path');
const xlsx = require('xlsx');
const axios = require('axios');
const Test = require('../models/Test');


const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  }
});

// ✅ Upload Test Excel to S3
exports.uploadTest = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    // ✅ Construct S3 file URL manually
    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${file.key}`;

    // ✅ Download buffer from S3
    const response = await axios.get(s3Url, { responseType: 'arraybuffer' });
    const workbook = xlsx.read(response.data, { type: 'buffer' });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const meta = xlsx.utils.sheet_to_json(sheet, { header: 1 })[1];

    const duration = parseInt(meta[6]); // G column
    const totalQuestionCount = parseInt(meta[7]); // I column
    const randomizedQuestionCount = parseInt(meta[8]); // H column
    const passingPercentage = parseInt(meta[9]); // J column → 10th column, index 9


    const questions = xlsx.utils.sheet_to_json(sheet, {
      header: ['Question', 'A', 'B', 'C', 'D', 'Answer'],
      range: 2,
    });

    const test = new Test({
      title: file.originalname.split('.')[0],
      filePath: s3Url, // ✅ Save the manually created S3 URL
      duration,
      randomizedQuestionCount,
      totalQuestionCount,
      passingPercentage,
      questions,
    });

    await test.save();

    res.status(201).json({ message: 'Test uploaded', test });
  } catch (err) {
    console.error('Error uploading test:', err);
    res.status(500).json({ message: 'Error uploading test', error: err.message });
  }
};


// ✅ Get all tests
exports.getAllTests = async (req, res) => {
  try {
    const tests = await Test.find();
    res.status(200).json(tests);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching tests', error: err.message });
  }
};

// ✅ Delete test from DB + S3
exports.deleteTest = async (req, res) => {
  try {
    const testId = req.params.id;
    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    // 🔥 Delete from S3
    if (test.filePath) {
      const key = test.filePath.split('/').pop();
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      }));
    }

    await Test.findByIdAndDelete(testId);
    res.status(200).json({ message: 'Test and file deleted successfully' });
  } catch (err) {
    console.error("Error deleting test:", err);
    res.status(500).json({ message: 'Failed to delete test', error: err.message });
  }
};

// ✅ Preview test content from S3
exports.previewTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    const response = await axios.get(test.filePath, { responseType: 'arraybuffer' });
    const workbook = xlsx.read(response.data, { type: 'buffer' });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const questions = xlsx.utils.sheet_to_json(sheet, {
      header: ['Question', 'A', 'B', 'C', 'D', 'Answer'],
      range: 1,
    });

    res.status(200).json({ testTitle: test.title, questions });
  } catch (err) {
    console.error("Error previewing test:", err);
    res.status(500).json({ message: "Failed to preview test", error: err.message });
  }
};

// ✅ Download test Excel via redirect to S3
exports.downloadTestFile = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    console.log(test)
    if (!test) return res.status(404).json({ message: "Test not found" });

    res.redirect(test.filePath); // ⬅️ Direct S3 link download
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ message: "Failed to download file" });
  }
};



