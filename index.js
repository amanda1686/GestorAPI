import "dotenv/config";
import cors from "cors";
import express from "express";
import db from "./database/db.js";
import ejercientesRoutes from "./Routes/ejercientes.js";
import tasacionesRoutes from "./Routes/tasaciones.js";
import testigosRoutes from "./Routes/testigos.js";
import authRoutes from "./Routes/auth.js";
import communicationsRoutes from "./Routes/communications.js";
import notificationsRoutes from "./Routes/notifications.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:8080")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllOrigins = allowedOrigins.includes("*");

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowAllOrigins || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origen no permitido por CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
};

app.use(express.json({ limit: "10kb" }));
app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use((err, req, res, next) => {
  if (err?.message === "Origen no permitido por CORS") {
    return res.status(403).json({ error: err.message });
  }
  return next(err);
});

app.use("/auth", authRoutes);
app.use("/ejercientes", ejercientesRoutes);
app.use("/tasaciones", tasacionesRoutes);
app.use("/testigos", testigosRoutes);
app.use("/communications", communicationsRoutes);
app.use("/notifications", notificationsRoutes);

db.authenticate()
  .then(() => console.log("[db] Conexion a MySQL establecida"))
  .catch((err) => console.error("[db] Error de conexion:", err));

app.get("/", (req, res) => {
  res.send("Servidor Express funcionando");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor escuchando en http://0.0.0.0:${port}`);
});
