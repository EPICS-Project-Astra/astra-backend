const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const Post = require("../../models/Post");
const User = require("../../models/User");

// @route   POST api/posts
// @desc    Create post
// @access  Private
router.post(
  "/",
  [
    auth,
    [
      check("text", "Text is required.").not().isEmpty(),
      check("title", "Title is required.").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { text, title, assets } = req.body;

      const post = new Post({
        user: req.user.id,
        text,
        title,
        coins: 0,
      });

      if (assets) post.assets = assets;

      const newPost = await post.save();
      res.json(newPost);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error!");
    }
  }
);

// @route   GET api/posts
// @desc    Get all posts
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    //get all posts sorted from latest to oldest
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error!");
  }
});

// @route   GET api/posts/:post_id
// @desc    Get post by post ID
// @access  Private
router.get("/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) {
      return res.status(404).json({ errors: [{ msg: "Post doesn't exist." }] });
    }
    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ errors: [{ msg: "Post doesn't exist." }] });
    }
    res.status(500).send("Server error!");
  }
});

// @route   PUT api/posts/:post_id/likes
// @desc    Like a post
// @access  Private
router.put("/:post_id/likes", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);

    if (!post) {
      return res.status(404).json({ errors: [{ msg: "Post doesn't exist." }] });
    }

    //check if user has already liked the post
    if (
      post.likes.filter((like) => like.user.toString() === req.user.id).length >
      0
    ) {
      return res.status(400).json({ errors: [{ msg: "Post already liked." }] });
    }

    post.likes.unshift({ user: req.user.id });
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error!");
  }
});

// @route   PUT api/posts/:post_id/likes
// @desc    Unike a post
// @access  Private
router.put("/:post_id/unlike", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) {
      return res.status(404).json({ errors: [{ msg: "Post doesn't exist." }] });
    }

    //check if user has already liked the post
    if (
      post.likes.filter((like) => like.user.toString() === req.user.id)
        .length === 0
    ) {
      return res.status(400).json({ errors: [{ msg: "Post not liked yet." }] });
    }

    //create a new array of only likes' user IDs and then get the index of the ID of the user of the like to delete
    const removeIndex = post.likes
      .map((like) => like.user.toString())
      .indexOf(req.user.id);
    //remove the like from the likes array at that same index
    post.likes.splice(removeIndex, 1);
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error!");
  }
});

// @route   POST api/posts/:post_id/comments
// @desc    Add a comment to a post
// @access  Private
router.post(
  "/:post_id/comments",
  [auth, [check("text", "Text is required.").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const post = await Post.findById(req.params.post_id);
      if (!post) {
        return res
          .status(404)
          .json({ errors: [{ msg: "Post doesn't exist." }] });
      }

      //get current user object to extract name and gravatar
      const user = await User.findById(req.user.id).select("-password");

      const { text } = req.body;

      const comment = {
        user: req.user.id,
        text,
      };

      post.comments.unshift(comment);
      await post.save();
      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error!");
    }
  }
);

// @route   PUT api/posts/:post_id/coins
// @desc    Add coin to a post
// @access  Private
router.put(
  "/:post_id/coins",
  [auth, [check("coins", "Coins is required.").isNumeric()]],
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.post_id);

      if (!post) {
        return res
          .status(404)
          .json({ errors: [{ msg: "Post doesn't exist." }] });
      }

      const { coins } = req.body;

      post.coins += coins;

      await post.save();
      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error!");
    }
  }
);

module.exports = router;
