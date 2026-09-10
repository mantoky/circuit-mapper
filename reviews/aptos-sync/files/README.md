# Aptos Sync
**Cognitive Performance Test** — Teste de Atenção, Reação e Controle de Impulso

## Deploy

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase use aptos-sync
firebase deploy
```

### Netlify
Arraste a pasta do projeto para [app.netlify.com](https://app.netlify.com) ou:
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir .
```

### GitHub
```bash
git init
git remote add origin https://github.com/mantoky/aptos-sync.git
git add .
git commit -m "feat: Aptos Sync v1"
git push -u origin main
```

## Padrões

Checklist de acessibilidade, segurança e PWA em [`docs/PADROES.md`](docs/PADROES.md).

## PWA
Instalável em Android, iOS e Desktop via browser.
- Android: banner automático "Adicionar à tela inicial"
- iOS Safari: Compartilhar → Adicionar à Tela de Início
- Desktop Chrome/Edge: ícone de instalação na barra de endereço

## Estrutura
```
aptos-sync/
├── index.html           # App principal (teste cognitivo)
├── board-games.html     # Hub de jogos de tabuleiro
├── brainhunter.html     # Mini-app cognitivo
├── docs/PADROES.md      # Checklist de conformidade
├── manifest.json        # PWA manifest
├── sw.js                # Service Worker (offline)
├── version.json         # Changelog / update modal
├── icons/               # Ícones PWA (72→512px)
├── firebase.json
├── .firebaserc
└── netlify.toml
```
