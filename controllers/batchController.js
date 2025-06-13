const Batch = require('../models/Batch');
const fs = require("fs");
const path = require("path");
const Candidate = require("../models/Candidate");
const xlsx = require("xlsx");
const os = require("os");
const mongoose = require("mongoose");
const Training = require("../models/Training");



// ➕ Add new batch
exports.addBatch = async (req, res) => {
  try {
    const { name, startTime, endTime,  description } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const batch = new Batch({ name, startTime, endTime,  description });
    await batch.save();

    res.status(201).json({ message: 'Batch created successfully', batch });
  } catch (err) {
    console.error('Add batch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 📃 Get all batches
exports.getBatches = async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });
    res.status(200).json(batches);
  } catch (err) {
    console.error('Fetch batches error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// ❌ Delete batch by ID
exports.deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await Batch.findById(id);
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    // ✅ Step 1: Delete all uploaded files from /uploads/candidates folder
    const filesToDelete = batch.uploadedFiles || [];
    for (const file of filesToDelete) {
      const filePath = path.join(__dirname, "..", file.path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // ✅ Step 2: Remove the batch entry from candidates.batches
    await Candidate.updateMany(
      { "batches.batch": id },
      { $pull: { batches: { batch: id } } }
    );

    // ✅ Step 3: Remove orphan candidates (no batches left)
    await Candidate.deleteMany({ batches: { $size: 0 } });

    // ✅ Step 4: Delete the batch itself
    await Batch.findByIdAndDelete(id);

    res.status(200).json({ message: "Batch, files, and batch links deleted successfully." });
  } catch (err) {
    console.error("Delete batch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};




// ✅ Get uploaded Excel files with candidate counts per file
exports.getUploadedFilesForBatch = async (req, res) => {
  try {
    const batchId = req.params.batchId;
    const batch = await Batch.findById(batchId);

    if (!batch) return res.status(404).json({ message: "Batch not found" });

    const filesWithCounts = await Promise.all(
      batch.uploadedFiles.map(async (file) => {
        const count = await Candidate.countDocuments({
          batches: {
            $elemMatch: {
              batch: batch._id,
              fileId: file._id
            }
          }
        });

        return {
          ...file.toObject(),
          candidateCount: count,
        };
      })
    );

    res.status(200).json(filesWithCounts);
  } catch (err) {
    console.error("Failed to get uploaded files:", err);
    res.status(500).json({ message: "Server error" });
  }
};



//delete an excel file by batchId/fileID

exports.deleteUploadedFile = async (req, res) => {
  try {
    const { batchId, fileId } = req.params;

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: "Batch not found." });

    const fileIndex = batch.uploadedFiles.findIndex(f => f._id.toString() === fileId);
    if (fileIndex === -1) return res.status(404).json({ message: "File not found in batch." });

    const fileToDelete = batch.uploadedFiles[fileIndex];

    // ✅ Delete file from disk
    const filePath = path.join(__dirname, "..", fileToDelete.path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // ✅ Remove batch+file mapping from candidates.batches[]
    await Candidate.updateMany(
      {},
      {
        $pull: {
          batches: {
            batch: batchId,
            fileId: fileId
          }
        }
      }
    );

    // ✅ Remove orphan candidates
    await Candidate.deleteMany({ batches: { $size: 0 } });

    // ✅ Remove file metadata from batch
    batch.uploadedFiles.splice(fileIndex, 1);
    await batch.save();

    res.status(200).json({ message: "File and candidates removed from batch." });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};




// controller for downloading single excel of all candidates of any batch
exports.downloadMergedCandidatesExcel = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found." });
    }

    const fileIds = batch.uploadedFiles.map(f => f._id);
   const candidates = await Candidate.find({
  batches: {
    $elemMatch: {
      batch: batchId,
      fileId: { $in: fileIds }
    }
  }
});


    if (candidates.length === 0) {
      return res.status(404).json({ message: "No candidates found." });
    }

    // ✅ Format candidates
    const formatted = candidates.map(c => ({
      Name: c.name || "",
      CandidateID: c.candidateId || "",
      Email: c.email || "",
      Password: c.password || "",
      Phone: c.phone || "",
      DOB: c.dob || "",
      Gender: c.gender || "",
      Category: c.category || "",
      Disability: c.disability || "",
      TypeOfDisability: c.typeOfDisability || "",
      DomicileState: c.domicileState || "",
      DomicileDistrict: c.domicileDistrict || "",
      EducationLevel: c.educationLevel || "",
      PermanentAddress: c.permanentAddress || ""
    }));

    // ✅ Create workbook
    const ws = xlsx.utils.json_to_sheet(formatted);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Candidates");

    // ✅ Temp path for download
    const filename = `candidates_batch_${batchId}.xlsx`;
    const filepath = `${os.tmpdir()}/${filename}`;
    xlsx.writeFile(wb, filepath);

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error("Download error:", err);
      }
      // Optional: delete file after sending
      fs.unlinkSync(filepath);
    });

  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


//assign training to a batch 
exports.assignTrainingToBatch = async (req, res) => {
  try {
    const { trainingId, batchId } = req.body;

    if (!trainingId || !batchId) {
      return res.status(400).json({ message: "Training ID and Batch ID required." });
    }

    // ✅ 1. Fetch training details including chapters
    const training = await Training.findById(trainingId).select("chapters").lean();
    if (!training) {
      return res.status(404).json({ message: "Training not found." });
    }

    const candidates = await Candidate.find({
      batches: {
        $elemMatch: { batch: new mongoose.Types.ObjectId(batchId) }
      }
    });

    if (candidates.length === 0) {
      return res.status(404).json({ message: "No candidates found in this batch." });
    }

    const bulkOps = [];

    for (const cand of candidates) {
      const alreadyHasTraining = cand.assignedTrainings.some(
        (t) => t.trainingId.toString() === trainingId
      );

      if (!alreadyHasTraining) {
        // ✅ 2. Deep copy of chapters
        console.log("Mapped chapters:", training.chapters.map(ch => ch._id));

        const personalizedChapters = training.chapters.map(ch => ({
          
          chapterId: ch._id?.toString(),
          name: ch.name,
          description: ch.description,
          duration: ch.duration,
          pdf: ch.pdf,
          linkedTestId: ch.linkedTestId || null,
          certificate: ch.certificate || null,
          unlocksChapters: ch.unlocksChapters || [],
          dependentChapters: ch.dependentChapters || [],
          indexes: ch.indexes || []
        }));

        // ✅ 3. Push new training object with chapters into assignedTrainings
        bulkOps.push({
          updateOne: {
            filter: { _id: cand._id },
            update: {
              $push: {
                assignedTrainings: {
                  trainingId: new mongoose.Types.ObjectId(trainingId),
                  assignedAt: new Date(),
                  status: "not_started",
                  batchId: new mongoose.Types.ObjectId(batchId),
                  chapters: personalizedChapters
                }
              }
            }
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      await Candidate.bulkWrite(bulkOps);
    }

    res.status(200).json({
      message: `✅ Training assigned to ${bulkOps.length} new candidates (excluding already assigned).`
    });

  } catch (err) {
    console.error("Assign training error:", err);
    res.status(500).json({ message: "Server error." });
  }
};






//remove training from a batch 
exports.removeTrainingFromBatch = async (req, res) => {
  try {
    const { trainingId, batchId } = req.body;

    if (!trainingId || !batchId) {
      return res.status(400).json({ message: "Training ID and Batch ID required." });
    }

    const objectTrainingId = new mongoose.Types.ObjectId(trainingId);
    const objectBatchId = new mongoose.Types.ObjectId(batchId);

    // ✅ Find candidates who belong to this batch and have the training
    const candidates = await Candidate.find({
      batches: { $elemMatch: { batch: objectBatchId } },
      "assignedTrainings.trainingId": objectTrainingId
    });

    const bulkOps = [];

    for (const cand of candidates) {
      // ✅ Filter assignedTrainings and remove only matching batch+training
      const updatedTrainings = cand.assignedTrainings.filter(
        (t) =>
          !(
            t.trainingId.toString() === trainingId &&
            t.batchId?.toString() === batchId
          )
      );

      bulkOps.push({
        updateOne: {
          filter: { _id: cand._id },
          update: { assignedTrainings: updatedTrainings }
        }
      });
    }

    if (bulkOps.length > 0) {
      await Candidate.bulkWrite(bulkOps);
    }

    res.status(200).json({
      message: `✅ Training removed from ${bulkOps.length} candidates in batch.`,
    });
  } catch (err) {
    console.error("❌ Remove training error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ✅ Get trainingId assigned to a batch (from any one candidate)
exports.getAssignedTrainingForBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    const candidate = await Candidate.findOne({
      "assignedTrainings.batchId": batchId
    });

    if (!candidate) {
      return res.status(200).json({ assignedTrainingId: null });
    }

    const matched = candidate.assignedTrainings.find(
      (t) => t.batchId?.toString() === batchId
    );

    if (!matched) {
      return res.status(200).json({ assignedTrainingId: null });
    }

    return res.status(200).json({ assignedTrainingId: matched.trainingId });

  } catch (err) {
    console.error("Fetch assigned training error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


//remove a candidate from any batch
// ✅ Remove candidate from batch + its training (only for that batch)
exports.removeCandidateFromBatch = async (req, res) => {
  try {
    const { batchId, candidateId } = req.params;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: "Batch not found" });


    // ✅ Step 1: Remove batch from candidate.batches
    candidate.batches = candidate.batches.filter(entry => entry.batch.toString() !== batchId);

    // ✅ Step 2: Remove only that training assigned via this batch
    const batchStr = batchId.toString();

    candidate.assignedTrainings = candidate.assignedTrainings.filter(entry => {
      const currentBatchId = entry.batchId?.toString();
      const remove = currentBatchId === batchStr;

      console.log("🔍 Checking training:", {
        trainingId: entry.trainingId?.toString(),
        batchId: currentBatchId,
        remove,
      });

      return !remove; // keep if not matching
    });

    await candidate.save();

    

    return res.status(200).json({ message: "Candidate removed from batch and training successfully" });

  } catch (err) {
    console.error("❌ Remove candidate from batch error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};










