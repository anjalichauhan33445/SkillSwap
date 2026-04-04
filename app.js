import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import session from "express-session";
import bcrypt from "bcrypt";
import User from "./Models/user.js";

dotenv.config();

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(session({
  secret: "skillSwapSecretKey",
  resave: false,
  saveUninitialized: false
}));


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.log("❌ MongoDB error:", err));


app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.get("/", (req, res) => res.render("home"));


app.get("/register", (req, res) => res.render("register"));

app.post("/register", async (req, res) => {
  const { name, email, password, skill } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.send("⚠️ User already exists. Please log in.");

  
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      skill
    });

    await newUser.save();
    res.redirect("/dashboard");
  } catch (error) {
    res.send("Error: " + error.message);
  }
});


app.get("/login", (req, res) => res.render("login"));

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.send("⚠️ User not found. Please register.");
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.send("❌ Incorrect password.");
    }

    req.session.user = {
      id: user._id,
      name: user.name,
      skill: user.skill,
      email: user.email,
    };

    res.redirect("/dashboard");

  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});


app.get("/dashboard", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  try {
    const currentUser = req.session.user;
    const allUsers = await User.find({});
    
    const others = allUsers.filter(
      (u) => u.email !== currentUser.email
    );

    res.render("dashboard", { user: currentUser, users: allUsers, others });
  } catch (error) {
    console.error("Error loading dashboard:", error);
    res.send("An error occurred.");
  }
});






app.listen(port, () => {
  console.log(`🚀 SkillSwap server running at http://localhost:${port}`);
});
