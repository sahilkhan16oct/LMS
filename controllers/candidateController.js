const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const Candidate = require("../models/Candidate");
// const fetch = require("node-fetch");
const Batch = require("../models/Batch");
const mongoose = require("mongoose"); // add on top
const jwt = require("jsonwebtoken");

const Training = require("../models/Training");
const SessionLog = require('../models/SessionLog');







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

    // ✅ Check if any training already assigned to this batch
const batch = await Batch.findById(batchId).lean();
const assignedTrainingId = await Candidate.findOne({
  "assignedTrainings.batchId": batchId
}).select("assignedTrainings").lean().then(doc => {
  if (!doc) return null;
  const assigned = doc.assignedTrainings.find(t => t.batchId.toString() === batchId);
  return assigned ? assigned.trainingId : null;
});

let assignedTraining = null;
let personalizedChapters = [];

if (assignedTrainingId) {
  assignedTraining = await Training.findById(assignedTrainingId).lean();
  personalizedChapters = assignedTraining?.chapters.map(ch => ({
    chapterId: ch._id.toString(),
    name: ch.name,
    description: ch.description,
    duration: ch.duration,
    pdf: ch.pdf,
    linkedTestId: ch.linkedTestId || null,
    certificate: ch.certificate || null,
    unlocksChapters: ch.unlocksChapters || [],
    dependentChapters: ch.dependentChapters || [],
    indexes: ch.indexes || []
  })) || [];
}


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
   ...(assignedTraining && {
    assignedTrainings: [
      {
        trainingId: assignedTraining._id,
        batchId: batchId,
        assignedAt: new Date(),
        status: "not_started",
      }
    ]
  })
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
       "batches.batch": batchId,
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




//candidate login controller(given by sahil)
exports.loginCandidate = async (req, res) => {
  const { candidateId, password } = req.body;

  if (!candidateId || !password) {
    return res.status(400).json({ message: "Candidate ID and password are required." });
  }

  try {
    const candidate = await Candidate.findOne({ candidateId: candidateId.trim() });

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

       //creating session log
    await SessionLog.create({
      sessionId: `${candidateId}_${Date.now()}`,
      candidate: candidate._id,
      loginTime: new Date()
    });

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
      .select("-password -__v")
      .populate({
        path: "assignedTrainings.trainingId",
        select:
          "trainingTitle description videoPath duration category startTime endTime chapters",
      })
      .lean();

if (!candidate) {
  return res.status(404).json({ message: "Candidate not found" });
}

candidate.assignedTrainings = candidate.assignedTrainings.map((training) => {
  const trainingDoc = training.trainingId;

  const updatedChapters = training.chapters?.map((assignedChapter) => {
    const liveChapter = trainingDoc?.chapters?.find(
      (ch) => ch._id?.toString() === assignedChapter.chapterId?.toString()
    );

    return {
      chapterId: assignedChapter.chapterId?.toString(),
      name: liveChapter?.name || "",
      description: liveChapter?.description || "",
      duration: liveChapter?.duration || 0,
      pdf: liveChapter?.pdf || null,
      linkedTestId: assignedChapter.linkedTestId || null,
      certificate: liveChapter?.certificate || assignedChapter.certificate || null,
      unlocksChapters: assignedChapter.unlocksChapters || [],
      dependentChapters: assignedChapter.dependentChapters || [],
      indexes: liveChapter?.indexes || [],
    };
  }) || [];

  return {
    ...training,
    chapters: updatedChapters,
    trainingId: {
      ...trainingDoc,
      chapters: updatedChapters, // for frontend compatibility
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


//training fetch for log(candidate kis training m enter krta h)
exports.addTrainingLog = async (req, res) => {
  try {
    const candidateId = req.user.id;
    const { trainingId } = req.body;

    if (!trainingId) {
      return res.status(400).json({ message: "Training ID is required." });
    }

    const training = await Training.findById(trainingId);
    if (!training) {
      return res.status(404).json({ message: "Training not found." });
    }

    // Get latest session
    const lastSession = await SessionLog.findOne({ candidate: candidateId }).sort({ loginTime: -1 });
    if (!lastSession) {
      return res.status(404).json({ message: "No active session found for candidate." });
    }

    // Check if trainingId already exists in visitedTrainings
    const alreadyVisited = lastSession.visitedTrainings?.some(
      (t) => t.trainingId.toString() === trainingId
    );

    if (alreadyVisited) {
      return res.status(200).json({ message: "Training already visited in this session." });
    }

    // Push training into visitedTrainings array
    await SessionLog.updateOne(
      { _id: lastSession._id },
      {
        $push: {
          visitedTrainings: {
            trainingId: training._id,
            trainingTitle: training.trainingTitle,
            visitedAt: new Date(),
          },
        },
      }
    );

    res.status(201).json({ message: "Training session logged successfully." });

  } catch (err) {
    console.error("Add training log error:", err);
    res.status(500).json({ message: "Server error while logging training session." });
  }
};


//candidate logout controller for session log
exports.logoutCandidate = async (req, res) => {
  try {
    const candidateId = req.user.id;

    const lastSession = await SessionLog.findOne({ candidate: candidateId })
      .sort({ loginTime: -1 });

    if (!lastSession) {
      return res.status(404).json({ message: "No active session found." });
    }

    // ✅ Correct variable name
    await SessionLog.updateMany(
      { sessionId: lastSession.sessionId, logoutTime: null },
      { $set: { logoutTime: new Date() } }
    );

    res.status(200).json({ message: "Logout time saved for all active session logs." });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Server error during logout." });
  }
};

//route for app(not for web)
exports.getAssignedTrainingById = async (req, res) => {
  try {
    const candidateId = req.user?.id;
    if (!candidateId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const trainingId = req.params.trainingId;

    const candidate = await Candidate.findById(candidateId)
      .populate('assignedTrainings.trainingId')
      .lean();

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const assignedTraining = candidate.assignedTrainings.find(
      (t) => t.trainingId?._id?.toString() === trainingId
    );

    if (!assignedTraining) {
      return res.status(404).json({ message: 'Training not found in assigned trainings.' });
    }

    const trainingDoc = assignedTraining.trainingId;

    const updatedChapters = assignedTraining.chapters?.map((assignedChapter) => {
      const liveChapter = trainingDoc?.chapters?.find(
        (ch) => ch._id?.toString() === assignedChapter.chapterId?.toString()
      );

      return {
        chapterId: assignedChapter.chapterId?.toString(),
        name: liveChapter?.name || "",
        description: liveChapter?.description || "",
        duration: liveChapter?.duration || 0,
        pdf: liveChapter?.pdf || null,
        linkedTestId: assignedChapter.linkedTestId || null,
        certificate: assignedChapter.certificate || null,
        unlocksChapters: assignedChapter.unlocksChapters || [],
        dependentChapters: assignedChapter.dependentChapters || [],
        indexes: liveChapter?.indexes || [],
      };
    }) || [];

    const finalAssignedTraining = {
      ...assignedTraining,
      chapters: updatedChapters,
      trainingId: {
        ...trainingDoc,
        chapters: updatedChapters, // for frontend compatibility
      }
    };

    res.status(200).json(finalAssignedTraining);
  } catch (error) {
    console.error('Error fetching assigned training:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

//chapter details for chapter card selection
exports.getCandidateChapterDetails = async (req, res) => {
  try {
    const candidateId = req.user.id;
    const { trainingId, chapterId } = req.params;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const assigned = candidate.assignedTrainings.find(
      t => t.trainingId.toString() === trainingId
    );
    if (!assigned) return res.status(403).json({ message: 'Training not assigned' });

    const training = await Training.findById(trainingId);
    if (!training) return res.status(404).json({ message: 'Training not found' });

    const chapter = training.chapters.find(ch =>
      ch._id.toString() === chapterId
    );
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    // Final response with video path
    return res.json({
      ...chapter.toObject(),
      videoPath: training.videoPath || null  // include if exists
    });
  } catch (err) {
    console.error('Error fetching chapter details:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


//ask ai limit controller for candidate



exports.askAiWithLimit = async (req, res) => {
  try {
    const candidateId = req.user?.id;
    const { question } = req.body;

    if (!candidateId || !question) {
      return res.status(400).json({ message: "Missing candidate or question" });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (candidate.aiCredits <= 0) {
      return res.status(403).json({ message: "Your AI limit exhausted." });
    }

    const aiRes = await fetch("https://azeem-ai.onrender.com/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = await aiRes.json();

    candidate.aiCredits -= 1;
    await candidate.save();

    res.status(200).json({
      answer: data.answer || "No answer received.",
      remainingCredits: candidate.aiCredits
    });

  } catch (err) {
    console.error("Ask AI Limit Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

