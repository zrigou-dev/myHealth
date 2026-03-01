# Guide d'authentification pour Postman

## Configuration

1. **Démarrer la base de données PostgreSQL**

   ```powershell
   docker-compose up -d postgres_auth
   docker-compose logs postgres_auth
   # Attendez que le statut soit "accepting connections"
   ```

2. **Démarrer le service d'authentification**

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
   ```

3. **Ouvrir Postman et tester les endpoints**

---

## Tests Postman

### 1️⃣ **REGISTER - Créer un nouvel utilisateur**

```
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "patient"
}
```

**Réponse attendue (201):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "patient",
    "phone": null,
    "created_at": "2026-02-26T20:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8",
  "refreshTokenExpires": "2026-03-05T20:00:00.000Z"
}
```

---

### 2️⃣ **LOGIN - Se connecter**

```
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123"
}
```

**Réponse attendue (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "patient",
    "phone": null,
    "is_active": true,
    "last_login": "2026-02-26T20:01:00.000Z",
    "created_at": "2026-02-26T20:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8",
  "refreshTokenExpires": "2026-03-05T20:01:00.000Z"
}
```

---

### 3️⃣ **GET USER - Récupérer le profil**

```
GET http://localhost:3001/api/auth/me
Authorization: Bearer {accessToken}
```

**Copier le `accessToken` de la réponse de login/register et le coller ici.**

---

### 4️⃣ **REFRESH TOKEN - Générer un nouveau token**

```
POST http://localhost:3001/api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8"
}
```

---

### 5️⃣ **LOGOUT - Se déconnecter**

```
POST http://localhost:3001/api/auth/logout
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8"
}
```

---

## ✅ Validation des passwords

Le mot de passe doit:

- ✅ Faire **au moins 8 caractères**
- ✅ Contenir **au moins 1 lettre** (a-z, A-Z)
- ✅ Contenir **au moins 1 chiffre** (0-9)

**Exemples valides:**

- `Password123`
- `MyPass1`
- `SecureP@ss1`

**Exemples invalides:**

- `pass123` ❌ (commence par minuscule OK, mais 7 chars)
- `Password` ❌ (pas de chiffre)
- `12345678` ❌ (pas de lettre)

---

## 🐛 Si vous avez des erreurs

**400 Bad Request:**

- Vérifiez les champs requis
- Validez le format email
- Vérifiez le format du password (lettre + chiffre, min 8 chars)

**401 Unauthorized:**

- Email/password incorrect
- Token expiré ou invalide

**409 Conflict:**

- L'email existe déjà dans la base

**500 Internal Server Error:**

- Vérifiez que PostgreSQL est running: `docker ps`
- Vérifiez les logs: `npm run dev`

---

## 🔑 Variables d'environnement (.env)

Les paramètres sont configurés dans `.env`:

- **DB_HOST**: `postgres_auth` (Docker) ou `localhost` (local)
- **JWT_SECRET**: Clé secrète pour signer les tokens
- **BCRYPT_ROUNDS**: Nombre de rounds pour hasher les passwords (10 = bon équilibre)
