const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const Candidate = require("../models/Candidate");
const Batch = require("../models/Batch");
const mongoose = require("mongoose"); // add on top
const jwt = require("jsonwebtoken");

const Training = require("../models/Training");







// ✅ Upload candidates excel file for a batch by batch id
exports.uploadCandidatesExcel = async (req, res) => {
  try {
    const batchId = req.params.id;
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded." });

    const workbook = xlsx.readFile(file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (json.length === 0) return res.status(400).json({ message: "Excel file is empty." });

    const fieldMap = {
      name: "name",
      candidateid: "candidateId",
      emailid: "email",
      password: "password",
      dateofbirth: "dob",
      mobileno: "phone",
      gender: "gender",
      category: "category",
      disability: "disability",
      typeofdisability: "typeOfDisability",
      domicilestate: "domicileState",
      domiciledistrict: "domicileDistrict",
      educationlevel: "educationLevel",
      permanentaddress: "permanentAddress",
    };

    const fileObjectId = new mongoose.Types.ObjectId(); // ✅ for linking candidates

    const incomingIds = [];
    const incomingPhones = [];
    const rowMap = {};

    json.forEach((row) => {
      const idKey = Object.keys(row).find((k) => k.toLowerCase().includes("candidateid"));
      const phoneKey = Object.keys(row).find((k) => k.toLowerCase().includes("mobile"));

      const cid = row[idKey]?.toString().trim();
      const phone = row[phoneKey]?.toString().trim();

      if (cid) {
        incomingIds.push(cid);
        rowMap[cid] = row; // store original row
      }
      if (phone) incomingPhones.push(phone);
    });

    // ✅ Fetch existing candidates by candidateId
    const existingCandidates = await Candidate.find({ candidateId: { $in: incomingIds } });

    const duplicateInSameBatch = [];
    const newCandidates = [];

    for (let cid of incomingIds) {
      const row = rowMap[cid];
      const clean = {};
      for (let key in row) {
        const normalizedKey = key.trim().toLowerCase().replace(/\(.*?\)/g, "").replace(/\s+/g, "");
        if (fieldMap[normalizedKey]) {
          clean[fieldMap[normalizedKey]] = row[key];
        }
      }

      const existing = existingCandidates.find((c) => c.candidateId === cid);

      if (!existing) {
        // 🆕 Create new candidate
      // ✅ Fetch assigned training and chapters (to embed into new candidate)
const assignedTraining = await Training.findOne().lean(); // or fetch based on logic if needed
const trainingChapters = assignedTraining?.chapters || [];

const personalizedChapters = trainingChapters.map(ch => ({
  chapterId: ch._id.toString(),
  name: ch.name,
  description: ch.description,
  duration: ch.duration,
  pdf: ch.pdf,
  linkedTestId: ch.linkedTestId || null,
  unlocksChapters: ch.unlocksChapters || [],
  dependentChapters: ch.dependentChapters || [],
  indexes: ch.indexes || []
}));

const newCandidate = new Candidate({
  ...clean,
  candidateId: cid,
  batches: [
    {
      batch: batchId,
      fileId: fileObjectId,
      rawData: { ...row, sourceFile: file.originalname },
    },
  ],
  assignedTrainings: [
    {
      trainingId: assignedTraining._id,
      batchId: batchId,
      assignedAt: new Date(),
      status: "not_started",
      chapters: personalizedChapters
    }
  ]
});

        newCandidates.push(newCandidate);
      } else {
        // 🧠 Candidate exists — check if already in this batch
        const alreadyInBatch = existing.batches.some(
          (b) => b.batch.toString() === batchId
        );
        if (alreadyInBatch) {
          duplicateInSameBatch.push(cid);
        } else {
          existing.batches.push({
            batch: batchId,
            fileId: fileObjectId,
            rawData: { ...row, sourceFile: file.originalname },
          });
          await existing.save();
        }
      }
    }

    // ❌ If any duplicate candidateId in same batch
    if (duplicateInSameBatch.length > 0) {
      return res.status(400).json({
        message: "Upload failed. Some Candidate IDs are already uploaded in this batch.",
        duplicates: {
          candidateIds: duplicateInSameBatch,
        },
      });
    }

    // ✅ Insert all new candidates
    if (newCandidates.length > 0) {
      await Candidate.insertMany(newCandidates);
    }

    // ✅ Update batch with uploaded file metadata
    await Batch.findByIdAndUpdate(batchId, {
      $push: {
        uploadedFiles: {
          _id: fileObjectId,
          filename: file.filename,
          originalname: file.originalname,
          path: file.path,
          uploadedAt: new Date(),
        },
      },
    });

    res.status(200).json({
      message: "Candidates uploaded and saved.",
      count: newCandidates.length + (existingCandidates.length - duplicateInSameBatch.length),
      file: file.originalname,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed." });
  }
};





// ✅ Get candidates by file ID (based on nested batch/file match)
exports.getCandidatesByFileId = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const batchId = req.params.batchId;

    const candidates = await Candidate.find({
      batches: {
        $elemMatch: {
          batch: new mongoose.Types.ObjectId(batchId),
          fileId: new mongoose.Types.ObjectId(fileId)
        }
      }
    });

    res.status(200).json(candidates);
  } catch (err) {
    console.error("Error fetching candidates by file:", err);
    res.status(500).json({ message: "Server error" });
  }
};




//search candidate in a batch controller
exports.searchCandidatesInBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ message: "Search term is required." });
    }

    const regex = new RegExp(q.trim(), 'i'); // case-insensitive

    const candidates = await Candidate.find({
      batch: batchId,
      $or: [
        { name: regex },
        { candidateId: regex },
        { email: regex },
        { phone: regex },
        { gender: regex },
        { category: regex },
        { domicileState: regex },
        { domicileDistrict: regex },
        { educationLevel: regex },
        { permanentAddress: regex }
      ]
    }).limit(20); // limit for performance

    res.status(200).json(candidates);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ✅ Update a candidate
exports.updateCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const updatedData = req.body;

    const updatedCandidate = await Candidate.findByIdAndUpdate(candidateId, updatedData, {
      new: true,
    });

    if (!updatedCandidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json(updatedCandidate);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// ✅ Delete a candidate
exports.deleteCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const deleted = await Candidate.findByIdAndDelete(candidateId);

    if (!deleted) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json({ message: "Candidate deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


//candidate login controller
exports.loginCandidate = async (req, res) => {
  const { candidateId, password } = req.body;

  if (!candidateId || !password) {
    return res.status(400).json({ message: "Candidate ID and password are required." });
  }

  try {
    const candidate = await Candidate.findOne({ candidateId });
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found." });
    }

    if (candidate.password !== password) {
      return res.status(401).json({ message: "Invalid password." });
    }

    const token = jwt.sign(
      {
        id: candidate._id,
        sub: candidate._id.toString(),
        candidateId: candidate.candidateId,
        role: "candidate"
      },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    res.status(200).json({ token, role: "candidate" });
  } catch (err) {
    console.error("Candidate login error:", err);
    res.status(500).json({ message: "Server error." });
  }
};



// GET /api/candidate/assigned-training
exports.getAssignedTrainings = async (req, res) => {
  try {
    const candidateId = req.user.id;

    const candidate = await Candidate.findById(candidateId).populate("assignedTrainings.trainingId");
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const assignedTrainings = candidate.assignedTrainings.map(entry => entry.trainingId).filter(Boolean);
    res.status(200).json(assignedTrainings);
  } catch (err) {
    console.error("Fetch assigned trainings error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



//candidate profile controller:-->
exports.getCandidateProfile = async (req, res) => {
  try {
    const candidateId = req.user?.id;
    if (!candidateId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const candidate = await Candidate.findById(candidateId)
      .populate("assignedTrainings.trainingId")
      .select("-password -__v")
      .lean();

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // ✅ Inject chapterId properly inside assignedTrainings[].chapters[]
    candidate.assignedTrainings = candidate.assignedTrainings.map((training) => {
      const updatedChapters = training.chapters.map((ch) => ({
        ...ch,
        chapterId: ch.chapterId?.toString() || null,
      }));

      // ✅ Inject updated chapters inside trainingId.chapters for frontend use
      return {
        ...training,
        chapters: updatedChapters,
        trainingId: {
          ...training.trainingId,
          chapters: updatedChapters, // ✅ overwrite chapters here
        },
      };
    });

    res.status(200).json(candidate);
  } catch (err) {
    console.error("Error fetching candidate profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};





//find chapter name by its object id in DB
exports.getChapterNameById = async (req, res) => {
  try {
    const { chapterId } = req.params;

    const training = await Training.findOne({ "chapters._id": chapterId }).lean();

    if (!training) {
      return res.status(404).json({ message: "Training or chapter not found" });
    }

    const chapter = training.chapters.find(ch => ch._id.toString() === chapterId);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    res.status(200).json({ name: chapter.name });
  } catch (err) {
    console.error("Error fetching chapter name:", err);
    res.status(500).json({ message: "Server error" });
  }
};




