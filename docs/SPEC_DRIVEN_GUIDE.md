# 📘 Guia de Engenharia: Spec-Driven Development & Superpowers

Este documento documenta os fundamentos metodológicos, arquiteturais e ferramental de IA utilizados no desenvolvimento do projeto **Minha Farmácia** (Prefeitura Municipal de Indaiatuba / Hackathon Fatec 2026).

---

## 1. O que é Spec-Driven Development (SDD)?

O **Spec-Driven Development (SDD)** é uma metodologia de engenharia de software onde **nenhuma linha de código de produção é escrita antes que o domínio, as interfaces, as regras de negócio e os critérios de aceitação estejam rigorosamente especificados e validados**.

### 1.1 Diferença entre o Desenvolvimento Tradicional e SDD com IA

| Abordagem Tradicional / "Vibe Coding" | Spec-Driven Development (SDD) com Superpowers |
|---|---|
| O desenvolvedor pede para a IA gerar o app inteiro de uma vez | O arquiteto e a IA estruturam primeiro os modelos formais e regras em `.spec/` |
| Alucinações frequentes de arquitetura e inconsistência de dados | Código gerado estritamente aderente às especificações pré-aprovadas |
| Componentes monolíticos e difíceis de testar | Componentes desacoplados, testáveis e modulares (TDD) |
| Retrabalho massivo ao descobrir regras de negócio faltantes | Regras de negócio complexas (ex: Order Splitting 1:N) resolvidas antes do código |

### 1.2 O Ciclo TDD e Tarefas Incrementais
No SDD com o framework Superpowers, o desenvolvimento segue um fluxo rigoroso:
1. **Especificação (Spec-First):** Formalização em `.spec/`.
2. **Backlog Atômico (`tasks.md`):** Decomposição em tarefas incrementais com critérios de aceitação claros.
3. **Red-Green-Refactor (TDD):** Implementação de testes unitários que validam a lógica pura antes ou junto à integração visual.
4. **Validação e Confirmação:** Cada etapa é concluída, verificada com evidências e validada antes de avançar para a próxima.

---

## 2. Créditos e Framework Open-Source

Este projeto adota os padrões e boas práticas do framework:

> 🌟 **[Superpowers](https://github.com/obra/superpowers)** por Jesse Vincent ([@obra](https://github.com/obra)).  
> Um framework open-source de habilidades para agentes e assistentes de inteligência artificial focados em desenvolvimento de software disciplinado, testes rigorosos, planejamento sistemático e colaboração par-a-par.

---

## 3. Ambiente, Ferramentas & Antigravity CLI (`agy`)

Para habilitar as capacidades de raciocínio orientado a especificações e desenvolvimento disciplinado, o ambiente do agente de IA utiliza o **Antigravity CLI (`agy`)** da Google DeepMind integrado com os plugins do Superpowers.

### 3.1 Instalação e Configuração de Plugins
O plugin do Superpowers é instalado diretamente no ambiente Antigravity através do comando:

```bash
# Instalação do plugin Superpowers no ecossistema Antigravity CLI
agy plugin install https://github.com/obra/superpowers
```

Com este plugin carregado, o agente opera sob diretrizes rigorosas:
- **`using-superpowers`:** Garantia de ativação das habilidades antes de qualquer intervenção no código.
- **`writing-plans` / `executing-plans`:** Planejamento arquitetural prévio com tarefas atômicas rastreáveis.
- **`test-driven-development`:** Desenvolvimento guiado por testes com garantia de cobertura e previsibilidade.
- **`verification-before-completion`:** Validação factual de comandos e testes antes de declarar tarefas concluídas.

---

## 4. Estrutura de Especificações do Projeto (`.spec/`)

As especificações do projeto **Minha Farmácia** estão organizadas de forma modular no diretório `.spec/`:

```
minha_farmacia/.spec/
├── 01_architecture_and_design.md   # Identidade Visual, Padrão "Minha Indaiatuba" e WCAG AA
├── 02_data_models_and_split.md     # Modelagem de Entidades, 1:N Order Splitting e PINs
├── 03_modules_specification.md     # Especificação funcional dos 3 módulos desacoplados
└── 04_leaflet_and_crud.md          # Mapa Leaflet.js (invalidateSize) e CRUD de Medicamentos
```

### 4.1 Resumo de cada arquivo:
- **`01_architecture_and_design.md`:** Define os tokens visuais de Indaiatuba (fundo `#f8fafc`, `rounded-3xl`, sombras suaves, verde e azul municipais), diretrizes de acessibilidade WCAG 2.1 AA (mínimo de 48px de área de toque, alto contraste, tags ARIA) e a arquitetura em camadas desacoplada.
- **`02_data_models_and_split.md`:** Especifica os tipos formais TypeScript do domínio (`Order`, `SubOrder`, `Citizen`, `Medication`, `Courier`) e o algoritmo formal do motor `splitEngine` (gerando remessas com PINs independentes em caso de estoque parcial).
- **`03_modules_specification.md`:** Detalha os requisitos e comportamentos dos três módulos principais:
  - **`/cidadao`:** Login Gov.br / Cidadão ID, upload de receitas, timeline limpa e exibição clara de PINs.
  - **`/farmacia`:** Triagem farmacêutica, desmembramento assistido e dashboard de indicadores.
  - **`/entregador`:** Fila de corridas, atalho WhatsApp oficial e baixa segura por validação de PIN.
- **`04_leaflet_and_crud.md`:** Resolve o problema de ciclo de vida do Leaflet em abas ocultas usando `invalidateSize()` nas coordenadas reais de Indaiatuba e especifica o CRUD completo de catálogo com reabastecimento reativo de pedidos.
