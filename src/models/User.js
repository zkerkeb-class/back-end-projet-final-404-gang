const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // Pour le hashage des mots de passe
const jwt = require("jsonwebtoken");
const Joi = require("joi"); // Pour la validation des données

// Schéma de l'utilisateur
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

// Méthode pour hashage du mot de passe avant sauvegarde
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Ne pas re-hasher si le mot de passe n'a pas changé
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode pour comparer le mot de passe
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// Méthode pour générer un token JWT
userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  return token;
};

// Schéma de validation Joi
const userValidationSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("admin", "user").default("user"),
});

const loginValidationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const User = mongoose.model("User", userSchema);

module.exports = { User, userValidationSchema, loginValidationSchema };

