/**
 * 전역 타입 앰비언트 선언 파일
 * window.ENV: 런타임 환경 변수 주입 인터페이스 (Nginx/Docker 환경에서 주입)
 */
declare global {
    interface Window {
        ENV?: {
            API_BASE_URL?: string;
            USER_ID?: string;
            VITE_API_URL?: string;
        };
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }

    interface ImportMetaEnv {
        readonly VITE_API_BASE_URL?: string;
        readonly VITE_API_URL?: string;
        [key: string]: any;
    }
}

// 이 파일이 모듈로 처리되도록 빈 export 추가
export { };
