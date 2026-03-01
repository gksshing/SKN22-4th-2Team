import { PatentContext } from '../../types/rag';

interface SimilarityBarChartProps {
    patents: PatentContext[];
}

/**
 * CSS 기반 유사도 바 차트 (recharts 미사용 — 번들 최적화)
 * 특허 ID별 유사도를 가로 막대 그래프로 시각화
 */
export function SimilarityBarChart({ patents }: SimilarityBarChartProps) {
    if (!patents || patents.length === 0) return null;

    const getBarColor = (sim: number): string => {
        if (sim >= 80) return 'bg-red-500';
        if (sim >= 50) return 'bg-yellow-400';
        return 'bg-green-500';
    };

    const getTextColor = (sim: number): string => {
        if (sim >= 80) return 'text-red-700';
        if (sim >= 50) return 'text-yellow-700';
        return 'text-green-700';
    };

    return (
        <div className="w-full mt-6 p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
                📊 <span>특허별 유사도 비교</span>
            </h3>
            <div className="flex flex-col gap-3">
                {patents.map((patent) => (
                    <div key={patent.id} className="flex items-center gap-3">
                        {/* 특허 ID 라벨 */}
                        <span
                            className="text-xs font-mono text-gray-500 flex-shrink-0 w-28 truncate"
                            title={patent.id}
                        >
                            {patent.id}
                        </span>

                        {/* 바 그래프 */}
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(patent.similarity)}`}
                                style={{ width: `${patent.similarity}%` }}
                            />
                        </div>

                        {/* 퍼센트 수치 */}
                        <span className={`text-xs font-bold flex-shrink-0 w-10 text-right ${getTextColor(patent.similarity)}`}>
                            {patent.similarity}%
                        </span>
                    </div>
                ))}
            </div>

            {/* 범례 */}
            <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />80%+ 위험</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />50~79% 주의</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />~49% 안전</span>
            </div>
        </div>
    );
}
