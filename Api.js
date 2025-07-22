const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Conexión a MongoDB Atlas
mongoose
  .connect(
    "mongodb+srv://Gabo78:<ellanoteama789>@cluster0.oli5hsa.mongodb.net/myapp?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error de conexión:", err));

// ------------------ ESQUEMAS Y RUTAS ------------------
// [Todo tu código sigue igual aquí…]

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model("Counter", counterSchema);

const userSchema = new mongoose.Schema({
  id_us: { type: Number, unique: true },
  name: { type: String, required: true },
  nikuser: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  datetime: { type: Date, default: Date.now },
  rol: { type: String, enum: ["ADMIN", "USER"], required: true },
});
async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}
userSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.id_us = await getNextSequence("userid");
  }
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
const User = mongoose.model("User", userSchema);

const documentSchema = new mongoose.Schema({
  id_document: { type: Number, unique: true },
  name_document: { type: String, required: true },
  id_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  datetime: { type: Date, default: Date.now },
});
documentSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.id_document = await getNextSequence("documentid");
  }
  next();
});
const Document = mongoose.model("Document", documentSchema);

// ----- Rutas de Users y Documents (todo igual que en tu código original) -----

// POST /api/users
app.post("/api/users", async (req, res) => {
  try {
    const { name, nikuser, password, rol } = req.body;
    const user = new User({ name, nikuser, password, rol });
    await user.save();
    res.status(201).json({
      message: "Usuario creado",
      user: { id: user._id, id_us: user.id_us, name, nikuser, rol },
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.nikuser) {
      return res.status(400).json({ error: "nikuser ya en uso" });
    }
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { nikuser, password } = req.body;
    const user = await User.findOne({ nikuser });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Contraseña incorrecta" });

    res.json({
      message: "Login exitoso",
      user: {
        id: user._id,
        id_us: user.id_us,
        name: user.name,
        nikuser: user.nikuser,
        rol: user.rol,
      },
      redirectUrl: "/dashboard",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/documents", async (req, res) => {
  try {
    const { name_document, nikuser } = req.body;
    const user = await User.findOne({ nikuser });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const document = new Document({ name_document, id_user: user._id });
    await document.save();

    const populatedDocument = await Document.findById(document._id).populate(
      "id_user",
      "name id_us nikuser"
    );

    res.status(201).json({
      message: "Documento creado",
      document: {
        id_document: populatedDocument.id_document,
        name_document: populatedDocument.name_document,
        id_user: populatedDocument.id_user._id,
        user_name: populatedDocument.id_user.name,
        user_nikuser: populatedDocument.id_user.nikuser,
        datetime: populatedDocument.datetime,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/documents", async (req, res) => {
  try {
    const documents = await Document.find().populate(
      "id_user",
      "name id_us nikuser"
    );
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
