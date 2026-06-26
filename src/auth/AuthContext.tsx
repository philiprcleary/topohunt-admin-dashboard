/** @format */

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { createAdminApi, login as apiLogin } from "../api/client";

const TOKEN_KEY = "admin_dashboard_token";

interface AuthContextValue {
	token: string | null;
	api: ReturnType<typeof createAdminApi> | null;
	login: (username: string, password: string) => Promise<void>;
	logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [token, setToken] = useState<string | null>(() =>
		localStorage.getItem(TOKEN_KEY),
	);

	const login = useCallback(async (username: string, password: string) => {
		const newToken = await apiLogin(username, password);
		localStorage.setItem(TOKEN_KEY, newToken);
		setToken(newToken);
	}, []);

	const logout = useCallback(() => {
		localStorage.removeItem(TOKEN_KEY);
		setToken(null);
	}, []);

	const value = useMemo<AuthContextValue>(
		() => ({
			token,
			api: token ? createAdminApi(token) : null,
			login,
			logout,
		}),
		[token, login, logout],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}
