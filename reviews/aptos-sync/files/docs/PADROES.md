# Padrões — Aptos Sync

Checklist de conformidade aplicado na revisão de [aptossync.netlify.app](https://aptossync.netlify.app/).

## Acessibilidade (WCAG)

| Padrão | Status |
|---|---|
| Zoom permitido (`user-scalable` não desabilitado) | Corrigido |
| Labels associados a inputs (`for`/`id`) | Corrigido |
| `autocomplete` adequado em login/senha | Corrigido |
| Contraste de textos secundários | Melhorado |
| `prefers-reduced-motion` | Adicionado |
| `aria-label` em botões só-ícone | Corrigido |

## Segurança

| Padrão | Status |
|---|---|
| Senha nunca em texto puro no `localStorage` | Já havia hash; reforçado para SHA-256 |
| Migração transparente do hash legado | Adicionado |
| Escape de HTML em listas dinâmicas | Corrigido |
| Headers `X-Frame-Options` / `nosniff` | Mantidos no Netlify |

## PWA

| Padrão | Status |
|---|---|
| `theme_color` alinhado ao meta e à marca | Corrigido |
| `purpose` de ícones válido (`any` / `maskable` separados) | Corrigido |
| App multi-página: sem redirect SPA que mascara 404 | Corrigido |
| Cache offline inclui páginas do pack | Mantido |

## Consistência de marca

| Padrão | Status |
|---|---|
| Tokens CSS (`--accent`, tipografia) no app principal | Adicionado |
| Board Games Pack alinhado à paleta Aptos (sem roxo genérico) | Corrigido |
| Tipografia expressiva (não Inter / system-only) | Melhorado |

## Escopo consciente (mantido)

- Tema escuro do produto principal — identidade estabelecida do Aptos Sync.
- BrainHunter Pro mantém superfície clara própria (mini-app).
- Dados de conta/histórico continuam locais no dispositivo (sem backend de auth).
