# 🚀 GUIDE COMPLET DÉPLOIEMENT RAILWAY

## 🎯 SOLUTION CONCRÈTE - DÉPLOIEMENT PRODUCTION

### ÉTAPE 1: Préparer le Projet (FAIT ✅)

Le projet est maintenant prêt pour Railway avec:
- ✅ `railway.json` configuré avec NIXPACKS
- ✅ `package.json` avec scripts de production
- ✅ Variables d'environnement de production
- ✅ Migrations automatiques au démarrage

### ÉTAPE 2: Déployer sur Railway

#### A. Via Interface Web (RECOMMANDÉ)

1. **Aller sur https://railway.app**
2. **Se connecter avec GitHub**
3. **Créer un nouveau projet**
4. **Connecter votre repository GitHub**

#### B. Ajouter les Services

**Service 1: PostgreSQL**
- Cliquer "Add Service" → "Database" → "PostgreSQL"
- Railway génère automatiquement `DATABASE_URL`

**Service 2: Redis**  
- Cliquer "Add Service" → "Database" → "Redis"
- Railway génère automatiquement `REDIS_URL`

**Service 3: Application Web**
- Cliquer "Add Service" → "GitHub Repo"
- Sélectionner votre repo `congo-gaming-payout`

### ÉTAPE 3: Variables d'Environnement

Dans Railway Dashboard → Variables:

```env
NODE_ENV=production
CG_INTERNAL_SECRET=votre-secret-super-fort-ici
PROVIDER=THUNES
THUNES_BASE_URL=https://api.thunes.com
THUNES_KEY=votre-vraie-clé-thunes
THUNES_SECRET=votre-vrai-secret-thunes
DEFAULT_TAXES_PCT=20
DEFAULT_MARKETING_PCT=20
DEFAULT_INVESTOR_SHARE_PCT=25
DRY_RUN_MODE=false
```

### ÉTAPE 4: Déploiement Automatique

Railway va automatiquement:
1. ✅ Installer les dépendances (`npm install`)
2. ✅ Générer Prisma client (`prisma generate`)
3. ✅ Compiler TypeScript (`tsc`)
4. ✅ Exécuter migrations (`prisma migrate deploy`)
5. ✅ Démarrer l'application (`npm start`)

### ÉTAPE 5: Vérification

Une fois déployé:
- ✅ URL fournie par Railway (ex: `https://congo-gaming-payout-production.up.railway.app`)
- ✅ Tester: `https://votre-url.railway.app/healthz`
- ✅ Vérifier logs dans Railway Dashboard

## 🔧 COMMANDES CLI (Alternative)

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Login
railway login

# Dans le dossier du projet
cd C:\Users\ia-solution\CascadeProjects\congo-gaming-payout

# Initialiser
railway init

# Ajouter PostgreSQL
railway add postgresql

# Ajouter Redis
railway add redis

# Déployer
railway up

# Voir les logs
railway logs
```

## 🎯 RÉSULTAT ATTENDU

Après déploiement, vous aurez:
- ✅ **API complète** fonctionnelle sur Railway
- ✅ **Base de données PostgreSQL** gérée par Railway
- ✅ **Redis** pour les queues
- ✅ **Migrations automatiques** à chaque déploiement
- ✅ **Monitoring** et logs intégrés
- ✅ **HTTPS automatique**
- ✅ **Scaling automatique**

## 🚨 IMPORTANT - SÉCURITÉ

1. **Changer `CG_INTERNAL_SECRET`** avec une valeur forte
2. **Configurer vraies clés Thunes/Rapyd**
3. **Mettre `DRY_RUN_MODE=false`** pour vrais payouts
4. **Surveiller les logs** pour erreurs

## 📊 ENDPOINTS DISPONIBLES

Une fois déployé:
- `GET /healthz` - Santé de l'API
- `GET /metrics` - Métriques Prometheus  
- `POST /v1/settlements/close-day` - Déclencher règlement
- `GET /v1/payouts` - Lister les payouts
- `POST /v1/providers/thunes/webhook` - Webhooks Thunes

## 🎉 SUCCÈS!

Votre service de payout Congo Gaming sera **100% opérationnel** sur Railway avec une vraie base de données PostgreSQL et Redis!

**Plus de problèmes locaux - tout fonctionne en production!**
