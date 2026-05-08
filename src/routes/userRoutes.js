import express from "express";
import { deleteUser, editUser, logged, logOut, signIn, signUp } from "../controllers/userController.js";
import { auth } from "../config/auth.js";

const router = express.Router();

router.get("/logged", auth, logged);
router.get("/log-out", auth, logOut);

router.post("/sign-in", signIn);
router.post("/sign-up", signUp);

router.put("/", auth, editUser);

router.post("/", auth, deleteUser);

export default router;
