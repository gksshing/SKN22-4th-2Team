import { FC } from 'react';

interface GlobalLoadingProps {
    isAnalyzing: boolean;
    message?: string;
    onCancel?: () => void;
}

/**
 * 전역 분석 로딩 오버레이
 * - 분석 진행 중(isAnalyzing)일 때 화면 전체를 덮어 중복 입력을 방지하고
 * - 현재 진행 단계(message)를 사용자에게 고품질 스피너와 함께 보여줍니다.
 */
export const GlobalLoading: FC<GlobalLoadingProps> = ({ isAnalyzing, message, onCancel }) => {
    if (!isAnalyzing) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative flex flex-col items-center p-10 bg-white rounded-3xl shadow-2xl border border-blue-50 max-w-sm w-full mx-4 overflow-hidden">
                {/* 배경 장식 애니메이션 */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>

                {/* 프리미엄 로더 */}
                <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-4 border-4 border-indigo-200 rounded-full border-b-transparent animate-reverse-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl animate-pulse">💡</span>
                    </div>
                </div>

                {/* 텍스트 정보 */}
                <h3 className="text-xl font-bold text-slate-800 mb-2">AI 분석 진행 중...</h3>
                <p className="text-slate-500 text-center text-sm font-medium leading-relaxed mb-6">
                    {message || '특허 데이터베이스에서 유사한 아이디어를 실시간으로 검색하고 분석 리포트를 생성하고 있습니다.'}
                </p>

                {/* 프로그레스 인티케이터 바 (장식용) */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 w-full origin-left animate-loading-bar"></div>
                </div>

                {/* 취소 버튼 */}
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest border-b border-transparent hover:border-red-200"
                    >
                        분석 중단하기
                    </button>
                )}
            </div>

            {/* 하단 문구 */}
            <p className="mt-6 text-white text-sm font-bold tracking-widest uppercase opacity-80 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                DO NOT CLOSE THIS WINDOW
            </p>
        </div>
    );
};
