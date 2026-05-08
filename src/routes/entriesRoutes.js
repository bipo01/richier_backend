import express from "express";
import { deleteEntry, getEntries, newEntry, putEntry } from "../controllers/entriesController.js";

const router = express.Router();

router.get("/", getEntries);

router.post("/", newEntry);

router.put("/:id", putEntry);

router.delete("/:id", deleteEntry);

export default router;
