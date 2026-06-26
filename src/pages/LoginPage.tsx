/** @format */

import { type FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
	const { token, login } = useAuth();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	if (token) {
		return <Navigate to="/users" replace />;
	}

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setLoading(true);

		try {
			await login(username, password);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="login-page">
			<form className="login-card" onSubmit={handleSubmit}>
				<h1>Admin Login</h1>
				<p className="muted">Sign in to manage users and custom POIs.</p>

				<label>
					Username
					<input
						type="text"
						value={username}
						onChange={(event) => setUsername(event.target.value)}
						autoComplete="username"
						required
					/>
				</label>

				<label>
					Password
					<input
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						autoComplete="current-password"
						required
					/>
				</label>

				{error && <p className="error-text">{error}</p>}

				<button type="submit" disabled={loading}>
					{loading ? "Signing in…" : "Sign in"}
				</button>
			</form>
		</div>
	);
}
