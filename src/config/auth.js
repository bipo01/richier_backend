import jwt from "jsonwebtoken";

export function auth(req, res, next) {
	const token = req.cookies.token;

	if (!token) return res.status(401).json({ message: "Você não está autenticado. Faça login ou crie uma conta." });

	jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
		if (err) return res.status(401).json({ message: "Você não está autenticado. Faça login ou crie uma conta." });

		req.user = decoded;

		next();
	});
}

export function jwtSign(user, res) {
	const token = jwt.sign({ id: user.id, username: user.username, name: user.name }, process.env.JWT_SECRET, { expiresIn: "24h" });
	res.cookie("token", token, { httpOnly: true, sameSite: "none" });
}
