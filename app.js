const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const userModel = require("./models/user");
const postModel = require("./models/post");
const path = require("path");
const upload = require("./config/multerconfig");

const app = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/profile/upload", (req, res) => {
  res.render("profileupload");
});

app.post(
  "/fileUpload",
  isLoggedIn,
  upload.single("image"),
  async (req, res) => {
    const user = await userModel.findOne({ email: req.user.email });
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
  },
);

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/profile", isLoggedIn, async (req, res) => {
  console.log("user in req", req.user);
  const user = await userModel
    .findOne({ email: req.user.email })
    .populate("posts");
  console.log("user", user);

  res.render("profile", { user });
});

app.post("/post", isLoggedIn, async (req, res) => {
  console.log("post route");
  const user = await userModel.findOne({ email: req.user.email });
  const post = await postModel.create({
    user: user._id,
    content: req.body.content,
  });

  user.posts.push(post._id);
  await user.save();

  res.redirect("/profile");
});

app.post("/register", async (req, res) => {
  const { email, username, age, password, name } = req.body;
  const user = await userModel.findOne({ email });

  if (user) return res.status(500).send("user alrady exist");
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      const createAccount = await userModel.create({
        name,
        username,
        email,
        age,
        password: hash,
      });
      const token = jwt.sign(
        { email: email, userId: createAccount._id },
        "shhhhhh",
      );
      res.cookie("token", token);
      return res.status(200).send("user registered");
    });
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await userModel.findOne({ username });
  console.log("user", user);
  if (!user) return res.status(500).send("something went wrong");
  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      const token = jwt.sign(
        { email: user.email, userId: user._id },
        "shhhhhh",
      );
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else res.redirect("/login");
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");

  // Clear a cookie
  res.clearCookie("token", { path: "/login" });

  // Send a response to the client
  res.redirect("/login");
});

function isLoggedIn(req, res, next) {
  if (req.cookies.token == null) return res.redirect("/login");
  else {
    const data = jwt.verify(req.cookies.token, "shhhhhh");
    req.user = data;
  }
  next();
}

app.listen(3000);
