export interface LoginParams {
    email: string;
    password?: string;
}

export interface UserResponse {
    email: string;
}

export interface LoginResponse {
    status: string;
    message: string;
    user: UserResponse;
}

export interface SignupParams {
    email: string;
    password?: string;
}

export interface AuthState {
    user: UserResponse | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
