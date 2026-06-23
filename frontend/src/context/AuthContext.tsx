import React, { createContext, useContext, useState } from 'react';

interface User {
    id: string;
    email: string;
    name: string;
    company_id: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use sessionStorage so the session clears when the browser tab/window is closed.
// This means each fresh visit to the site requires a new sign-in.
const store = sessionStorage;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const stored = store.getItem('user');
        if (stored && stored !== 'undefined') {
            try { return JSON.parse(stored); } catch { return null; }
        }
        return null;
    });
    const [token, setToken] = useState<string | null>(() => store.getItem('token'));

    const login = (newToken: string, userData: User) => {
        store.setItem('token', newToken);
        store.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
    };

    const logout = () => {
        store.removeItem('token');
        store.removeItem('user');
        store.removeItem('refresh_token');
        setToken(null);
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
