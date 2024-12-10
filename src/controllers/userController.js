const {
  User,
  userValidationSchema,
  loginValidationSchema,
} = require("../models/User");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../config/jwt");

// Inscription d'un utilisateur
const createUser = async (req, res) => {
  try {
    // Validation des données d'inscription
    const { error } = userValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Vérification si l'email ou le nom d'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [{ email: req.body.email }, { username: req.body.username }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email ou nom d'utilisateur déjà pris" });
    }

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Création de l'utilisateur avec le mot de passe haché
    const newUser = new User({ ...req.body, password: hashedPassword });
    await newUser.save();

    // Génération du token JWT
    const token = generateToken({ id: newUser._id, role: newUser.role });
    res.status(201).json({ token });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

// Connexion d'un utilisateur
const loginUser = async (req, res) => {
  try {
    // Validation des données de connexion
    const { error } = loginValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Recherche de l'utilisateur par email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ message: "Utilisateur non trouvé" });
    }

    // Comparaison du mot de passe
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      return res.status(400).json({ message: "Mot de passe incorrect" });
    }

    // Génération du token JWT
    const token = generateToken({ id: user._id, role: user.role });
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

module.exports = { createUser, loginUser };
