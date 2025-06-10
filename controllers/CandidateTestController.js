const Candidate = require("../models/Candidate");
const Test = require("../models/Test");
const mongoose = require("mongoose");


//randomaized questions for a test for candidate test appearance
exports.getRandomizedTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const candidateId = req.user._id;

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: "Test not found" });

    const randomizedCount = test.randomizedQuestionCount || test.questions.length;
    const shuffled = test.questions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, randomizedCount);

    // ✅ Check if candidate already passed this test
    const candidate = await Candidate.findById(candidateId);
    let alreadyPassed = false;

    if (candidate && Array.isArray(candidate.testResults)) {
      for (let r of candidate.testResults) {
        const dbId = r.testId?.toString();
        const reqId = testId?.toString();
        const status = r.status?.toLowerCase();

        console.log({
          dbTestId: dbId,
          inputTestId: reqId,
          status,
          match: dbId === reqId && status === "pass"
        });

        if (dbId === reqId && status === "pass") {
          alreadyPassed = true;
          break;
        }
      }
    }

    // ✅ Return early if already passed
if (alreadyPassed) {
  return res.status(403).json({ message: "You have already passed this test" });
}

    // ✅ Construct clean response object
    const responsePayload = {
      title: test.title,
      duration: test.duration,
      passingPercentage: test.passingPercentage,
      questions: selected.map((q, index) => ({
        index: index + 1,
        question: q.Question,
        options: [q.A, q.B, q.C, q.D],
        answer: q.Answer,
      })),
      alreadyPassed, // ✅ final resolved value
    };

    console.log("📤 Sending response with alreadyPassed:", alreadyPassed);
    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error("❌ getRandomizedTest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};




//candidate test submit route 
// 🆕 Submit test and save result
exports.submitTest = async (req, res) => { 
  try {
    const candidateId = req.user._id;
    const { testId } = req.params;
    const { answers, passingPercentage } = req.body;  // ✅ frontend se aaraha

    let correctCount = 0;

    for (let submitted of answers) {
  const actualSelectedText = submitted.selectedOption?.trim();
  const correct = submitted.correctAnswer?.trim();

  console.log("🔍 Comparing:", {
    selected: actualSelectedText,
    correct,
    match: actualSelectedText?.toLowerCase() === correct?.toLowerCase()
  });

  if (
    actualSelectedText?.toLowerCase() === correct?.toLowerCase()
  ) {
    correctCount++;
  }
}


    const percentage = (correctCount / answers.length) * 100;
    const status = percentage >= passingPercentage ? "pass" : "fail";

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      console.error("❌ Candidate not found");
      return res.status(404).json({ message: "Candidate not found" });
    }

    const existingResult = candidate.testResults.find(
      (r) => r.testId.toString() === testId
    );

    if (existingResult?.status === "pass") {
      return res.status(403).json({ message: "Test already passed. Cannot reattempt." });
    }

    if (existingResult) {
      // ✅ update existing result
      existingResult.scorePercentage = percentage;
      existingResult.status = status;
      existingResult.attemptedAt = new Date();
      existingResult.attemptCount = (existingResult.attemptCount || 1) + 1;
    } else {
      // ✅ new test result
      candidate.testResults.push({
        testId: new mongoose.Types.ObjectId(testId),
        scorePercentage: percentage,
        status,
        attemptedAt: new Date(),
        attemptCount: 1
      });
    }

     if (status === "pass") {
      for (const training of candidate.assignedTrainings) {
        const targetChapter = training.chapters.find(ch => ch.linkedTestId?.toString() === testId);

        if (targetChapter) {
          const chapterId = targetChapter.chapterId.toString();
          const unlockedChapterIds = targetChapter.unlocksChapters.map(id => id.toString());

          for (const unlockId of unlockedChapterIds) {
            const unlocked = training.chapters.find(ch => ch.chapterId?.toString() === unlockId);
            if (unlocked) {
              unlocked.dependentChapters = unlocked.dependentChapters.filter(depId => depId.toString() !== chapterId);
            }
          }

          targetChapter.unlocksChapters = [];
        }
      }

      candidate.markModified("assignedTrainings");
    }
    // ✅ UNLOCK LOGIC PATCH ENDS HERE

    candidate.markModified("testResults");



    console.log("✅ Candidate ID:", candidate._id.toString());
    console.log("Saving test result:", candidate.testResults);
    candidate.markModified("testResults");
    const verify = await Candidate.findById(candidateId);
console.log("✅ Saved testResults:", verify.testResults);

    await candidate.save();

    res.status(200).json({
      message: 'Test submitted',
      result: { scorePercentage: percentage, status },
       testResults: candidate.testResults,
    });
  } catch (err) {
    console.error('❌ submitTest error:', err);
    res.status(500).json({ message: 'Failed to submit test' });
  }
};


