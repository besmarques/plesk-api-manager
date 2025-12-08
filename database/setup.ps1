# ======================================================================
# PLESK API MANAGER - DATABASE SETUP
# ======================================================================
# Clean, working database setup script
# ======================================================================

Write-Host "Plesk API Manager - Database Setup" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""

# Database configuration
$dbName = "plesk_manager"
$dbUser = "plesk_user"
$dbPassword = "SecurePassword123!"

# Prompt for MySQL root password
Write-Host "Please enter your MySQL root password:" -ForegroundColor Yellow
$rootPasswordSecure = Read-Host -AsSecureString
$rootPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($rootPasswordSecure))

Write-Host ""

try {
    # Step 1: Create database and user
    Write-Host "Creating database and user..." -ForegroundColor Yellow
    
    $setupSql = @"
CREATE DATABASE IF NOT EXISTS $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
DROP USER IF EXISTS '$dbUser'@'localhost';
CREATE USER '$dbUser'@'localhost' IDENTIFIED BY '$dbPassword';
GRANT ALL PRIVILEGES ON $dbName.* TO '$dbUser'@'localhost';
FLUSH PRIVILEGES;
SELECT 'Database and user created successfully!' as Status;
"@
    
    $setupSql | mysql -u root -p"$rootPassword"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database and user created!" -ForegroundColor Green
        
        # Step 2: Import schema
        Write-Host "Importing database schema..." -ForegroundColor Yellow
        Get-Content "database\schema.sql" | mysql -u $dbUser -p"$dbPassword" $dbName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Schema imported!" -ForegroundColor Green
            
            # Step 3: Import sample data
            $importSample = Read-Host "Import sample data? (y/n)"
            if ($importSample -eq "y" -or $importSample -eq "Y") {
                Write-Host "Importing sample data..." -ForegroundColor Yellow
                Get-Content "database\seeders.sql" | mysql -u $dbUser -p"$dbPassword" $dbName
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ Sample data imported!" -ForegroundColor Green
                } else {
                    Write-Host "❌ Error importing sample data" -ForegroundColor Red
                }
            }
            
            # Step 4: Verify setup
            Write-Host "Verifying database setup..." -ForegroundColor Yellow
            mysql -u $dbUser -p"$dbPassword" $dbName -e "SELECT COUNT(*) as Table_Count FROM information_schema.tables WHERE table_schema = '$dbName';"
            
        } else {
            Write-Host "❌ Error importing schema" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Error creating database" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
} finally {
    $rootPassword = $null
}

# Update .env file
if (Test-Path ".env.example" -and -not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    
    $envContent = Get-Content ".env"
    $envContent = $envContent -replace "DB_NAME=.*", "DB_NAME=$dbName"
    $envContent = $envContent -replace "DB_USER=.*", "DB_USER=$dbUser"
    $envContent = $envContent -replace "DB_PASSWORD=.*", "DB_PASSWORD=$dbPassword"
    $envContent | Set-Content ".env"
    
    Write-Host "✅ .env file created and configured!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Database setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Database: $dbName" -ForegroundColor Cyan
Write-Host "Username: $dbUser" -ForegroundColor Cyan
Write-Host "Password: $dbPassword" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: npm run dev:all" -ForegroundColor Yellow