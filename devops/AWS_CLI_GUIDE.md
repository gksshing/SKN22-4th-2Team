# 📖 AWS CLI 명령어 실행 가이드 (초보자용)

ECS 배포 타임아웃 문제를 해결하기 위해, ALB(Load Balancer) 설정을 변경하는 방법을 가장 쉬운 방법부터 차례대로 알려드립니다.

---

### 방법 1: AWS CloudShell 사용하기 (가장 권장)
AWS 웹 콘솔에서 직접 실행하는 방법으로, 로컬 컴퓨터에 아무것도 설치할 필요가 없습니다.

1. **AWS 콘솔 로그인**: [AWS Management Console](https://console.aws.amazon.com/)에 로그인합니다.
2. **CloudShell 실행**: 화면 우측 상단 메뉴바에서 터미널 아이콘( `>_` )을 클릭하여 **CloudShell**을 엽니다. (지역이 `ap-northeast-2`인지 확인하세요.)
3. **Target Group ARN 확인**: 아래 명령어를 복사해서 CloudShell 터미널에 붙여넣고 엔터를 칩니다.
   ```bash
   aws elbv2 describe-target-groups --names short-cut-api-tg --query 'TargetGroups[0].TargetGroupArn' --output text
   ```
   *결과로 `arn:aws:elasticloadbalancing:ap-northeast-2:...` 형태의 긴 문자열이 나옵니다. 이를 복사해두세요.*

4. **설정 변경 명령어 실행**: 아래 명령어에서 `<복사한_ARN>` 부분을 위에서 얻은 문자열로 바꿔서 각각 실행합니다.

   **A. 상태 확인(Health Check) 최적화:**
   ```bash
   aws elbv2 modify-target-group \
     --target-group-arn <복사한_ARN> \
     --health-check-interval-seconds 15 \
     --healthy-threshold-count 2
   ```

   **B. 대기 시간(Deregistration Delay) 단축:**
   ```bash
   aws elbv2 modify-target-group-attributes \
     --target-group-arn <복사한_ARN> \
     --attributes Key=deregistration_delay.timeout_seconds,Value=60
   ```

---

### 방법 2: 로컬 컴퓨터(Windows PowerShell) 사용하기
브라우저 대신 본인의 PC 터미널에서 실행하고 싶을 때 사용합니다. (AWS CLI가 설치되어 있어야 합니다.)

1. `Win + X` 키를 누르고 **Windows PowerShell** 또는 **터미널**을 엽니다.
2. `aws configure` 명령어가 이미 완료되어 있는지 확인합니다.
3. 방법 1에 있는 동일한 명령어들을 순서대로 입력합니다.

---

### 실행 후 확인 사항
1. 설정이 완료되었다면, 다시 **GitHub Actions** 페이지로 이동합니다.
2. 실패했던 `ECR 이미지 빌드 및 푸시` 워크플로우를 찾아서 **Re-run jobs** 버튼을 눌러 다시 실행합니다.
3. 이제 대기 시간이 확 줄어들어 타임아웃 없이 배포가 완료될 것입니다!
