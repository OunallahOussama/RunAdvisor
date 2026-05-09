@echo off
REM RunAdvisor Setup Script for Windows

echo 🏃 RunAdvisor - AI-Powered Running Coach
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose.
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please update .env with your Strava API credentials
    echo    Edit .env and add:
    echo    - STRAVA_CLIENT_ID
    echo    - STRAVA_CLIENT_SECRET
    echo    - OPENAI_API_KEY (optional)
)

echo.
echo 🐳 Starting Docker services...
docker-compose up --build

echo.
echo ✅ RunAdvisor is ready!
echo.
echo 📱 Frontend:  http://localhost:3000
echo 🔌 API:       http://localhost:5000
echo 🗄️  MongoDB:   mongodb://admin:password@localhost:27017
echo.
echo 🔑 Default MongoDB credentials:
echo    Username: admin
echo    Password: password
echo.
