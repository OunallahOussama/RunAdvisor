#!/bin/bash

# RunAdvisor Development Helper Script

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_menu() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════${NC}"
    echo -e "${BLUE}   RunAdvisor Development Tools${NC}"
    echo -e "${BLUE}════════════════════════════════════${NC}"
    echo "1. Start all services (docker-compose up --build)"
    echo "2. Stop all services (docker-compose down)"
    echo "3. View backend logs"
    echo "4. View frontend logs"
    echo "5. View MongoDB logs"
    echo "6. Access MongoDB shell"
    echo "7. Rebuild backend container"
    echo "8. Rebuild frontend container"
    echo "9. Reset all data (remove volumes)"
    echo "10. Run backend tests"
    echo "0. Exit"
    echo -e "${BLUE}════════════════════════════════════${NC}"
    echo ""
}

start_services() {
    echo -e "${YELLOW}Starting all services...${NC}"
    docker-compose up --build
}

stop_services() {
    echo -e "${YELLOW}Stopping all services...${NC}"
    docker-compose down
    echo -e "${GREEN}Services stopped.${NC}"
}

view_backend_logs() {
    echo -e "${YELLOW}Backend logs (Ctrl+C to exit):${NC}"
    docker-compose logs -f backend
}

view_frontend_logs() {
    echo -e "${YELLOW}Frontend logs (Ctrl+C to exit):${NC}"
    docker-compose logs -f frontend
}

view_mongodb_logs() {
    echo -e "${YELLOW}MongoDB logs (Ctrl+C to exit):${NC}"
    docker-compose logs -f mongodb
}

access_mongodb() {
    echo -e "${YELLOW}Connecting to MongoDB shell...${NC}"
    docker-compose exec mongodb mongosh -u admin -p password
}

rebuild_backend() {
    echo -e "${YELLOW}Rebuilding backend container...${NC}"
    docker-compose up -d --build backend
    echo -e "${GREEN}Backend rebuilt.${NC}"
}

rebuild_frontend() {
    echo -e "${YELLOW}Rebuilding frontend container...${NC}"
    docker-compose up -d --build frontend
    echo -e "${GREEN}Frontend rebuilt.${NC}"
}

reset_data() {
    echo -e "${RED}WARNING: This will delete all database data!${NC}"
    read -p "Are you sure? (yes/no): " confirmation
    if [ "$confirmation" = "yes" ]; then
        echo -e "${YELLOW}Removing volumes...${NC}"
        docker-compose down -v
        echo -e "${GREEN}All data reset. Run 'docker-compose up --build' to start fresh.${NC}"
    else
        echo "Cancelled."
    fi
}

run_tests() {
    echo -e "${YELLOW}Running backend tests...${NC}"
    docker-compose exec backend npm test
}

while true; do
    show_menu
    read -p "Select option: " choice
    
    case $choice in
        1) start_services ;;
        2) stop_services ;;
        3) view_backend_logs ;;
        4) view_frontend_logs ;;
        5) view_mongodb_logs ;;
        6) access_mongodb ;;
        7) rebuild_backend ;;
        8) rebuild_frontend ;;
        9) reset_data ;;
        10) run_tests ;;
        0) echo -e "${GREEN}Goodbye!${NC}"; exit 0 ;;
        *) echo -e "${RED}Invalid option. Please try again.${NC}" ;;
    esac
done
