import bcrypt from "bcrypt";
import db from "../config/db.js";
import { jwtSign } from "../config/auth.js";

const saltRounds = 10;

export async function signIn(req, res) {
	const username = req.body.username.trim();
	const password = req.body.password;

	const userResult = await db.query("SELECT * FROM fs_richier_users WHERE username = $1", [username]);
	const user = userResult.rows[0];

	if (!user) return res.status(404).json({ message: "Usuário não encontrado. Verifique o nome de usuário." });
	bcrypt.compare(password, user.password, (err, result) => {
		if (result) {
			jwtSign(user, res);

			return res.status(200).json({ username, name: user.name });
		}

		if (!result) return res.status(401).json({ message: "Senha incorreta." });

		if (err) return res.status(500).json({ message: "Algo deu errado. Tente novamente." });
	});
}

export async function signUp(req, res) {
	const username = req.body.username.trim();
	const password = req.body.password;
	const confirmPassword = req.body.confirmPassword;
	const firstName = req.body.firstName.trim();
	const lastName = req.body.lastName.trim();

	const name = formatName(firstName, lastName);

	const error = await signUpValidation(username, password, confirmPassword, firstName, lastName, name);
	if (error) {
		return res.status(400).json({ message: error });
	}

	bcrypt.hash(password, saltRounds, async (err, hash) => {
		if (err) return res.status(500).json({ message: "Algo deu errado. Tente novamente." });

		try {
			const userResult = await db.query("INSERT INTO fs_richier_users (username, password, name) VALUES ($1,$2,$3) RETURNING *", [username, hash, name]);
			const user = userResult.rows[0];

			jwtSign(user, res);

			return res.status(201).json({ username, name });
		} catch (error) {
			return res.status(500).json({ message: "Algo deu errado. Tente novamente." });
		}
	});
}

export async function editUser(req, res) {
	let { firstName, lastName, username, newPassword, confirmPassword } = req.body;

	if (!firstName || !firstName.trim().length) return res.status(400).json({ message: "Primeiro nome não pode ser vazio." });
	if (!lastName || !lastName.trim().length) return res.status(400).json({ message: "Sobrenome não pode ser vazio." });

	firstName = `${firstName.replaceAll(" ", "").at(0).toUpperCase()}${firstName.replaceAll(" ", "").slice(1).toLowerCase()}`;
	lastName = `${lastName.replaceAll(" ", "").at(0).toUpperCase()}${lastName.replaceAll(" ", "").slice(1).toLowerCase()}`;

	const name = `${firstName} ${lastName}`;

	if (/[^a-zA-Z0-9_@!]/.test(username)) return res.status(400).json({ message: "Nome de usuário contém caracteres não permitidos." });
	if (username.trim().length < 6) return res.status(400).json({ message: "Nome de usuário deve conter pelo menos 6 caracteres." });

	let query;
	let values;

	bcrypt.hash(confirmPassword, saltRounds, async (err, hash) => {
		if (err) return res.status(500).json({ message: "Algo deu errado. Tente novamente." });

		if (newPassword.trim().length) {
			if (newPassword.includes(" ")) return res.status(400).json({ message: "A senha não deve conter espaços." });
			if (newPassword.length < 8) return res.status(400).json({ message: "A senha deve conter pelo menos 8 caracteres." });
			if (newPassword.length > 20) return res.status(400).json({ message: "A senha deve ter 20 ou menos caracteres." });
			if (newPassword !== confirmPassword) return res.status(400).json({ message: "As senhas não estão iguais. Confirme corretamente." });

			query = `UPDATE fs_richier_users SET name = $1, username = $2, password = $3 RETURNING *`;
			values = [name.trim(), username, hash];
		} else {
			query = `UPDATE fs_richier_users SET name = $1, username = $2 RETURNING *`;
			values = [name.trim(), username];
		}

		try {
			const userResult = await db.query(query, values);
			const user = userResult.rows[0];

			jwtSign(user, res);

			return res.status(201).json({ message: "Informações editadas", user: { name: user.name, username: user.username } });
		} catch (error) {
			return res.status(500).json({ message: "Algo deu errado. Tente novamente." });
		}
	});
}

export async function deleteUser(req, res) {
	const password = req.body.password;
	const userResult = await db.query("SELECT * FROM fs_richier_users WHERE id = $1", [req.user.id]);
	const user = userResult.rows[0];

	bcrypt.compare(password, user.password, async (err, result) => {
		if (result) {
			await db.query("DELETE FROM fs_richier_users WHERE id = $1", [req.user.id]);
			await db.query("DELETE FROM fs_richier_entries WHERE user_id = $1", [req.user.id]);

			res.clearCookie("token");

			return res.status(201).json({ message: "Excluído" });
		}

		if (!result) return res.status(401).json({ message: "Senha incorreta." });

		if (err) return res.status(500).json({ message: "Algo deu errado. Tente novamente." });
	});
}

export function logged(req, res) {
	return res.status(200).json(req.user);
}

export function logOut(req, res) {
	res.clearCookie("token");
	return res.status(200).json({ message: "User desconectado" });
}

async function signUpValidation(username, password, confirmPassword, firstName, lastName, name) {
	// USERNAME VALIDATION
	if (username.length < 6) return "Nome de usuário deve conter pelo menos 6 caracteres.";
	if (username.includes(" ")) return "Nome de usuário não pode conter espaços.";
	if (username.length > 15) return "Nome de usuário deve ter 15 ou menos caracteres.";
	const { rowCount: userExists } = await db.query("SELECT 1 FROM fs_richier_users WHERE username = $1", [username]);
	if (userExists) return "Esse nome de usuário já está cadastrado.";

	// PASSWORD VALIDATION
	if (password.length < 8) return "A senha deve conter pelo menos 8 caracteres.";
	if (password.length > 20) return "A senha deve ter 20 ou menos caracteres.";
	if (password.includes(" ")) return "A senha não pode conter espaços.";
	if (password !== confirmPassword) return "As senhas não estão iguais. Confirme corretamente.";

	// NAME VALIDATION
	if (!firstName.length) return "Primeiro nome está vazio.";
	if (!lastName.length) return "Último nome está vazio.";
	if (firstName.includes(" ") && lastName.includes(" ")) return "O nome e sobrenome não podem conter espaços";
	if (firstName.includes(" ")) return "O nome não pode conter espaços";
	if (lastName.includes(" ")) return "O sobrenome não pode conter espaços";
	if (name.length > 100) return "O nome completo deve ter menos de 100 caracteres.";

	return null;
}

function formatName(firstName, lastName) {
	const name = `${firstName.at(0).toUpperCase()}${firstName.slice(1).toLowerCase()} ${lastName.at(0).toUpperCase()}${lastName.slice(1).toLowerCase()}`;

	return name;
}
