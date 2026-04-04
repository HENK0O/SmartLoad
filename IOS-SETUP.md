# SmartLoad iOS App

## Comment obtenir ton app iOS

### Prérequis
- Un **Mac** avec Xcode installé (obligatoire pour compiler une app iOS)
- Un compte **Apple Developer** ($99/an) pour publier sur l'App Store
- Ton app web déployée (ex: Vercel)

### Étape 1 : Déploie ton app web
```bash
# Pousse sur GitHub et déploie sur Vercel
# Note l'URL de ton app déployée
```

### Étape 2 : Mets à jour l'URL dans capacitor.config.ts
```ts
server: {
  url: 'https://ton-app.vercel.app',  // <-- ton URL ici
  cleartext: true,
}
```

### Étape 3 : Build et sync
```bash
npm run cap:sync
```

### Étape 4 : Ouvre Xcode
```bash
npm run cap:open:ios
```

### Étape 5 : Test sur ton iPhone
1. Dans Xcode, sélectionne ton iPhone comme target
2. Clique **Run** (▶)
3. L'app s'installe sur ton iPhone

### Étape 6 : Publier sur l'App Store
1. Dans Xcode : **Product > Archive**
2. Ouvre **Organizer** → **Distribute App**
3. Suis les étapes pour soumettre à l'App Store Connect

---

## En dev local (sur ton Mac)

```bash
# Terminal 1 : lance le serveur Next.js
npm run dev

# Terminal 2 : sync et ouvre Xcode
npm run cap:sync
npm run cap:open:ios

# Dans Xcode, change l'URL dans capacitor.config.ts vers http://localhost:3000
```

## Structure des icônes

Place ces fichiers dans `public/` :
- `icon-192.png` (192×192) — icône PWA Android
- `icon-512.png` (512×512) — icône PWA
- `icon-1024.png` (1024×1024) — icône App Store

Pour l'icône iOS native, remplace les fichiers dans `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
