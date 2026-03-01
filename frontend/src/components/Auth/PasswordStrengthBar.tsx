/**
 * 비밀번호 복잡도 강도 바 컴포넌트 (Issue #47)
 *
 * 4단계 강도 표시:
 * - 1단계 (점수 1): 매우 약함 (빨강)
 * - 2단계 (점수 2): 약함 (주황)
 * - 3단계 (점수 3): 보통 (노랑)
 * - 4단계 (점수 4): 강함 (초록)
 *
 * 점수 계산 기준:
 * +1: 8자 이상
 * +1: 영문자 포함
 * +1: 숫자 포함
 * +1: 특수문자 포함
 */

interface PasswordStrengthBarProps {
    password: string;
}

interface StrengthInfo {
    score: number;
    label: string;
    color: string;
    barColor: string;
}

function getStrength(password: string): StrengthInfo {
    if (!password) return { score: 0, label: '', color: '', barColor: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Za-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*#?&]/.test(password)) score++;

    const levels: StrengthInfo[] = [
        { score: 0, label: '', color: '', barColor: '' },
        { score: 1, label: '매우 약함', color: 'text-red-500', barColor: 'bg-red-400' },
        { score: 2, label: '약함', color: 'text-orange-500', barColor: 'bg-orange-400' },
        { score: 3, label: '보통', color: 'text-yellow-500', barColor: 'bg-yellow-400' },
        { score: 4, label: '강함', color: 'text-green-500', barColor: 'bg-green-500' },
    ];

    return levels[score] ?? levels[0];
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
    const strength = getStrength(password);

    if (!password) return null;

    return (
        <div className="mt-2 space-y-1.5">
            {/* 4칸 강도 바 */}
            <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                    <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300
                            ${strength.score >= level ? strength.barColor : 'bg-gray-200'}`}
                    />
                ))}
            </div>

            {/* 강도 레이블 */}
            {strength.label && (
                <p className={`text-xs font-medium ${strength.color} flex items-center gap-1`}>
                    {strength.score === 4 ? '✅' : strength.score >= 3 ? '⚠️' : '❌'}
                    {strength.label}
                </p>
            )}
        </div>
    );
}
