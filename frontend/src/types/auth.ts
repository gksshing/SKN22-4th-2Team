export interface LoginParams {
    email: string;
    password?: string;
}

export interface SignupParams {
    email: string;
    password: string;
    nickname: string;
}

export interface UserResponse {
    email: string;
    nickname: string;
}

export interface AuthState {
    user: UserResponse | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
