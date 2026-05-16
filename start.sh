#!/bin/bash

# RunAdvisor Setup Script

echo "🏃 RunAdvisor - AI-Powered Running Coach"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env with your Strava API credentials"
    echo "   Edit .env and add:"
    echo "   - STRAVA_CLIENT_ID"
    echo "   - STRAVA_CLIENT_SECRET"
    echo "   - OPENAI_API_KEY (optional)"
fi

echo ""
echo "🐳 Starting Docker services..."
$COMPOSE up --build

echo ""
echo "✅ RunAdvisor is ready!"
echo ""
echo "📱 Frontend:  http://localhost:3000"
echo "🔌 API:       http://localhost:5000"
echo "🗄️  MongoDB:   mongodb://admin:password@localhost:27017"
echo ""
echo "🔑 Default MongoDB credentials:"
echo "   Username: admin"
echo "   Password: password"
echo ""
