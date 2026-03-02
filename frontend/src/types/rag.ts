export interface PatentContext {
    id: string; // 특허 번호
    similarity: number; // 유사도 (%)
    title: string; // 특허 제목
    summary: string; // 특허 요약 (위험 사유 등)
}

export interface RagAnalysisResult {
    riskLevel: 'Low' | 'Medium' | 'High'; // 침해 위험도
    riskScore: number; // 침해 위험도 점수 (%)
    similarCount: number; // 발견된 유사 특허 수
    uniqueness: 'Low' | 'Medium' | 'High'; // 핵심 차별성 수준
    topPatents: PatentContext[]; // 상위 유사 특허 리스트
}

export interface RagStreamState {
    isAnalyzing: boolean;
    isSkeletonVisible: boolean;
    isComplete: boolean;
    percent: number;
    message: string;
    resultData: RagAnalysisResult | null;
}

// ============================================================
// Issue #51: Backend-Frontend 스트리밍 계약 타입 (SSE 표준 기준)
// TODO: Backend가 SSE 표준으로 전환되면 파서 복원 시 이 타입을 그대로 사용
// ============================================================

/** 표준 SSE 이벤트 타입 목록 */
export type StreamEventType = 'progress' | 'complete' | 'empty' | 'error';

/** event:progress 이벤트의 data 스키마 */
export interface StreamProgressEvent {
    percent: number;
    message: string;
}

/** event:complete 이벤트의 data 스키마 */
export interface StreamCompleteEvent {
    result: RagAnalysisResult;
}

// ※ Backend SSE 전환 완료 (Issue #51) — NdjsonStreamLine 타입 제거됨
