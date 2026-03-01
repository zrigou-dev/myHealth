# 🏥 Service d'Authentification - MyHeart Healthcare

## 📋 Structure du projet

```
services/auth-service/
├── src/
│   ├── app.js                      # Configuration Express
│   ├── server.js                   # Point d'entrée
│   ├── config/
│   │   └── database.js             # Pool PostgreSQL
│   ├── controllers/
│   │   └── authController.js       # Logique des endpoints
│   ├── models/
│   │   └── user.js                 # Modèle utilisateur (SQL)
│   ├── middleware/
│   │   └── authMiddleware.js       # Vérification JWT
│   ├── routes/
│   │   └── authRoutes.js           # Définition des routes
│   ├── utils/
│   │   └── jwtUtils.js             # Génération/vérification JWT
│   └── validators/
│       └── authValidators.js       # Validation des entrées
├── __tests__/
│   ├── setup.js                    # Configuration Jest
│   ├── app.test.js                 # Tests d'intégration
│   ├── authController.test.js      # Tests contrôleurs
│   ├── authMiddleware.test.js      # Tests middleware
│   ├── authValidators.test.js      # Tests validations
│   ├── jwtUtils.test.js            # Tests JWT
│   └── userModel.test.js           # Tests modèle
├── .env                            # Variables d'environnement ✅ CRÉÉ
├── .env.example                    # Exemple de configuration
├── jest.config.js                  # Configuration Jest ✅ CRÉÉ
├── package.json                    # Dépendances
└── Dockerfile                      # Image Docker
```

---

## 🚀 Démarrage rapide

### 1️⃣ **Démarrer PostgreSQL**

```powershell
# Depuis la racine du projet
docker-compose up -d postgres_auth
docker-compose logs postgres_auth

# Attendez: "database system is ready to accept connections"
```

### 2️⃣ **Démarrer le service d'authentification**

```powershell
cd services/auth-service
npm install
npm run dev
```

Vous devriez voir :

```
✅ Auth service running on port 3001
📝 Environment: development
Connected to PostgreSQL database
Database tables initialized
```

---

## 🧪 Tests

```powershell
cd services/auth-service
npm test

# Résultat attendu:
# ✅ Test Suites: 6 passed, 6 total
# ✅ Tests: 36 passed, 36 total
```

---

## 📮 Test dans Postman

**Voir le fichier `POSTMAN_GUIDE.md` pour les exemples complets**

### Exemple rapide - Registration

```
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Réponse (201)

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "patient",
    "created_at": "2026-02-26T20:00:00.000Z"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "abc123...",
  "refreshTokenExpires": "2026-03-05T20:00:00.000Z"
}
```

---

## 🔒 Validation des passwords

✅ **VALIDES:**

- `Password123`
- `MyAuth2024`
- `SecureP@ss1`

❌ **INVALIDES:**

- `pass123` (trop court, < 8)
- `password` (pas de chiffre)
- `12345678` (pas de lettre)

---

## 🔑 Configuration (.env)

| Variable         | Valeur          | Description                      |
| ---------------- | --------------- | -------------------------------- |
| `PORT`           | 3001            | Port du service                  |
| `NODE_ENV`       | development     | Mode développement               |
| `DB_HOST`        | postgres_auth   | Hôte PostgreSQL (Docker)         |
| `DB_PORT`        | 5432            | Port PostgreSQL                  |
| `DB_NAME`        | myheart_auth    | Nom de la base                   |
| `DB_USER`        | postgres        | Utilisateur DB                   |
| `DB_PASSWORD`    | postgres        | Mot de passe DB                  |
| `JWT_SECRET`     | super secret... | Clé secrète JWT                  |
| `JWT_EXPIRES_IN` | 24h             | Durée du token                   |
| `BCRYPT_ROUNDS`  | 10              | Force du hash (10=bon équilibre) |
| `CORS_ORIGIN`    | \*              | Origines CORS autorisées         |

---

## 📡 Endpoints disponibles

| Endpoint                  | Méthode | Authentification | Description        |
| ------------------------- | ------- | ---------------- | ------------------ |
| `/api/auth/register`      | POST    | ❌ Non           | Créer un compte    |
| `/api/auth/login`         | POST    | ❌ Non           | Se connecter       |
| `/api/auth/refresh-token` | POST    | ❌ Non           | Renouveler le JWT  |
| `/api/auth/logout`        | POST    | ❌ Non           | Se déconnecter     |
| `/api/auth/me`            | GET     | ✅ JWT           | Profil utilisateur |
| `/health`                 | GET     | ❌ Non           | État du service    |

---

## 🐛 Troubleshooting

### ❌ "Cannot find module"

```powershell
# Solution:
npm install
```

### ❌ "Connection refused" (PostgreSQL)

```powershell
# Vérifier que le conteneur tourne:
docker ps
# Si absent, démarrez:
docker-compose up -d postgres_auth
```

### ❌ "Bad Request" avec Postman

- Vérifiez le JSON (virgules, guillemets)
- Validez le format email
- Vérifiez le password (min 8, lettre + chiffre)

### ❌ "Invalid token" en GET /me

- Copier-collez le `accessToken` complet
- Format du header: `Authorization: Bearer {token}`
- Vérifiez que le token n'est pas expiré

---

## ✅ Status du projet

| Aspect        | Status           |
| ------------- | ---------------- |
| Tests         | ✅ 36/36 passing |
| Linting       | ✅ Aucune erreur |
| Database      | ✅ Fonctionnel   |
| JWT Auth      | ✅ Fonctionnel   |
| Password Hash | ✅ Fonctionnel   |
| Validation    | ✅ Améliorée     |
| Documentation | ✅ Complète      |

---

## 📚 Architecture

```
Client (Postman)
    ↓ HTTP Request
Express App (app.js)
    ↓
Routes (authRoutes.js)
    ↓
Validation (authValidators.js)
    ↓
Controller (authController.js)
    ↓
Model (user.js)
    ↓
PostgreSQL Database
```

---

## 🚀 Prochaines étapes

1. ✅ Tests unitaires - FAIT
2. ✅ Service fonctionnel - FAIT
3. ✅ Configuration .env - FAIT
4. ⏭️ Intégrer avec d'autres services
5. ⏭️ Ajouter logs structurés (Winston)
6. ⏭️ Tests de charge (k6)
7. ⏭️ CI/CD pipeline (GitHub Actions)

---

**Date de création**: 26 février 2026  
**Dernière mise à jour**: 26 février 2026
