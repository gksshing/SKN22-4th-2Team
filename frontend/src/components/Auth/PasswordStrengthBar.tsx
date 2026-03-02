import React from 'react';

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
            <div className="flex gap-1 h-1">
                {[1, 2, 3, 4].map((level) => (
                    <div
                        key={level}
                        className={`h-full flex-1 rounded-full transition-all duration-300
                            ${strength.score >= level ? strength.barColor : 'bg-gray-100'}`}
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
