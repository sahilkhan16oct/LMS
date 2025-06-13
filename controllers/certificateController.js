const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Training = require('../models/Training');
const Candidate = require('../models/Candidate');





//download certificate with candidate route 
exports.generatePersonalizedCertificate = async (req, res) => {
  try {
    const { trainingId, chapterId } = req.params;
    const candidateId = req.user.id;

    console.log("➡️ Training ID:", trainingId);
    console.log("➡️ Chapter ID:", chapterId);
    console.log("➡️ Candidate ID:", candidateId);

    const training = await Training.findById(trainingId);
    if (!training) {
      console.log("❌ Training not found");
      return res.status(404).json({ message: "Training not found" });
    }

    

    const chapter = training.chapters.id(chapterId); // BEST & SIMPLE


    if (!chapter || !chapter.certificate?.filePath) {
      console.log("❌ Chapter or certificate not found for chapterId:", chapterId);
      return res.status(404).json({ message: "Certificate not found" });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      console.log("❌ Candidate not found");
      return res.status(404).json({ message: "Candidate not found" });
    }

    console.log("✅ Candidate name:", candidate.name);

    const certificatePath = path.join(__dirname, '..', chapter.certificate.filePath);

   const imageBuffer = await sharp(certificatePath)
  .composite([
    {
      input: Buffer.from(
        `<svg width="1300" height="600">
          <style>
            .name { fill: black; font-size: 60px; font-family: Arial, sans-serif; font-weight: bold; }
          </style>
          <text x="995" y="480" text-anchor="middle" class="name">${candidate.name}</text>
        </svg>`
      ),
      top: 0,
      left: 0,
    },
  ])
  .png()
  .toBuffer();


    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Certificate_${candidate.name.replace(/\s+/g, "_")}.png`
    );
    res.send(imageBuffer);
    

  } catch (err) {
    console.error('❌ Certificate generation error:', err);
    res.status(500).json({ message: "Failed to generate certificate" });
  }
};