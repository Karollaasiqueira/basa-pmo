@AGENTS.md

# Contexto adicional para o Claude

## Sobre o projeto
Este é o dashboard PMO do **Banco da Amazônia (BASA)** para o projeto **Greenfield MVP-1**.
O sistema consome dados em tempo real do Jira via proxy server-side e exibe visões gerenciais do projeto.

## Dor principal do time
Cards ficam parados por dias sem ninguém saber. O dashboard foi construído especialmente para evidenciar:
- Tempo sem movimentação por card
- Data e autor do último comentário
- Cards em revisão sem resposta
- Bugs sem tratamento

## Decisões técnicas importantes
- **Proxy server-side:** O token do Jira nunca vai ao browser — sempre via `app/api/jira/route.ts`
- **Notificações:** Módulo implementado mas desativado na UI — será controlado separadamente
- **Dados mock:** Gestão de Mudanças e Riscos usam dados mock até o Jira ter labels específicas
- **Projeto Jira:** Chave `MDB` · URL base `https://deskcorp.atlassian.net`
- **Responsável técnico:** carol.siqueira@deskcorp.com.br

## O que NÃO fazer
- Não reativar os botões de notificação na UI sem instrução explícita
- Não alterar a chave do projeto de `MDB` sem confirmar
- Não expor o `JIRA_API_TOKEN` no client-side
- Não remover a aba "Em Revisão" — foi solicitada explicitamente
