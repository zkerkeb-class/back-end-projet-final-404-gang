const express = require("express");
const { createUser, loginUser } = require("../controllers/userController");
const validate = require("../middleware/validate");
const {
  userValidationSchema,
  loginValidationSchema,
} = require("../models/User");

const router = express.Router();

// Route d'inscription
router.post("/register", validate(userValidationSchema), createUser);

// Route de connexion
router.post("/login", validate(loginValidationSchema), loginUser);

module.exports = router;
