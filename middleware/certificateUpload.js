const multer = require("multer");
const path = require("path");
const fs = require("fs");

const certPath = path.join(__dirname, "../uploads/certificates");
if (!fs.existsSync(certPath)) {
  fs.mkdirSync(certPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, certPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "_CERT_" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });
module.exports = upload;
