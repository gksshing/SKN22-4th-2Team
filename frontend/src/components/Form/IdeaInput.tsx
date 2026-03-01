import { useState, useEffect, FormEvent } from 'react';

interface IdeaInputProps {
    onSubmit: (idea: string) => void;
    disabled: boolean;
    /** 히스토리에서 원클릭 재분석 시 외부에서 주입되는 초기값 */
    initialValue?: string;
}

export function IdeaInput({ onSubmit, disabled, initialValue }: IdeaInputProps) {
    const [idea, setIdea] = useState(initialValue || '');
    const [inputError, setInputError] = useState(''); // alert() 대신 인라인 에러 메시지

    // 히스토리 원클릭 재분석: 외부에서 initialValue가 변경되면 textarea 동기화
    useEffect(() => {
        if (initialValue !== undefined) {
            setIdea(initialValue);
            setInputError('');
        }
    }, [initialValue]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (idea.trim().length < 10) {
            // Critical 수정: alert() → 인라인 에러 메시지 (UX 단절 방지)
            setInputError('아이디어를 최소 10자 이상 구체적으로 입력해주세요.');
            return;
        }
        setInputError('');
        onSubmit(idea);
    };

    return (
        <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="p-6 bg-blue-50/50 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="mr-2">💡</span> 새로운 기술/아이디어 입력
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                    발명의 핵심 기능, 기술적 특징, 그리고 해결하고자 하는 문제점을 구체적으로 작성해 주세요.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
                <div className="mb-4">
                    <textarea
                        className={`w-full h-40 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all placeholder:text-gray-400 text-gray-800 ${inputError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                            }`}
                        placeholder="예시: 음성 인식 기술을 활용하여 10개 강아지 국적 언어를 실시간으로 견주에게 번역해 주는 강아지 번역 목걸이"
                        value={idea}
                        onChange={(e) => {
                            setIdea(e.target.value);
                            if (inputError) setInputError(''); // 입력 시 에러 자동 해제
                        }}
                        disabled={disabled}
                        maxLength={1000}
                    />
                    <div className="flex justify-between mt-1 text-xs">
                        {/* 인라인 에러 메시지 (alert 대체) */}
                        {inputError ? (
                            <span className="text-red-500 font-medium">{inputError}</span>
                        ) : (
                            <span className="text-gray-500">최소 10자 이상 입력</span>
                        )}
                        <span className="text-gray-500">{idea.length} / 1000 자</span>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={disabled || idea.trim().length === 0}
                        className={`px-8 py-3 rounded-lg font-bold text-white transition-all shadow-md
              ${disabled || idea.trim().length === 0
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
                            }`}
                    >
                        특허 검증 시작하기 🚀
                    </button>
                </div>
            </form>
        </div>
    );
}
