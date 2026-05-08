import db from "../config/db.js";

export async function getEntries(req, res) {
	const entriesResult = await db.query("SELECT * FROM fs_richier_entries WHERE user_id = $1 ORDER BY date DESC, id DESC", [req.user.id]);
	const entries = entriesResult.rows;

	return res.status(200).json(entries);
}

export async function newEntry(req, res) {
	let { value, type, category, date, description } = req.body;

	const error = newEntryValidation(description, value, category, type, date);
	if (error) return res.status(400).json({ message: error });

	try {
		const newEntryResult = await db.query("INSERT INTO fs_richier_entries (value, type, category, date, user_id, description) VALUES ($1,$2,$3,$4,$5, $6) RETURNING *", [Number(value), type, category.trim(), date, req.user.id, description.trim()]);
		const newEntry = newEntryResult.rows[0];

		return res.status(201).json(newEntry);
	} catch (error) {
		return res.status(500).json({ message: "Algo deu errado. Tente novamente" });
	}
}

export async function putEntry(req, res) {
	const id = Number(req.params.id);
	const { value, type, category, date, description } = req.body;

	const error = newEntryValidation(description, value, category, type, date);
	if (error) return res.status(400).json({ message: error });

	try {
		const updatedEntryResult = await db.query("UPDATE fs_richier_entries SET value = $1, type = $2, category = $3, date = $4, description = $5 WHERE id = $6 AND user_id = $7 RETURNING *", [Number(value), type, category.trim(), date, description.trim(), id, req.user.id]);
		const updatedEntry = updatedEntryResult.rows[0];

		if (!updatedEntry) return res.status(401).json({ message: "Essa transação não pertence a você ou não existe." });

		return res.status(201).json(updatedEntry);
	} catch (error) {
		return res.status(500).json({ message: "Algo deu errado. Tente novamente" });
	}
}

export async function deleteEntry(req, res) {
	const id = Number(req.params.id);

	try {
		await db.query("DELETE FROM fs_richier_entries WHERE id = $1 AND user_id = $2", [id, req.user.id]);
		return res.status(201).json({ message: "Transação deletada!" });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: error });
	}
}

function newEntryValidation(description, value, category, type, date) {
	if (!description.trim().length) return "A descrição não pode ser vazia.";
	if (!value) return "O valor deve sempre ser maior que 0 (zero).";
	if (Number(value) < 1) return "O valor deve sempre ser maior que 0 (zero).";
	if (category.trim().length > 255) return `Sua 'categoria' possui ${category.trim().length} caracteres. O limite de caracteres para 'categoria' é de 255.`;
	if (description.trim().length > 70) return `Sua 'descrição' possui ${description.trim().length} caracteres. O limite para 'descrição' é de 70 caracteres.`;
	if (type !== "in" && type !== "out") return "Esse tipo não é válido. Escolha entrada ou saída.";
	if (date === "") {
		date = new Date();
	} else {
		const parsedDate = new Date(date);

		if (!isNaN(parsedDate.getTime())) {
			const today = new Date();

			today.setHours(0, 0, 0, 0);
			parsedDate.setHours(0, 0, 0, 0);

			if (parsedDate > today) {
				return "A data é no futuro (amanhã ou depois). Não permitido!";
			} else {
				date = parsedDate;
			}
		} else {
			return "Data inválida. Por favor selecione uma data válida...";
		}
	}

	return null;
}
