@echo off
REM 제설창고관리시스템 실행 스크립트 (Windows)
REM install.bat을 먼저 한 번 실행한 뒤, 이 파일을 더블클릭하면 서버가 켜집니다.
REM 이 창을 닫으면 서버도 꺼지니, 계속 켜두려면 이 창을 그대로 최소화해 두세요.

echo 이 PC의 사내망 IP 주소를 확인합니다. 아래 목록 중 "IPv4 주소"를 다른 PC 브라우저에 입력하세요.
echo (예: http://192.168.0.23:4000 형태로 접속)
echo.
ipconfig | findstr /i "IPv4"
echo.

cd backend
set PORT=4000
echo 서버를 시작합니다. 이 창을 닫지 마세요.
call npm start
pause
