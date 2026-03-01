#!/bin/bash
# =============================================================================
# 쇼특허 (Short-Cut) – ALB Target Group 최적화 스크립트
# =============================================================================
# 역할:
#   1. ALB Target Group의 상태 확인(Health Check) 주기를 단축하여 배포 속도 향상
#   2. Deregistration Delay를 줄여 불필요한 대기 시간 제거
# =============================================================================

# ── 설정 변수 ──────────────────────────────────────────────────────────────
# 실제 환경에 맞춰 수정 필요 (또는 환경 변수로 주입)
TARGET_GROUP_NAME="short-cut-api-tg" # 실제 Target Group 이름 확인 필요
REGION="ap-northeast-2"

echo "[DevOps] Target Group 설정을 최적화합니다: ${TARGET_GROUP_NAME}"

# 1. Target Group ARN 조회
TG_ARN=$(aws elbv2 describe-target-groups \
    --names ${TARGET_GROUP_NAME} \
    --region ${REGION} \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

if [ "${TG_ARN}" = "None" ] || [ -z "${TG_ARN}" ]; then
    echo "❌ 오류: Target Group을 찾을 수 없습니다. 이름을 확인해주세요."
    exit 1
fi

# 2. Health Check 설정 변경 (Interval 15s, Healthy Threshold 2)
echo "[DevOps] Health Check 설정을 변경합니다 (Interval: 15s, Healthy Threshold: 2)..."
aws elbv2 modify-target-group \
    --target-group-arn ${TG_ARN} \
    --health-check-interval-seconds 15 \
    --healthy-threshold-count 2 \
    --region ${REGION}

# 3. Attributes 변경 (Deregistration Delay: 60s)
echo "[DevOps] Deregistration Delay를 60초로 변경합니다..."
aws elbv2 modify-target-group-attributes \
    --target-group-arn ${TG_ARN} \
    --attributes Key=deregistration_delay.timeout_seconds,Value=60 \
    --region ${REGION}

echo "✅ 최적화가 완료되었습니다. 이제 GitHub Actions를 다시 실행하여 배포를 확인하세요."
