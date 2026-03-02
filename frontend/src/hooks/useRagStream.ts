import { useState, useRef, useCallback } from 'react';
import { RagAnalysisResult } from '../types/rag';
import { getSessionId } from '../utils/session';
import type { ErrorType } from '../components/common/ErrorFallback';

export interface RagErrorInfo {
    title: string;
    message: string;
    errorType?: ErrorType; // ErrorFallback 타입 기반 분기를 위한 에러 종류
}

export function useRagStream() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSkeletonVisible, setIsSkeletonVisible] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [percent, setPercent] = useState(0);
    const [message, setMessage] = useState('');
    const [resultData, setResultData] = useState<RagAnalysisResult | null>(null);
    const [errorInfo, setErrorInfo] = useState<RagErrorInfo | null>(null);

    // 진행중인 fetch 요청을 취소하기 위한 AbortController
    const abortControllerRef = useRef<AbortController | null>(null);

    const startAnalysis = useCallback(async (
        userIdea: string,
        ipcFilters: string[] | null = null,
        useHybrid: boolean = true
    ) => {
        setIsAnalyzing(true);
        setIsSkeletonVisible(true);
        setIsComplete(false);
        setPercent(0);
        setMessage('네트워크 상의 특허 DB 연결을 시도합니다...');
        setResultData(null);
        setErrorInfo(null);

        // 이전 요청이 있다면 취소
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // 60초 완전 타임아웃 타이머
        const timeoutId = setTimeout(() => {
            if (abortControllerRef.current) {
                // 타임아웃 발생 시 에러명 지정 호출
                abortControllerRef.current.abort(new Error('TIMEOUT'));
            }
        }, 60000);

        try {
            // 백엔드 FastAPI SSE 엔드포인트 호출 (POST)
            // 시니어 리뷰 반영: VITE_API_URL 환경변수 사용
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            // 백엔드 AnalyzeRequest 스키마 필드명에 맞춰 요청 Body 구성
            const reqBody = {
                user_idea: userIdea,
                user_id: getSessionId(), // UUID 세션 ID 사용 (Issue #24)
                use_hybrid: useHybrid,
                ipc_filters: ipcFilters && ipcFilters.length > 0 ? ipcFilters : null,
                stream: true,
            };
            // API 버전 prefix: /api/v1/analyze (app.js 기준으로 통일)
            const response = await fetch(`${apiUrl}/api/v1/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'X-Session-ID': getSessionId(), // Issue #24: 세션 식별자 헤더
                },
                body: JSON.stringify(reqBody),
                signal: abortController.signal
            });

            if (!response.ok) {
                // HTTP Status 분기 처리
                if (response.status === 429) {
                    throw new Error('RATE_LIMIT'); // Issue #25: Rate Limit 초과 전용 에러
                } else if (response.status === 413 || response.status === 422) {
                    throw new Error('TOKEN_EXCEEDED');
                } else if (response.status === 404) {
                    throw new Error('NOT_FOUND');
                } else {
                    throw new Error('NETWORK_ERROR');
                }
            }

            if (!response.body) {
                throw new Error('NETWORK_ERROR');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            // Issue #51 임시 대응: Backend가 현재 NDJSON(\n 단위 JSON)을 내려줌
            // TODO(Backend-SSE-전환 후): 아래 파서를 SSE(\n\n + event:/data: 방식)로 원복
            let ndjsonPercent = 0; // percent 필드가 없을 경우 단계별 추정값

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                // 청크 디코딩 후 버퍼에 누적
                buffer += decoder.decode(value, { stream: true });

                // [임시] NDJSON: \n 단위로 라인 분리 (SSE라면 \n\n 단위)
                const lines = buffer.split('\n');
                // 마지막 줄은 아직 불완전할 수 있으므로 버퍼에 남김
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;

                    // SSE 표준 "data: ..." 형식도 같이 허용 (Backend 전환 시 자연스럽게 호환)
                    let dataStr = line.trim();
                    if (dataStr.startsWith('data:')) {
                        dataStr = dataStr.replace(/^data:\s*/, '').trim();
                    }
                    if (!dataStr || dataStr.startsWith('event:') || dataStr.startsWith(':')) {
                        continue; // event:, 주석 라인 무시
                    }

                    try {
                        const parsed = JSON.parse(dataStr);

                        // ── SSE 표준 방식 처리 (event type 기반) ──
                        // Backend가 SSE로 전환하면 이 블록이 자동으로 동작
                        if (parsed.percent !== undefined) {
                            // percent 필드가 존재하면 SSE progress 방식
                            if (parsed.percent >= 10) setIsSkeletonVisible(false);
                            setPercent(parsed.percent);
                            setMessage(parsed.message || '분석 중...');
                        } else if (parsed.result !== undefined) {
                            // SSE complete 방식
                            setPercent(100);
                            setMessage('분석이 모두 완료되었습니다.');
                            setResultData(parsed.result);
                            setTimeout(() => {
                                setIsAnalyzing(false);
                                setIsComplete(true);
                            }, 1500);
                        }
                        // ── NDJSON 임시 방식 처리 (status 필드 기반) ──
                        else if (parsed.status !== undefined) {
                            if (parsed.status === 'processing') {
                                // 첫 청크 도착 시 스켈레톤 숨김
                                setIsSkeletonVisible(false);
                                ndjsonPercent = Math.min(ndjsonPercent + 15, 40);
                                setPercent(ndjsonPercent);
                                setMessage(parsed.message || '분석을 시작합니다...');
                            } else if (parsed.status === 'searching') {
                                ndjsonPercent = Math.min(ndjsonPercent + 25, 80);
                                setPercent(ndjsonPercent);
                                setMessage(parsed.message || '특허 DB 검색 중...');
                            } else if (parsed.status === 'complete') {
                                setPercent(100);
                                setMessage('분석이 모두 완료되었습니다.');
                                if (parsed.result) setResultData(parsed.result);
                                setTimeout(() => {
                                    setIsAnalyzing(false);
                                    setIsComplete(true);
                                }, 1500);
                            } else if (parsed.status === 'empty') {
                                throw new Error('NOT_FOUND');
                            } else if (parsed.status === 'error') {
                                throw new Error('NETWORK_ERROR');
                            }
                        }
                    } catch (e: any) {
                        if (e.message === 'NOT_FOUND' || e.message === 'NETWORK_ERROR') throw e;
                        // JSON 파싱 실패 — 원문 노출 방지를 위해 무시
                        console.warn('[useRagStream] JSON 파싱 실패 (무시):', line.substring(0, 80));
                    }
                }
            }
            clearTimeout(timeoutId);
        } catch (error: any) {
            clearTimeout(timeoutId);

            // AbortController.abort() 발생 시
            if (error.name === 'AbortError' || error.message === 'TIMEOUT' || (error.cause && error.cause.message === 'TIMEOUT')) {
                // DOMException AbortError가 타임아웃 타이머에 의해 트리거된 경우를 명시적으로 체킹하기엔 어렵지만 name 또는 custom error throw 패턴
                if (error.message === 'TIMEOUT' || (error.cause && error.cause.message === 'TIMEOUT')) {
                    setErrorInfo({
                        title: '분석 시간 초과 (Timeout) ⏱️',
                        message: '분석에 시간이 초과되었습니다. 입력을 줄여서 다시 시도해 주세요.'
                    });
                } else {
                    console.log('Analysis request aborted by user');
                }
            } else {
                console.error('Analysis failed:', error);

                // 에러 종류별 매핑
                if (error.message === 'TOKEN_EXCEEDED') {
                    setErrorInfo({
                        title: '입력 텍스트가 너무 깁니다 🚫',
                        message: '입력하신 특허 아이디어가 백엔드 처리 한도를 초과했습니다.',
                        errorType: 'TOKEN_EXCEEDED',
                    });
                } else if (error.message === 'RATE_LIMIT') {
                    setErrorInfo({
                        title: '오늘의 분석 한도를 소진했습니다 🚫',
                        message: '일일 무료 분석 횟수(10회)를 모두 사용했습니다. 내일 다시 시도해 주세요.',
                        errorType: 'RATE_LIMIT',
                    });
                } else if (error.message === 'NOT_FOUND') {
                    setErrorInfo({
                        title: '유사 특허 결과를 찾지 못했습니다 📭',
                        message: '입력하신 내용과 일치하는 선행 특허가 없습니다.',
                        errorType: 'NOT_FOUND',
                    });
                } else {
                    setErrorInfo({
                        title: '네트워크 연결 오류 🔌',
                        message: '일시적인 연결 문제가 발생했습니다. 백엔드 서버가 켜져 있는지 확인하고 잠시 후 다시 시도해 주세요.',
                        errorType: 'NETWORK_ERROR',
                    });
                }
            }

            // UI 상태 초기화로 Fallback 이나 기본화면 노출 유도
            setIsAnalyzing(false);
            setIsSkeletonVisible(false);
            setPercent(0);
        } finally {
            abortControllerRef.current = null;
        }
    }, []);

    const cancelAnalysis = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsAnalyzing(false);
        setIsSkeletonVisible(false);
        setIsComplete(false);
        setPercent(0);
        setMessage('');
        setResultData(null);
        setErrorInfo(null);
    }, []);

    return {
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
    };
}
