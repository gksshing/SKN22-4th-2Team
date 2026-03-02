import { useState, useEffect } from 'react';
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
    /** 히스토리 원클릭 시 IdeaInput에 주입할 값 */
    const [historyIdea, setHistoryIdea] = useState<string | undefined>(undefined);
    /** 히스토리 자동 갱신 카운터: isComplete 전환마다 증가 */
    const [refreshCount, setRefreshCount] = useState(0);

    // RAG 분석 상태 관리 훅
    const {
        isAnalyzing,
        isComplete,
        resultData,
        errorInfo,
        startAnalysis,
        setIsComplete,
        setErrorInfo
    } = useRagStream();

    // 폼 제출: 아이디어 텍스트를 상태에 저장하고 RAG 분석 시작
    const handleSubmitIdea = (inputIdea: string) => {
        setIdea(inputIdea);
        startAnalysis(inputIdea, ipcFilters.length > 0 ? ipcFilters : null, true);
    };

    // 히스토리 원클릭 → IdeaInput 값 동기화 + startAnalysis() 직접 호출
    const handleSelectHistory = (selectedIdea: string) => {
        setIdea(selectedIdea);
        setHistoryIdea(selectedIdea);
        startAnalysis(selectedIdea, ipcFilters.length > 0 ? ipcFilters : null, true);
    };

    const handleReset = () => {
        setIdea('');
        setHistoryIdea('');
        setIsComplete(false);
    };

    // 분석 완료 시 refreshCount 증가 → HistorySidebar 자동 갱신
    useEffect(() => {
        if (isComplete) {
            setRefreshCount((c: number) => c + 1);
        }
    }, [isComplete]);

    return (
        <div className="min-h-screen bg-gray-50 relative">

            <header className="bg-white border-b border-gray-100 px-8 py-5 shadow-sm flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-blue-900">💡 쇼특허 (Short-Cut) AI</h1>
                    <p className="text-gray-500 text-sm font-medium mt-0.5">아이디어만 입력하면 AI가 실시간으로 특허 침해 여부를 분석해 드립니다.</p>
                </div>
            </header>

            <TimeoutToast isAnalyzing={isAnalyzing} timeoutMs={30000} />

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
    );
}

export default App;
