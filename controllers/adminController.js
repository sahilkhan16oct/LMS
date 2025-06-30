const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SessionLog = require('../models/SessionLog'); 
const Candidate = require("../models/Candidate");
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const Test = require('../models/Test');

// Admin Register
exports.registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new admin
    const newAdmin = new Admin({
      email,
      password: hashedPassword
    });

    await newAdmin.save();

    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering admin', error: error.message });
  }
};



// Admin Login
exports.loginAdmin = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // check if admin exists
      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(400).json({ message: 'Admin not found' });
      }
  
      // validate password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      // generate JWT token
      const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: '10d' });

      console.log('Secret used for signing:', process.env.JWT_SECRET);


  
      res.json({ token, message: 'Admin logged in successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error logging in admin', error: error.message });
    }
  };


  //log tab controller for admin 
exports.getRecentSessionLogs = async (req, res) => {
  try {
    const logs = await SessionLog.find({})
      .sort({ loginTime: -1 })
      .limit(50)
      .select("sessionId loginTime logoutTime candidate visitedTrainings")
      .populate("candidate", "candidateId name email phone testResults assignedTrainings");

    const formattedLogs = [];

    for (const log of logs) {
      const candidate = log.candidate;
      const testResults = candidate?.testResults || [];
      const assignedTrainings = candidate?.assignedTrainings || [];

      // ❌ If user hasn't logged out yet, skip showing activity
      const hasLoggedOut = log.logoutTime !== undefined && log.logoutTime !== null;
      const sessionTestResults = hasLoggedOut
        ? testResults.filter(
            (result) =>
              new Date(result.attemptedAt) >= new Date(log.loginTime) &&
              new Date(result.attemptedAt) <= new Date(log.logoutTime)
          )
        : [];

      if (!log.visitedTrainings || log.visitedTrainings.length === 0) {
        formattedLogs.push({
          sessionId: log.sessionId,
          email: candidate?.email || "N/A",
          phone: candidate?.phone || "N/A",
          name: candidate?.name || "N/A",
          loginTime: log.loginTime,
          logoutTime: log.logoutTime,
          canId: candidate?.candidateId || "N/A",
          trainingTitle: "N/A",
          activitySummary: "N/A",
        });
      } else {
        for (const visited of log.visitedTrainings) {
          const trainingIdStr = visited.trainingId?.toString();
          const trainingObj = assignedTrainings.find(
            (t) => t.trainingId.toString() === trainingIdStr
          );

          const passedChapterNames = [];

          if (hasLoggedOut && trainingObj) {
            for (const chapter of trainingObj.chapters) {
              const chapterTestId = chapter.linkedTestId?.toString();

              const passedResult = sessionTestResults.find(
                (result) =>
                  result.testId?.toString() === chapterTestId &&
                  result.status === "pass"
              );

              if (passedResult) {
                const percent = passedResult.scorePercentage?.toFixed(1) || "N/A";
                const attempts = passedResult.attemptCount || 1;
                passedChapterNames.push(`${chapter.name} (${percent}%, Attempt ${attempts})`);
              }
            }
          }

          formattedLogs.push({
            sessionId: log.sessionId,
            email: candidate?.email || "N/A",
            phone: candidate?.phone || "N/A",
            name: candidate?.name || "N/A",
            loginTime: log.loginTime,
            logoutTime: log.logoutTime,
            canId: candidate?.candidateId || "N/A",
            trainingTitle: visited.trainingTitle || "N/A",
            activitySummary:
              hasLoggedOut && passedChapterNames.length > 0
                ? `Passed: ${passedChapterNames.join(", ")}`
                : hasLoggedOut
                ? "No activity"
                : "Session Active",
          });
        }
      }
    }

    res.status(200).json(formattedLogs);
  } catch (err) {
    console.error("Log fetch error:", err);
    res.status(500).json({ message: "Failed to fetch logs", error: err.message });
  }
};


//download all logs controller
exports.downloadAllSessionLogs = async (req, res) => {
  try {
    const { start, end } = req.query;

    const query = {};

    // ⏳ Apply date range filter if both provided
    if (start && end) {
      query.loginTime = {
        $gte: new Date(start),
        $lte: new Date(new Date(end).setHours(23, 59, 59, 999)) // include full day
      };
    }
    const logs = await SessionLog.find(query)

      .sort({ loginTime: -1 })
      .select("sessionId loginTime logoutTime candidate visitedTrainings")
      .populate("candidate", "candidateId name email phone testResults assignedTrainings");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Session Logs");

    sheet.columns = [
      { header: "Session ID", key: "sessionId", width: 25 },
      { header: "Candidate ID", key: "canId", width: 15 },
      { header: "Name", key: "name", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Login Time", key: "loginTime", width: 25 },
      { header: "Logout Time", key: "logoutTime", width: 25 },
      { header: "Training Title", key: "trainingTitle", width: 30 },
      { header: "Activity Summary", key: "activitySummary", width: 50 },
    ];

   for (const log of logs) {
      const candidate = log.candidate;
      const testResults = candidate?.testResults || [];
      const assignedTrainings = candidate?.assignedTrainings || [];

      const sessionTestResults = testResults.filter((result) => {
        const attemptedAt = new Date(result.attemptedAt);
        return attemptedAt >= new Date(log.loginTime) && 
               log.logoutTime && attemptedAt <= new Date(log.logoutTime);
      });

      if (!log.visitedTrainings || log.visitedTrainings.length === 0) {
        sheet.addRow({
          sessionId: log.sessionId,
          email: candidate?.email || "N/A",
          phone: candidate?.phone || "N/A",
          name: candidate?.name || "N/A",
          loginTime: log.loginTime ? new Date(log.loginTime).toLocaleString() : "N/A",
          logoutTime: log.logoutTime ? new Date(log.logoutTime).toLocaleString() : "Active",
          canId: candidate?.candidateId || "N/A",
          trainingTitle: "N/A",
          activitySummary: "N/A",
        });
      } else {
        for (const visited of log.visitedTrainings) {
          const trainingIdStr = visited.trainingId?.toString();
          const trainingObj = assignedTrainings.find(t => t.trainingId.toString() === trainingIdStr);

          const passedChapterNames = [];

          if (trainingObj) {
            for (const chapter of trainingObj.chapters) {
              const chapterTestId = chapter.linkedTestId?.toString();

              const passedResult = sessionTestResults.find(
                (result) =>
                  result.testId?.toString() === chapterTestId &&
                  result.status === "pass"
              );

              if (passedResult) {
                const percent = passedResult.scorePercentage?.toFixed(1) || "N/A";
                const attempts = passedResult.attemptCount || 1;
                passedChapterNames.push(`${chapter.name} (${percent}%, Attempt ${attempts})`);
              }
            }
          }

          sheet.addRow({
            sessionId: log.sessionId,
            email: candidate?.email || "N/A",
            phone: candidate?.phone || "N/A",
            name: candidate?.name || "N/A",
            loginTime: log.loginTime ? new Date(log.loginTime).toLocaleString() : "N/A",
            logoutTime: log.logoutTime ? new Date(log.logoutTime).toLocaleString() : "Active",
            canId: candidate?.candidateId || "N/A",
            trainingTitle: visited.trainingTitle || "N/A",
            activitySummary: passedChapterNames.length > 0
              ? `Passed: ${passedChapterNames.join(", ")}`
              : "No activity"
          });
        }
      }
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=session_logs.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Download logs error:", err);
    res.status(500).json({ message: "Failed to generate Excel", error: err.message });
  }
};


//log update by admin for multiple candidates 
exports.uploadSessionAndTrainingLog = async (req, res) => {
  try {
    // Before loop
const file = req.file;
if (!file) return res.status(400).json({ message: 'No file uploaded' });

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(file.path);
const sheet = workbook.worksheets[0];

const rows = sheet.getSheetValues().slice(2); // skip headers

for (const row of rows) {
  const [
    ,
    sessionId,
    candidateId,
    name,
    email,
    phone,
    loginTimeRaw,
    logoutTimeRaw,
    trainingTitle,
    activitySummaryRaw
  ] = row;

  const loginTime = new Date(loginTimeRaw);
  const logoutTime = new Date(logoutTimeRaw);

  const candidate = await Candidate.findOne({ candidateId });
  if (!candidate) continue;

  let visitedTrainingObj = null;
  for (const training of candidate.assignedTrainings) {
    if (training.chapters.some(ch => ch.name.includes("Chapter"))) {
      visitedTrainingObj = training;
      break;
    }
  }
  const trainingId = visitedTrainingObj?.trainingId;
  const trainingTitleFinal = trainingTitle || "Unknown Training";

  const timeDiff = logoutTime.getTime() - loginTime.getTime();
  const safeOffset = timeDiff > 60000 ? Math.random() * (timeDiff - 60000) + 30000 : Math.random() * (timeDiff || 1000);
  const visitedAt = new Date(loginTime.getTime() + safeOffset);

  const visitedTrainings = [];
  if (trainingId) {
    visitedTrainings.push({
      trainingId,
      trainingTitle: trainingTitleFinal,
      visitedAt
    });
  }

  const session = new SessionLog({
    sessionId,
    candidate: candidate._id,
    loginTime,
    logoutTime,
    visitedTrainings,
    createdAt: loginTime,
    updatedAt: logoutTime
  });
  await session.save({ timestamps: false });

  // 🆕 Reset this set on every row
  const alreadyAddedTestIds = new Set();

  const passedChaptersRaw = (activitySummaryRaw || "").split("Passed:")[1]?.split(",") || [];
  for (let i = 0; i < passedChaptersRaw.length; i++) {
    let full = passedChaptersRaw[i];

    if (!full.includes("Attempt") && passedChaptersRaw[i + 1]?.includes("Attempt")) {
      full += "," + passedChaptersRaw[++i];
    }

    const [namePart, scorePartRaw] = full.trim().split("(");
    const chapterName = namePart.trim();
    const scorePart = scorePartRaw?.replace(")", "").trim();

    const scoreMatch = scorePart?.match(/([\d.]+)%/);
    const attemptMatch = scorePart?.match(/Attempt\s+(\d+)/i);

    const scorePercentage = scoreMatch ? parseFloat(scoreMatch[1]) : 100;
    const attemptCount = attemptMatch ? parseInt(attemptMatch[1]) : Math.floor(Math.random() * 10) + 1;

    for (const assigned of candidate.assignedTrainings) {
      for (const chapter of assigned.chapters) {
        if (chapter.name.trim() === chapterName.trim()) {
         const testId = chapter.linkedTestId?.toString();
if (testId && !alreadyAddedTestIds.has(testId)) {
  candidate.testResults.push({
    testId: chapter.linkedTestId,
    scorePercentage,
    status: 'pass',
    attemptedAt: logoutTime,
    attemptCount,
    sessionId
  });
  alreadyAddedTestIds.add(testId);
}


          // 🔓 Unlock dependent chapters
        const depChapterIds = chapter.unlocksChapters || [];

// ✅ Clear unlocksChapters from current chapter
chapter.unlocksChapters = [];

// ✅ Also clear dependentChapters of each unlocked chapter
for (const c of assigned.chapters) {
  if (depChapterIds.some(id => id.toString() === c.chapterId.toString())) {
    // Remove current chapterId from dependentChapters of the unlocked chapter
    c.dependentChapters = (c.dependentChapters || []).filter(
      dId => dId.toString() !== chapter.chapterId.toString()
    );
  }
}

        }
      }
    }
  }

  await candidate.save();
}

fs.unlinkSync(file.path); // cleanup
res.status(200).json({ message: 'Session logs and candidate updates completed.' });


  } catch (err) {
    console.error("❌ Upload processing error:", err);
    res.status(500).json({ message: 'Failed to process upload', error: err.message });
  }
};