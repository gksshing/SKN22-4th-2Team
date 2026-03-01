import { useEffect, useState, useCallback } from 'react';
import { getSessionId } from '../../utils/session';

// 히스토리 단일 항목 타입 (백엔드 반환값 기준: user_idea, timestamp)
interface HistoryItem {
    id?: string;
    user_idea: string;      // 백엔드 반환 필드명 (기존 idea_text → user_idea 확정)
    timestamp?: string;
    risk_level?: string;
}

interface HistorySidebarProps {
    /** 히스토리 항목 클릭 시 아이디어 텍스트를 상위 컴포넌트로 전달하는 콜백 */
    onSelectIdea: (idea: string) => void;
    /** 분석이 진행 중일 때 클릭을 비활성화하기 위한 플래그 */
    isAnalyzing: boolean;
    /** 분석 완료 시 히스토리 목록 자동 갱신 트리거 (isComplete 카운터 전달) */
    refreshTrigger?: number;
}

// 컴포넌트 외부 상수: 매 렌더마다 재생성되지 않도록 하여 useCallback deps 문제 해소
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function HistorySidebar({ onSelectIdea, isAnalyzing, refreshTrigger }: HistorySidebarProps) {

    const [histories, setHistories] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // 히스토리 데이터 조회 (Query Parameter + X-Session-ID 헤더)
    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        const sessionId = getSessionId();
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/history?user_id=${sessionId}`, {
                headers: {
                    'X-Session-ID': sessionId, // Issue #24: 세션 식별자 헤더
                },
            });
            if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);
            const data = await res.json();
            setHistories(data.history || []);
        } catch (err) {
            console.error('[HistorySidebar] 히스토리 조회 실패:', err);
            setFetchError('히스토리를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, []); // API_BASE_URL이 컴포넌트 외부 상수이므로 deps 비우 가능

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Info: refreshTrigger 변경 시(=새 분석 완료 시) 히스토리 자동 갱신
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            fetchHistory();
        }
    }, [refreshTrigger, fetchHistory]);

    // 위험도 뱃지 색상 결정
    const getRiskBadgeStyle = (riskLevel?: string) => {
        switch (riskLevel) {
            case 'High': return 'bg-red-100 text-red-700';
            case 'Medium': return 'bg-yellow-100 text-yellow-700';
            case 'Low': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    return (
        <aside className="w-full md:w-72 shrink-0 flex flex-col gap-3">
            {/* 사이드바 헤더 */}
            <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                    📋 분석 기록
                </h2>
                <button
                    onClick={fetchHistory}
                    className="text-xs text-blue-500 hover:text-blue-700 font-semibold transition-colors"
                    disabled={isLoading}
                    title="새로고침"
                >
                    {isLoading ? '로딩 중...' : '새로고침'}
                </button>
            </div>

            {/* 로딩 스켈레톤 */}
            {isLoading && (
                <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-16 w-full bg-gray-100 rounded-lg animate-pulse"
                        />
                    ))}
                </div>
            )}

            {/* 에러 상태 */}
            {!isLoading && fetchError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
                    ⚠️ {fetchError}
                </div>
            )}

            {/* 빈 상태 */}
            {!isLoading && !fetchError && histories.length === 0 && (
                <div className="p-6 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                    <span className="text-3xl block mb-2">🔍</span>
                    <p className="text-xs text-gray-500 font-medium">
                        아직 분석 기록이 없습니다.
                        <br />첫 번째 특허 아이디어를 검사해보세요!
                    </p>
                </div>
            )}

            {/* 히스토리 목록 */}
            {!isLoading && !fetchError && histories.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {histories.map((item, idx) => {
                        // 텍스트 미리보기 (40자 초과 시 말줄임)
                        const preview = item.user_idea
                            ? item.user_idea.length > 40
                                ? item.user_idea.substring(0, 40) + '...'
                                : item.user_idea
                            : '알 수 없는 아이디어';

                        const dateStr = item.timestamp
                            ? new Date(item.timestamp).toLocaleDateString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })
                            : '';

                        return (
                            <li key={item.id || idx}>
                                <button
                                    onClick={() => {
                                        if (!isAnalyzing && item.user_idea) {
                                            onSelectIdea(item.user_idea);
                                        }
                                    }}
                                    disabled={isAnalyzing}
                                    className={`w-full text-left p-3 rounded-lg border transition-all bg-white shadow-sm
                                        ${isAnalyzing
                                            ? 'opacity-50 cursor-not-allowed border-gray-100'
                                            : 'border-slate-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-400">{dateStr}</span>
                                        {item.risk_level && (
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getRiskBadgeStyle(item.risk_level)}`}>
                                                {item.risk_level}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 line-clamp-2 leading-snug">
                                        {preview}
                                    </p>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </aside>
    );
}
// window.ENV 전역 타입은 src/types/global.d.ts로 이동 완료 (중복 선언 제거)
