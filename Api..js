const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Conexión a MongoDB
mongoose
  .connect("mongodb://localhost:27017/myapp", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Conectado a MongoDB"))
  .catch((err) => console.error("Error de conexión:", err));

// Esquema de User
const userSchema = new mongoose.Schema({
  id_us: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  datetime: { type: Date, default: Date.now },
  rol: { type: String, enum: ["ADMIN", "USER"], required: true },
});

// Middleware para hashear la contraseña antes de guardar
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model("User", userSchema);

// Esquema de Document
const documentSchema = new mongoose.Schema({
  name_document: { type: String, required: true },
  id_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  datetime: { type: Date, default: Date.now },
});

const Document = mongoose.model("Document", documentSchema);

// Rutas para Users
app.post("/api/users", async (req, res) => {
  try {
    const { id_us, name, password, rol } = req.body;
    const user = new User({ id_us, name, password, rol });
    await user.save();
    res
      .status(201)
      .json({
        message: "Usuario creado",
        user: { id: user._id, id_us, name, rol },
      });
  } catch (error) {
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
    const { id_us, password } = req.body;
    const user = await User.findOne({ id_us });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Contraseña incorrecta" });

    res.json({
      message: "Login exitoso",
      user: { id: user._id, id_us, name: user.name, rol: user.rol },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas para Documents
app.post("/api/documents", async (req, res) => {
  try {
    const { name_document, id_user } = req.body;
    const document = new Document({ name_document, id_user });
    await document.save();
    res.status(201).json({ message: "Documento creado", document });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/documents", async (req, res) => {
  try {
    const documents = await Document.find().populate("id_user", "name id_us");
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
