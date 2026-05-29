# Prestalia

1. Dans le dossier **Prestalia**, créez les dossiers :

- data
- errors
- cert
- cert-challenges

2. À la racine du dossier **Prestalia**, créez un fichier *.env* avec le contenu suivant :

```env
ADMIN_DEFAULT_PASSWORD=mon_mdp_par_defaut
ARGON2_SECRET=mon_secret_pour_argon2
JWT_SECRET=mon_secret_pour_jwt
```

3. Installer les dépendances :

```bash
npm ci
```

4. Faire la commande suivante dans le dossier **Prestalia** pour build le projet et vérifier qu'il n'y a aucune erreur avant le démarrage :

```bash
npm run predev
```

5. Faire la/les commande(s) suivante dans le dossier **Prestalia** pour lancer le site :

- En production :

Désinstaller les dépendances de développement :

```bash
npm prune --omit=dev
```

Lancer le projet :

```bash
npm run start
```

- En développement :

```bash
npm run dev
```

# Prestalia Desktop

1. Ouvrir un terminal et aller dans le dossier Prestalia_Desktop
2. Installer les dépendances desktop (WinUI) :

```bash
dotnet restore
```

3. Build l'application desktop

```bash
dotnet build
```

4. Lancer l'application desktop

```bash
dotnet run
```

Si la commande ne lance pas l'application ou échoue, démarrez l'application avec Visual Studio (Le mode développeur doit être activé dans les paramètres) 

# Prérequis

- Node.js
- .NET SDK
- Windows 10/11
- OpenSSL

# Todolist

## Prestalia

- Faire le responsive
- Faire une page de profil pour l'utilisateur connecté
- Faire une page d'erreur ou insérer un message d'erreur pour lors :
  * De la création d'un compte
  * De l'inscription d'un compte
  * De la création d'un compte prestataire
- Mettre tous le CSS des fichiers HTML dans des fichiers CSS 