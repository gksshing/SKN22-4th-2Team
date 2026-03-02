import { UserResponse } from '../types/auth';

// Auth removed - returns mock data for now
export const useAuth = () => ({
    user: null as UserResponse | null,
    isAuthenticated: false,
    login: async () => { },
    logout: () => { }
});

