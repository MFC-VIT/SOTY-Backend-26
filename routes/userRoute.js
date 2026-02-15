const express = require("express");
const {
  updateScore,
  updatePassword,
  isBanStatus,
} = require("../controllers/userController");
const isAdmin = require("../middleware/validateAdminHandler");

const router = express.Router();

router.put("/updatepassword", isAdmin, updatePassword);
router.put("/updatescore", isAdmin, updateScore);
router.put("/updateban", isAdmin, isBanStatus);

module.exports = router;
