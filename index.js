import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import userRoutes from "./src/routes/userRoutes.js";
import entriesRoutes from "./src/routes/entriesRoutes.js";

import db from "./src/config/db.js";
import env from "dotenv";
import { auth } from "./src/config/auth.js";

const app = express();
const port = 3000;

env.config();
db.connect();

app.use(cookieParser());
app.use(express.json());
app.use(
	cors({
		origin: process.env.FRONTEND_URL,
		credentials: true,
	}),
);

app.use("/api/user", userRoutes);
app.use("/api/entries", auth, entriesRoutes);

app.listen(port, () => {
	console.log(`API running on port ${port}`);
});
