const Notice = require("../models/Notice");

// 1. Add a new notice
exports.addNotice = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const newNotice = new Notice({ message });
    await newNotice.save();

    res.status(201).json({ message: "Notice created", notice: newNotice });
  } catch (err) {
    console.error("❌ Add Notice Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 2. Update latest (most recent) notice
exports.updateNotice = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const latestNotice = await Notice.findOne().sort({ createdAt: -1 });

    if (!latestNotice) {
      return res.status(404).json({ error: "No notice found to update" });
    }

    latestNotice.message = message;
    await latestNotice.save();

    res.json({ message: "Notice updated", notice: latestNotice });
  } catch (err) {
    console.error("❌ Update Notice Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 3. Delete latest (most recent) notice
exports.deleteNotice = async (req, res) => {
  try {
    const latestNotice = await Notice.findOne().sort({ createdAt: -1 });

    if (!latestNotice) {
      return res.status(404).json({ error: "No notice found to delete" });
    }

    await latestNotice.deleteOne();

    res.json({ message: "Notice deleted" });
  } catch (err) {
    console.error("❌ Delete Notice Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


// 📁 backend-api/controllers/NoticeController.js

exports.getPublicNotice = async (req, res) => {
  try {
    const notice = await Notice.findOne().sort({ createdAt: -1 });
    if (!notice) {
      return res.status(404).json({ message: "No notice found" });
    }
    res.json({ notice });
  } catch (err) {
    console.error("❌ Error fetching public notice:", err);
    res.status(500).json({ error: "Server error while fetching notice" });
  }
};
