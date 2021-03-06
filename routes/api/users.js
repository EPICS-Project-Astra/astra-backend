const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const User = require("../../models/User");

// @route   POST api/users
// @desc    Register user and get token
// @access  Public
router.post(
  "/",
  [
    check("username", "Username is required.").not().isEmpty(),
    check("wallet", "Wallet address is required.").not().isEmpty(),
    check(
      "password",
      "Password should be at least 5 characters long."
    ).isLength({
      min: 5,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, wallet } = req.body;

    try {
      //check if user already exists, if not continue
      let user = await User.findOne({ username });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists." }] });
      }

      //create new user object
      user = new User({
        username,
        password,
        wallet,
      });

      //encrypt password using bcrypt
      const salt = await bcrypt.genSalt(10);
      //update password in the user object to the hashed one
      user.password = await bcrypt.hash(password, salt);

      //save user to database
      await user.save();

      //return JWT to client
      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        process.env.jwtSecret,
        { expiresIn: 360000 },
        (err, token) => {
          if (err) {
            throw err;
          }
          res.json({ token: token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error!");
    }
  }
);

module.exports = router;
