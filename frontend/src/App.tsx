import { useState } from 'react';
import { ProgressStepper } from './components/Loading/ProgressStepper';
import { RagSkeleton } from './components/Loading/RagSkeleton';
import { TimeoutToast } from './components/Loading/TimeoutToast';
import { IdeaInput } from './components/Form/IdeaInput';
import { ResultView } from './components/Result/ResultView';
import { ErrorFallback } from './components/common/ErrorFallback';
import { HistorySidebar } from './components/History/HistorySidebar';
import { useRagStream } from './hooks/useRagStream';

function App() {
    const [idea, setIdea] = useState('');

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
        startAnalysis(inputIdea);
    };

    // 히스토리 항목 클릭: 해당 아이디어를 입력창에 채우기 위해 상위 상태 업데이트
    const handleSelectHistory = (selectedIdea: string) => {
        setIdea(selectedIdea);
    };

    const handleReset = () => {
        setIdea('');
        setIsComplete(false);
    };

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
                />

                {/* 우측: 메인 콘텐츠 영역 */}
                <section className="flex-1 flex flex-col gap-6">

                    {/* 에러 Fallback UI */}
                    {errorInfo ? (
                        <ErrorFallback
                            title={errorInfo.title}
                            message={errorInfo.message}
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
                            <IdeaInput
                                onSubmit={handleSubmitIdea}
                                disabled={isAnalyzing}
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
