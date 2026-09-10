# Revisão Aptos Sync (v1.6.2)

Site revisado: https://aptossync.netlify.app/  
Repositório alvo: https://github.com/mantoky/aptos-sync

> Este agente foi vinculado ao repositório `circuit-mapper` e **não teve permissão de push** em `mantoky/aptos-sync`. As correções estão prontas abaixo para aplicar no repo correto.

## Como aplicar

```bash
git clone https://github.com/mantoky/aptos-sync.git
cd aptos-sync
git apply path/to/aptos-sync-standards-1.6.2.patch
# ou substitua os arquivos de reviews/aptos-sync/files/
git checkout -b cursor/standards-review-3dfa
git add -A && git commit -m "fix: alinhar Aptos Sync aos padrões de a11y, segurança e PWA"
git push -u origin HEAD
```

## Achados (antes → depois)

| Severidade | Problema | Correção |
|---|---|---|
| Alta | `user-scalable=no` em todas as páginas (bloqueia zoom WCAG) | Viewport padrão em todo o pack |
| Alta | Hash de senha fraco (estilo Java `hashCode`) | SHA-256 + migração automática do legado |
| Alta | Redirect SPA `/* → /index.html` em app multi-página | Removido; headers de segurança mantidos |
| Média | Manifest com `purpose: "any maskable"` inválido e `theme_color` desalinhado | Ícones separados + `#DA7756` |
| Média | Labels sem `for`, autocomplete off, contraste baixo | Labels, autocomplete e tokens de cor |
| Média | Board Games Pack em roxo/Inter (fora da marca) | Paleta terracotta Aptos + tipografia Sora |
| Média | Modal A/B interceptava cliques após logout | `dismissOverlays()` no logout |
| Baixa | XSS potencial em changelog/histórico via `innerHTML` | `escapeHtml()` |
| Baixa | Emojis excessivos em CTAs | Texto limpo nos botões secundários |

## Escopo mantido de propósito

- Tema escuro do app principal (identidade já estabelecida).
- BrainHunter Pro permanece com superfície clara própria.
- Contas/histórico continuam 100% locais no dispositivo.

Detalhes em `PADROES.md`.
