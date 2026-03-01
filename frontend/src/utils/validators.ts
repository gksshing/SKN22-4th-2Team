/**
 * 폼 유효성 검사 유틸리티 (Issue #46)
 *
 * 로그인/회원가입 폼에서 재사용 가능한 검증 함수 모음.
 * 각 함수는 유효하면 true, 유효하지 않으면 에러 문자열을 반환합니다.
 */

/** 이메일 형식 검증 (RFC 5322 간략 버전) */
export function validateEmail(value: string): string | true {
    if (!value.trim()) return '이메일을 입력해주세요.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return '올바른 이메일 형식을 입력해주세요.';
    return true;
}

/**
 * 비밀번호 복잡도 검증
 * - 최소 8자
 * - 영문자 1개 이상
 * - 숫자 1개 이상
 * - 특수문자(@$!%*#?&) 1개 이상
 */
export function validatePassword(value: string): string | true {
    if (!value) return '비밀번호를 입력해주세요.';
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/;
    if (!passwordRegex.test(value)) {
        return '비밀번호는 8자 이상, 영문·숫자·특수문자를 포함해야 합니다.';
    }
    return true;
}

/** 비밀번호 확인 일치 검증 */
export function validateConfirmPassword(value: string, original: string): string | true {
    if (!value) return '비밀번호 확인을 입력해주세요.';
    if (value !== original) return '비밀번호가 일치하지 않습니다.';
    return true;
}

/** 닉네임/이름 검증 (2~20자, 특수문자 제외) */
export function validateNickname(value: string): string | true {
    if (!value.trim()) return '닉네임을 입력해주세요.';
    if (value.trim().length < 2 || value.trim().length > 20) {
        return '2자 이상 20자 이하로 입력해주세요.';
    }
    const specialCharsRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (specialCharsRegex.test(value)) return '특수문자는 사용할 수 없습니다.';
    return true;
}
