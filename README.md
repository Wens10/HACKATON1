1. Dans le dossier **Prestalia**, créez les dossiers data, errors, cert et cert-challenges
2. À la racine du dossier **Prestalia**, créez un fichier `.env` avec le contenu suivant :

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

# Todolist

- Faire le responsive
- Faire une page de profil pour l'utilisateur connecté
- Faire une page d'erreur ou insérer un message d'erreur pour lors :
  * De la création d'un compte
  * De l'inscription d'un compte
  * De la création d'un compte prestataire
- Faire une une page/composant (dans par exemple page admin) pour créer/gérer les catégories
- Mettre tous le CSS des fichiers HTML dans des fichiers CSS 