const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // adapter le chemin

exports.addUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Vérification basique
    if (!username || !password) {
      return res.status(400).json({ status: 1, message: "Nom d'utilisateur ou mot de passe manquant." });
    }

    // Hash du mot de passe
    const hash = await bcrypt.hash(password, 10);

    // Création de l'utilisateur
    const newUser = new User({
      username,
      password: hash,
      app: "PaiementMB"
    });

    const user = await newUser.save();

    // Création du token
    const token = jwt.sign(
      { userId: user._id },
      "JxqKuulLNPCNfaHBpmOoalilgsdykhgugdolhebAqeiupytfdg7iyi7whlotflqRf", // ⚠️ À placer dans une variable d’environnement
      { expiresIn: '7d' } // conseillé
    );

    return res.status(201).json({ status: 0, token });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 2, message: "Erreur serveur." });
  }
};


exports.signIn = async (req, res) => {
    try {
      const { username, password } = req.body;
  
      // Vérification des champs
      if (!username || !password) {
        return res.status(400).json({ status: 1, message: "Nom d'utilisateur ou mot de passe manquant." });
      }
  
      // Recherche de l'utilisateur
      const user = await User.findOne({ username });
  
      if (!user) {
        return res.status(404).json({ status: 2, message: "Utilisateur non trouvé." });
      }
  
      // Comparaison du mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password);
  
      if (!isPasswordValid) {
        return res.status(401).json({ status: 3, message: "Mot de passe incorrect." });
      }
  
      // Génération du token
      const token = jwt.sign(
        { userId: user._id },
        "JxqKuulLNPCNfaHBpmOoalilgsdykhgugdolhebAqeiupytfdg7iyi7whlotflqRf", // ⚠️ secret à placer dans .env
        { expiresIn: '7d' }
      );
  
      return res.status(200).json({ status: 0, token });
  
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: 4, message: "Erreur serveur." });
    }
  };


  exports.getUser = async (req, res) => {

    console.log(req.body);

    try{

        const user = await User.findOne({_id: req.auth.userId}); 

        res.status(200).json({status: 0, user}); 

    }catch(err){

        console.log(err); 
        res.status(500).json({ status: 4, message: "Erreur serveur." });
    }

  }