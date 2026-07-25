# Assets

Substitua estes arquivos antes do build de produção. Dimensões esperadas:

| Arquivo | Dimensão | Observação |
|---|---|---|
| `icon.png` | 1024 × 1024 | ícone base (iOS e Android legado) |
| `adaptive-icon.png` | 1024 × 1024 | camada de primeiro plano; fundo `#2F2F2F` vem do `app.json` |
| `splash.png` | 1284 × 2778 | logo centralizado sobre `#2F2F2F` |
| `favicon.png` | 48 × 48 | apenas para `expo start --web` |

Enquanto os arquivos definitivos não existirem, os placeholders gerados aqui permitem
`expo start` e `eas build` sem erro. A identidade é aplicada por código
(`src/theme/colors.js`), não pelos assets.
