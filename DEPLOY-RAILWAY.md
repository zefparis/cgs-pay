# 🚀 DÉPLOIEMENT RAILWAY - Congo Gaming Payout Service

## 🎯 SOLUTION CONCRÈTE POUR RAILWAY

### Étape 1: Préparer le projet pour Railway

1. **Créer le fichier Railway**:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/healthz",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

2. **Modifier package.json pour Railway**:
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "prisma generate && tsc",
    "postinstall": "prisma generate"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Étape 2: Déployer sur Railway

1. **Aller sur railway.app**
2. **Connecter votre repo GitHub**
3. **Ajouter les services**:
   - PostgreSQL Database
   - Redis Database  
   - Web Service (votre app)

### Étape 3: Variables d'environnement Railway

```env
# Railway génère automatiquement DATABASE_URL et REDIS_URL
NODE_ENV=production
PORT=8080

# Secrets
CG_INTERNAL_SECRET=votre-secret-production-fort

# Providers
PROVIDER=THUNES
THUNES_BASE_URL=https://api.thunes.com
THUNES_KEY=votre-clé-thunes
THUNES_SECRET=votre-secret-thunes

# Paramètres financiers
DEFAULT_TAXES_PCT=20
DEFAULT_MARKETING_PCT=20
DEFAULT_INVESTOR_SHARE_PCT=25
DEFAULT_PAYOUT_FEES_PCT=1.2
DEFAULT_MARKET_MULTIPLIER=30

# Mode production
DRY_RUN_MODE=false
```

### Étape 4: Commandes de déploiement

```bash
# 1. Installer Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Créer projet
railway init

# 4. Ajouter PostgreSQL
railway add postgresql

# 5. Ajouter Redis  
railway add redis

# 6. Déployer
railway up
```

## 🔧 FICHIERS À MODIFIER POUR RAILWAY
