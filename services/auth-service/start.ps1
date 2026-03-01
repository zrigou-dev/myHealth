#!/usr/bin/env pwsh
# Script de démarrage du service d'authentification MyHeart

Write-Host "🏥 MyHeart Healthcare - Service d'Authentification" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier Docker
Write-Host "1️⃣  Vérification de Docker..." -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "❌ Docker n'est pas installé!" -ForegroundColor Red
  exit 1
}
Write-Host "✅ Docker trouvé" -ForegroundColor Green

# Démarrer PostgreSQL
Write-Host ""
Write-Host "2️⃣  Démarrage de PostgreSQL..." -ForegroundColor Yellow
docker-compose up -d postgres_auth
Start-Sleep -Seconds 3
Write-Host "✅ PostgreSQL démarré" -ForegroundColor Green

# Vérifier la connexion DB
Write-Host ""
Write-Host "3️⃣  Vérification de la base de données..." -ForegroundColor Yellow
$retries = 0
while ($retries -lt 30) {
  try {
    $result = docker-compose logs postgres_auth | Select-String "ready to accept"
    if ($result) {
      Write-Host "✅ Base de données prête" -ForegroundColor Green
      break
    }
  }
  catch {
    # continue
  }
  $retries++
  Start-Sleep -Seconds 1
}

if ($retries -eq 30) {
  Write-Host "⚠️  Timeout - la base peut ne pas être prête" -ForegroundColor Yellow
}

# Installer les dépendances
Write-Host ""
Write-Host "4️⃣  Installation des dépendances npm..." -ForegroundColor Yellow
cd services/auth-service
npm install --silent
Write-Host "✅ Dépendances installées" -ForegroundColor Green

# Lancer les tests
Write-Host ""
Write-Host "5️⃣  Exécution des tests..." -ForegroundColor Yellow
npm test
$testResult = $LASTEXITCODE

if ($testResult -eq 0) {
  Write-Host "✅ Tous les tests passent!" -ForegroundColor Green
} else {
  Write-Host "❌ Certains tests ont échoué" -ForegroundColor Red
  exit $testResult
}

# Démarrage du service
Write-Host ""
Write-Host "6️⃣  Démarrage du service..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✅ Auth service prêt à recevoir les requêtes!" -ForegroundColor Green
Write-Host "📍 URL: http://localhost:3001" -ForegroundColor Cyan
Write-Host "📚 Documentation: POSTMAN_GUIDE.md" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

npm run dev
