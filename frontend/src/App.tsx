import { useState, useEffect, ChangeEvent } from 'react';
import { TimeoutToast } from './components/Loading/TimeoutToast';
import { IdeaInput } from './components/Form/IdeaInput';
import { IpcFilterSelector } from './components/Form/IpcFilterSelector';
import { ResultView } from './components/Result/ResultView';
import { ErrorFallback } from './components/common/ErrorFallback';
import { HistorySidebar } from './components/History/HistorySidebar';
import { useRagStream } from './hooks/useRagStream';
// Issue #46: Auth 컴포넌트 (Backend /auth/me 개통 후 조건부 라우팅 활성화)
import { useAuth } from './hooks/useAuth';
// Issue #47: 세션 만료 전역 토스트 (auth:session-expired 이벤트 수신)
import { SessionExpiredToast } from './components/Auth/SessionExpiredToast';
import { AuthGuard } from './components/Auth/AuthGuard';
import { GlobalLoading } from './components/Loading/GlobalLoading';
import { AuthErrorToast } from './components/Auth/AuthErrorToast';


function App() {
    const [idea, setIdea] = useState('');
    /** IPC 카테고리 필터: IpcFilterSelector에서 선택한 코드 배열 */
    const [ipcFilters, setIpcFilters] = useState<string[]>([]);
    /** 히스토리 원클릭 시 IdeaInput에 주입할 값 (Critical 수정: 별도 state로 관리) */
    const [historyIdea, setHistoryIdea] = useState<string | undefined>(undefined);
    /** 히스토리 자동 갱신 카운터: isComplete 전환마다 증가 */
    const [refreshCount, setRefreshCount] = useState(0);

    // ========== Issue #46/#48: Auth 상태 관리 ==========
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user: _user, isLoading: isAuthLoading, login, signup, logout, fetchMe, sessionExpiredMsg, clearSessionExpiredMsg } = useAuth();
    const [authView, setAuthView] = useState<'login' | 'signup'>('login');
    /** 게스트 유저 진입 상태 (AuthGuard 제어용) — Issue #GuestAccess */
    const [isGuest, setIsGuest] = useState<boolean>(() => {
        const saved = sessionStorage.getItem('isGuest');
        return saved === null ? true : saved === 'true'; // Default to true if not set
    });

    // 세션 만료 메시지 처리
    useEffect(() => {
        if (sessionExpiredMsg) {
            console.warn('[Auth] 세션 만료:', sessionExpiredMsg);
            clearSessionExpiredMsg();
        }
    }, [sessionExpiredMsg, clearSessionExpiredMsg]);

    // Priority 3: 로그인/로그아웃 시 히스토리 즉시 갱신 및 인증 요청 상태 초기화
    useEffect(() => {
        setRefreshCount((c: number) => c + 1);
        if (_user) {
            setIsGuest(false);
        }
    }, [_user]);

    // 게스트 상태 변경 시 sessionStorage 동기화
    useEffect(() => {
        sessionStorage.setItem('isGuest', isGuest.toString());
    }, [isGuest]);
    // ================================================

    // RAG 분석 상태 관리 훅
    const {
        isAnalyzing,
        isComplete,
        message,
        resultData,
        errorInfo,
        startAnalysis,
        cancelAnalysis,
        setIsComplete,
        setErrorInfo
    } = useRagStream();

    // 폼 제출: 아이디어 텍스트를 상태에 저장하고 RAG 분석 시작
    const handleSubmitIdea = (inputIdea: string) => {
        setIdea(inputIdea);
        startAnalysis(inputIdea, ipcFilters.length > 0 ? ipcFilters : null, true);
    };

    // Critical 수정: 히스토리 원클릭 → IdeaInput 값 동기화 + startAnalysis() 직접 호출
    const handleSelectHistory = (selectedIdea: string) => {
        setIdea(selectedIdea);
        setHistoryIdea(selectedIdea); // IdeaInput useEffect가 감지해 textarea 동기화
        startAnalysis(selectedIdea, ipcFilters.length > 0 ? ipcFilters : null, true);
    };

    const handleReset = () => {
        setIdea('');
        setHistoryIdea('');
        setIsComplete(false);
    };

    // Info: 분석 완료 시 refreshCount 증가 → HistorySidebar 자동 갱신
    useEffect(() => {
        if (isComplete) {
            setRefreshCount((c: number) => c + 1);
        }
    }, [isComplete]);

    return (
        <AuthGuard
            user={_user}
            authView={authView}
            setAuthView={setAuthView}
            isAuthLoading={isAuthLoading}
            login={login}
            signup={signup}
            fetchMe={fetchMe}
            isGuest={isGuest}
            setIsGuest={setIsGuest}
        >
            <div className="min-h-screen bg-gray-50 relative">

                <header className="bg-white border-b border-gray-100 px-8 py-5 shadow-sm flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-blue-900">💡 쇼특허 (Short-Cut) AI</h1>
                        <p className="text-gray-500 text-sm font-medium mt-0.5">아이디어만 입력하면 AI가 실시간으로 특허 침해 여부를 분석해 드립니다.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {_user ? (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-700 font-semibold px-2 py-1 bg-gray-100 rounded-md">👤 {_user.email}</span>
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors font-bold"
                                >
                                    로그아웃
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setAuthView('login');
                                    setIsGuest(false);
                                }}
                                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95"
                            >
                                로그인 / 회원가입
                            </button>
                        )}
                    </div>
                </header>

                <TimeoutToast isAnalyzing={isAnalyzing} timeoutMs={30000} />
                <SessionExpiredToast />
                <AuthErrorToast />
                <GlobalLoading isAnalyzing={isAnalyzing} message={message} onCancel={cancelAnalysis} />

                <main className="flex flex-col md:flex-row gap-6 p-6 max-w-7xl mx-auto">
                    <HistorySidebar
                        onSelectIdea={handleSelectHistory}
                        isAnalyzing={isAnalyzing}
                        refreshTrigger={refreshCount}
                    />

                    <section className="flex-1 flex flex-col gap-6">
                        {errorInfo ? (
                            <ErrorFallback
                                title={errorInfo.title}
                                message={errorInfo.message}
                                errorType={errorInfo.errorType}
                                onRetry={() => {
                                    handleReset();
                                    setErrorInfo(null);
                                }}
                            />
                        ) : isComplete && resultData ? (
                            <ResultView
                                idea={idea}
                                resultData={resultData}
                                onReset={handleReset}
                            />
                        ) : (
                            <div className="w-full">
                                <IpcFilterSelector
                                    selectedFilters={ipcFilters}
                                    onChange={setIpcFilters}
                                    disabled={isAnalyzing}
                                />
                                <IdeaInput
                                    onSubmit={handleSubmitIdea}
                                    disabled={isAnalyzing}
                                    initialValue={historyIdea}
                                />

                            </div>
                        )}
                    </section>
                </main>
            </div>
        </AuthGuard >
    );
}

export default App;
