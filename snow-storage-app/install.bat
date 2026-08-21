@echo off
REM 제설창고관리시스템 최초 설치 스크립트 (Windows)
REM 이 파일을 프로젝트 폴더에 두고 더블클릭하면 됩니다. 딱 한 번만 실행하면 됩니다.

echo ==== 1/4. 백엔드 패키지 설치 ====
cd backend
call npm install
if errorlevel 1 goto :error

echo ==== 2/4. 샘플 데이터(창고/품목/계정) 생성 ====
if not exist data (
  call npm run seed
) else (
  echo 이미 데이터가 있어 건너뜁니다. 처음부터 다시 만들려면 backend\data 폴더를 지우고 다시 실행하세요.
)
cd ..

echo ==== 3/4. 프론트엔드 패키지 설치 ====
cd frontend
call npm install
if errorlevel 1 goto :error

echo ==== 4/4. 프론트엔드 빌드 ====
call npm run build
if errorlevel 1 goto :error
cd ..

echo.
echo 설치가 끝났습니다. 이제 start.bat 파일을 더블클릭해서 실행하세요.
pause
exit /b 0

:error
echo.
echo 오류가 발생했습니다. Node.js가 22.5 이상 설치되어 있는지 확인하세요 (cmd에서 "node -v").
pause
exit /b 1
