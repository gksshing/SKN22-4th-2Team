/**
 * 클라이언트 고유 세션 ID 관리 유틸리티 (Issue #24)
 *
 * - 최초 접속 시 UUID v4를 생성하여 localStorage에 영구 저장
 * - 시크릿 모드 등 localStorage 접근 불가 환경은 sessionStorage로 fallback
 * - 다중 탭: 동일 localStorage를 공유하므로 같은 세션 ID 유지
 * - 모든 API 요청의 X-Session-ID 헤더에 사용
 */

const SESSION_KEY = 'shortcut_session_id';

/**
 * 세션 ID 반환 함수.
 * localStorage에 저장된 ID가 없으면 새 UUID를 생성하여 저장 후 반환합니다.
 */
export function getSessionId(): string {
    try {
        // localStorage 우선: 브라우저 재방문 시에도 동일 ID 유지
        let sessionId = localStorage.getItem(SESSION_KEY);
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            localStorage.setItem(SESSION_KEY, sessionId);
        }
        return sessionId;
    } catch {
        // 시크릿 모드 또는 보안 정책으로 localStorage 접근 불가 시 sessionStorage fallback
        try {
            let sessionId = sessionStorage.getItem(SESSION_KEY);
            if (!sessionId) {
                sessionId = crypto.randomUUID();
                sessionStorage.setItem(SESSION_KEY, sessionId);
            }
            return sessionId;
        } catch {
            // 최후 수단: 탭 생명주기 동안만 유효한 인메모리 UUID 반환
            return crypto.randomUUID();
        }
    }
}

/**
 * 세션 ID를 강제로 초기화합니다.
 * (로그아웃, 테스트 등의 목적으로 사용)
 */
export function resetSessionId(): void {
    try {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
    } catch {
        // 접근 불가 환경이면 무시
    }
}
