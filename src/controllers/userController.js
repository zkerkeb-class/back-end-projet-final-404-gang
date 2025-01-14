const {
  User,
  userValidationSchema,
  loginValidationSchema,
} = require('../models/User');
const { generateToken } = require('../config/jwt');

// Inscription d'un utilisateur
const createUser = async (req, res) => {
  try {
    const { error } = userValidationSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const existingUser = await User.findOne({
      $or: [{ email: req.body.email }, { username: req.body.username }],
    });
    if (existingUser)
      return res
        .status(400)
        .json({ message: "Email ou nom d'utilisateur déjà pris" });

    const newUser = new User(req.body); // Le hook `pre("save")` s'occupera du hachage
    await newUser.save();

    const token = generateToken({ id: newUser._id, role: newUser.role }); // Utilisation de la méthode intégrée
    res.status(201).json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Connexion d'un utilisateur
const loginUser = async (req, res) => {
  try {
    const { error } = loginValidationSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res.status(400).json({ message: 'Utilisateur non trouvé' });

    const isValid = await user.comparePassword(req.body.password);
    if (!isValid)
      return res.status(400).json({ message: 'Mot de passe incorrect' });

    const token = generateToken({ id: user._id, role: user.role }); // Utilisation de la méthode intégrée

    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

module.exports = { createUser, loginUser };
