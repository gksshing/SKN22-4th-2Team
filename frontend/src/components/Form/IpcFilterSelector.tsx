import { useState } from 'react';

// IPC 카테고리 주요 목록 (국제특허분류 주요 섹션)
const IPC_OPTIONS = [
    { code: 'H04', label: '📡 통신' },
    { code: 'G06', label: '💻 소프트웨어/컴퓨팅' },
    { code: 'A61', label: '🏥 의료/바이오' },
    { code: 'B60', label: '🚗 운송/자동차' },
    { code: 'H01', label: '⚡ 전기소자/반도체' },
    { code: 'F16', label: '⚙️ 기계요소' },
    { code: 'C12', label: '🧬 바이오기술' },
    { code: 'G01', label: '🔬 측정/계측' },
];

interface IpcFilterSelectorProps {
    /** 현재 선택된 IPC 코드 배열 */
    selectedFilters: string[];
    /** 선택 변경 시 상위 컴포넌트에 필터 목록 전달 */
    onChange: (filters: string[]) => void;
    /** 분석 중일 때 비활성화 */
    disabled?: boolean;
}

export function IpcFilterSelector({ selectedFilters, onChange, disabled }: IpcFilterSelectorProps) {
    const toggleFilter = (code: string) => {
        if (disabled) return;
        const isSelected = selectedFilters.includes(code);
        const updated = isSelected
            ? selectedFilters.filter((c) => c !== code) // 제거
            : [...selectedFilters, code]; // 추가
        onChange(updated);
    };

    return (
        <div className="w-full max-w-3xl mx-auto mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                🏷️ 기술 분야 필터 <span className="font-normal text-gray-400">(선택 시 해당 분야 특허만 검색)</span>
            </p>
            <div className="flex flex-wrap gap-2">
                {IPC_OPTIONS.map((opt) => {
                    const isSelected = selectedFilters.includes(opt.code);
                    return (
                        <button
                            key={opt.code}
                            type="button"
                            onClick={() => toggleFilter(opt.code)}
                            disabled={disabled}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                                ${isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                                }
                                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            title={`IPC 코드: ${opt.code}`}
                        >
                            {opt.label}
                            {isSelected && (
                                <span className="ml-1 text-blue-200">✓</span>
                            )}
                        </button>
                    );
                })}

                {/* 선택 초기화 버튼 */}
                {selectedFilters.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        disabled={disabled}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                    >
                        ✕ 초기화
                    </button>
                )}
            </div>
        </div>
    );
}
