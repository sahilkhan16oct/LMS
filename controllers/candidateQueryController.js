const nodemailer = require('nodemailer');
const Candidate = require('../models/Candidate');

exports.sendQueryToAdmin = async (req, res) => {
  try {
    const { message } = req.body;
    const file = req.file;
    const candidateId = req.user.id;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // ✅ Mail config
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'suhailgujjar52@gmail.com',     // ✅ Admin mail
        pass: 'ttdi kbhf tzdt hium'             // 🔐 Put real app password here
      }
    });

    const mailOptions = {
      from: '"SkillNest LMS" <suhailgujjar52@gmail.com>',  // shown as sender
  to: 'suhailgujjar52@gmail.com',
  replyTo: candidate.email,  // 🧠 this is key
  subject: `Query from ${candidate.name}`,
  html: `<p><strong>Candidate name:</strong> ${candidate.name}</p>
  <p><strong>Candidate email:</strong> (${candidate.email})</p>
         <p><strong>Candidate ID:</strong> ${candidate.candidateId}</p>
         <p><strong>Message:</strong><br>${message}</p>`,
      attachments: file
        ? [{
            filename: file.originalname,
            content: file.buffer
          }]
        : []
    };

    await transporter.sendMail(mailOptions);

    // ✅ Update queryCount
    candidate.queryCount = (candidate.queryCount || 0) + 1;
    await candidate.save();

    res.status(200).json({ message: 'Query sent successfully!' });

  } catch (err) {
    console.error("❌ Query send error:", err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
