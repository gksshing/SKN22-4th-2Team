

// errorType: 에러 종류를 한국어 문자열 매칭 대신 타입 기반으로 판별 (Info 항목 반영)
export type ErrorType =
    | 'TOKEN_EXCEEDED'
    | 'NOT_FOUND'
    | 'RATE_LIMIT'
    | 'TIMEOUT'
    | 'NETWORK_ERROR'
    | 'SERVER_ERROR'
    | undefined;

interface ErrorFallbackProps {
    title: string;
    message: string;
    onRetry: () => void;
    /** 에러 종류 — 타입별 추가 안내 메시지 및 버튼 렌더링에 사용 */
    errorType?: ErrorType;
}

export function ErrorFallback({ title, message, onRetry, errorType }: ErrorFallbackProps) {
    return (
        <div className="w-full max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-lg border border-red-100 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-5">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                {/* 에러 타입별 아이콘 분기 */}
                <span className="text-3xl">
                    {errorType === 'RATE_LIMIT' ? '🚫' : '⚠️'}
                </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-3">
                {title}
            </h2>

            <div className="bg-gray-50 p-4 rounded-lg w-full mb-8 border border-gray-100">
                <p className="text-gray-600 font-medium">
                    {message}
                </p>
                {/* errorType 기반 추가 안내 (한국어 문자열 매칭 제거 → 타입 우선) */}
                {errorType === 'TOKEN_EXCEEDED' && (
                    <p className="text-sm text-gray-500 mt-2">
                        💡 조치사항: 핵심 아이디어만 간결하게 다시 입력해 주세요. (500자 이내 권장)
                    </p>
                )}
                {errorType === 'NOT_FOUND' && (
                    <p className="text-sm text-gray-500 mt-2">
                        💡 대안: 다른 키워드 또는 더 포괄적인 단어로 다시 시도해 보세요.
                    </p>
                )}
                {errorType === 'RATE_LIMIT' && (
                    <p className="text-sm text-orange-600 mt-2 font-semibold">
                        ⏰ 내일 오전 00:00 이후 다시 이용 가능합니다.
                    </p>
                )}
            </div>

            {/* Rate Limit 시에는 재시도 버튼 숨김 (내일까지 불가이므로 혼란 방지) */}
            {errorType !== 'RATE_LIMIT' ? (
                <button
                    onClick={onRetry}
                    className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2"
                >
                    <span>다시 아이디어 입력하기</span>
                    <span>🔄</span>
                </button>
            ) : (
                <div className="text-sm text-gray-400 font-medium">
                    서비스를 이용해 주셔서 감사합니다 🙏
                </div>
            )}
        </div>
    );
}
