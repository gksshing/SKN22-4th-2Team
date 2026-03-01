import { useState, useEffect } from 'react';
import { ProgressStepper } from './components/Loading/ProgressStepper';
import { RagSkeleton } from './components/Loading/RagSkeleton';
import { TimeoutToast } from './components/Loading/TimeoutToast';
import { IdeaInput } from './components/Form/IdeaInput';
import { IpcFilterSelector } from './components/Form/IpcFilterSelector';
import { ResultView } from './components/Result/ResultView';
import { ErrorFallback } from './components/common/ErrorFallback';
import { HistorySidebar } from './components/History/HistorySidebar';
import { useRagStream } from './hooks/useRagStream';

function App() {
    const [idea, setIdea] = useState('');
    /** IPC 카테고리 필터: IpcFilterSelector에서 선택한 코드 배열 */
    const [ipcFilters, setIpcFilters] = useState<string[]>([]);
    /** 히스토리 원클릭 시 IdeaInput에 주입할 값 (Critical 수정: 별도 state로 관리) */
    const [historyIdea, setHistoryIdea] = useState<string | undefined>(undefined);
    /** 히스토리 자동 갱신 카운터: isComplete 전환마다 증가 */
    const [refreshCount, setRefreshCount] = useState(0);

    // RAG 분석 상태 관리 훅
    const {
        isAnalyzing,
        isSkeletonVisible,
        isComplete,
        percent,
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
        startAnalysis(inputIdea, true, ipcFilters.length > 0 ? ipcFilters : null);
    };

    // Critical 수정: 히스토리 원클릭 → IdeaInput 값 동기화 + startAnalysis() 직접 호출
    const handleSelectHistory = (selectedIdea: string) => {
        setIdea(selectedIdea);
        setHistoryIdea(selectedIdea); // IdeaInput useEffect가 감지해 textarea 동기화
        startAnalysis(selectedIdea, true, ipcFilters.length > 0 ? ipcFilters : null);
    };

    const handleReset = () => {
        setIdea('');
        setHistoryIdea('');
        setIsComplete(false);
    };

    // Info: 분석 완료 시 refreshCount 증가 → HistorySidebar 자동 갱신
    useEffect(() => {
        if (isComplete) {
            setRefreshCount((c) => c + 1);
        }
    }, [isComplete]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 페이지 헤더 */}
            <header className="bg-white border-b border-gray-100 px-8 py-5 shadow-sm">
                <h1 className="text-2xl font-extrabold text-blue-900">💡 쇼특허 (Short-Cut) AI</h1>
                <p className="text-gray-500 text-sm font-medium mt-0.5">아이디어만 입력하면 AI가 실시간으로 특허 침해 여부를 분석해 드립니다.</p>
            </header>

            {/* 통신 지연 안내 토스트 (30초 초과 시 표출) */}
            <TimeoutToast isAnalyzing={isAnalyzing} timeoutMs={30000} />

            {/* 메인 2단 레이아웃: 좌측 히스토리 사이드바 + 우측 메인 콘텐츠 */}
            <main className="flex flex-col md:flex-row gap-6 p-6 max-w-7xl mx-auto">

                {/* 좌측: 분석 기록 사이드바 */}
                <HistorySidebar
                    onSelectIdea={handleSelectHistory}
                    isAnalyzing={isAnalyzing}
                    refreshTrigger={refreshCount}
                />

                {/* 우측: 메인 콘텐츠 영역 */}
                <section className="flex-1 flex flex-col gap-6">

                    {/* 에러 Fallback UI */}
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
                        /* 분석 완료: 결과 리포트 렌더링 */
                        <ResultView
                            idea={idea}
                            resultData={resultData}
                            onReset={handleReset}
                        />
                    ) : (
                        /* 입력 및 로딩 화면 */
                        <div className="w-full">
                            {/* IPC 카테고리 필터 (Info: ipcFilters 활성화) */}
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

                            {/* 분석 진행 중: 프로그레스 + 스켈레톤/스트리밍 UI */}
                            {isAnalyzing && (
                                <div className="mt-8">
                                    <ProgressStepper
                                        percent={percent}
                                        message={message}
                                        onCancel={cancelAnalysis}
                                    />

                                    {isSkeletonVisible ? (
                                        /* 초기 대기: 스켈레톤 shimmer 표시 */
                                        <RagSkeleton lines={5} />
                                    ) : (
                                        /* 스트림 수신 중: 실제 진행 메시지를 실시간으로 표시 */
                                        <div className="w-full mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100 mt-6 min-h-[160px]">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">AI 분석 진행 중</h3>
                                            </div>
                                            {/* message: useRagStream에서 SSE progress 이벤트로 수신한 실시간 상태 메시지 */}
                                            <p className="text-gray-700 leading-relaxed font-mono min-h-[2rem]">
                                                {message || '특허 데이터베이스를 검색하고 있습니다...'}
                                                <span className="animate-pulse ml-1">▌</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default App;
