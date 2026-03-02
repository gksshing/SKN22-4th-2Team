/**
 * 회원 정보 인터페이스
 */
export interface UserResponse {
    id: string;
    email: string;
    name?: string;
}

/**
 * 로그인 요청 파라미터
 */
export interface LoginParams {
    email: string;
    password?: string;
}

/**
 * 회원가입 요청 파라미터
 */
export interface SignupParams {
    email: string;
    password?: string;
    name?: string;
}

export type User = UserResponse | null;
