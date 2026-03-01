# Documento de Arquitetura do Sistema

## 1. Visão Geral
Este documento define a stack tecnológica, os padrões de comunicação e a infraestrutura do sistema SaaS. Nenhuma decisão arquitetural deve desviar desta base sem aprovação prévia.

## 2. Stack Tecnológica

### 2.1. Backend (Core API)
* **Linguagem:** Kotlin.
* **Framework:** Spring Boot 3.
* **Paradigma:** Orientação a objetos com forte uso de Coroutines para assincronismo e alta concorrência.
* **Arquitetura:** Clean Architecture / Hexagonal (separação clara entre domínio, casos de uso e adaptadores).

### 2.2. Frontend (Web App)
* **Framework:** Next.js (utilizando App Router).
* **Linguagem:** TypeScript.
* **Estilização:** Tailwind CSS.
* **Comunicação de Dados:** Fetch API nativa do Next.js com Server Actions para mutações.

### 2.3. Mensageria e Eventos
* **Broker principal:** Apache Kafka.
* **Padrão:** Event-Driven Architecture (EDA). Os serviços do Spring Boot devem atuar como producers e consumers para garantir desacoplamento (ex: processamento de filas em background).

### 2.4. UI/UX e Design System
* **Abordagem:** Mobile First absoluto. A interface principal deve ser otimizada para uso rápido em smartphones (touch-friendly).
* **Navegação:** Priorizar padrões de navegação mobile, como *Bottom Navigation* (menu na parte inferior) e botões de ação bem dimensionados.
* **Progressive Web App (PWA):** (Futuro) O Next.js deve ser configurado para permitir que os jogadores instalem o sistema como um aplicativo na tela inicial do celular.

### 2.5. Integrações e Automações
* **Orquestração de Fluxos:** n8n.
* **Comunicação Externa:** Integração do n8n com APIs do WhatsApp para disparo de mensagens e automação de atendimento, recebendo webhooks do backend em Spring Boot.

## 3. Padrões de Comunicação
* O Frontend (Next.js) se comunica com o Backend via APIs RESTful em formato JSON.
* O Backend expõe endpoints documentados via Swagger/OpenAPI.
* Processos pesados ou integrações de terceiros (como avisos para o n8n) devem ser enfileirados no Kafka e processados de forma assíncrona.
