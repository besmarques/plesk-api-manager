#!/bin/bash
# ======================================================================
# PLESK API MANAGER - DATABASE SETUP (Linux/macOS)
# ======================================================================

echo "🚀 Setting up Plesk API Manager Database..."
echo ""

# Configuration (update these values)
DB_NAME="plesk_manager"
DB_USER="plesk_user"
DB_PASSWORD="your_secure_database_password"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to prompt for MySQL root password
prompt_mysql_root() {
    echo -e "${YELLOW}Please enter your MySQL root password:${NC}"
    read -s MYSQL_ROOT_PASSWORD
    echo ""
}

# Function to check if MySQL is running
check_mysql() {
    if ! command -v mysql &> /dev/null; then
        echo -e "${RED}MySQL is not installed or not in PATH${NC}"
        exit 1
    fi
    
    if ! mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo -e "${RED}MySQL server is not running${NC}"
        exit 1
    fi
}

# Function to create database and user
create_database() {
    echo -e "${YELLOW}Creating database and user...${NC}"
    
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "
        CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
        GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
        FLUSH PRIVILEGES;
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database and user created successfully!${NC}"
        return 0
    else
        echo -e "${RED}❌ Error creating database. Check your MySQL root password.${NC}"
        return 1
    fi
}

# Function to create schema
create_schema() {
    echo -e "${YELLOW}Creating database schema...${NC}"
    
    mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/schema.sql 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database schema created successfully!${NC}"
        return 0
    else
        echo -e "${RED}❌ Error creating schema. Check database/schema.sql file.${NC}"
        return 1
    fi
}

# Function to seed database
seed_database() {
    echo -e "${YELLOW}Would you like to populate the database with sample data? (y/n):${NC}"
    read -r SEED_RESPONSE
    
    if [[ $SEED_RESPONSE =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Populating database with sample data...${NC}"
        
        mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/seeders.sql 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Sample data populated successfully!${NC}"
            return 0
        else
            echo -e "${RED}❌ Error populating sample data.${NC}"
            return 1
        fi
    else
        echo -e "${CYAN}Skipping sample data population.${NC}"
        return 0
    fi
}

# Function to setup environment file
setup_environment() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env file from template...${NC}"
        cp .env.example .env
        
        # Update database configuration in .env
        sed -i.bak "s/DB_NAME=.*/DB_NAME=${DB_NAME}/" .env
        sed -i.bak "s/DB_USER=.*/DB_USER=${DB_USER}/" .env
        sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" .env
        
        # Remove backup file
        rm -f .env.bak
        
        echo -e "${GREEN}✅ Environment file created!${NC}"
        echo -e "${YELLOW}⚠️  Please update the Plesk server credentials and other settings in .env${NC}"
    else
        echo -e "${CYAN}📝 .env file already exists, skipping...${NC}"
    fi
}

# Function to install npm dependencies
install_dependencies() {
    echo -e "${YELLOW}Would you like to install npm dependencies? (y/n):${NC}"
    read -r INSTALL_RESPONSE
    
    if [[ $INSTALL_RESPONSE =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Installing npm dependencies...${NC}"
        npm install
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"
        else
            echo -e "${RED}❌ Error installing dependencies.${NC}"
        fi
    fi
}

# Main execution
main() {
    echo -e "${CYAN}Checking MySQL availability...${NC}"
    check_mysql
    
    prompt_mysql_root
    
    if create_database; then
        if create_schema; then
            seed_database
        fi
    fi
    
    setup_environment
    install_dependencies
    
    echo ""
    echo -e "${CYAN}🎉 Setup completed!${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo -e "${NC}1. Update your Plesk server credentials in the .env file${NC}"
    echo -e "${NC}2. Generate a secure JWT secret: ${YELLOW}openssl rand -base64 32${NC}"
    echo -e "${NC}3. Update JWT_SECRET in .env with the generated value${NC}"
    echo -e "${NC}4. Run the application: ${GREEN}npm run dev:all${NC}"
    echo ""
}

# Run main function
main