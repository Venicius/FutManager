# Product Requirements Document (PRD) - Gerenciador de Futebol Amador (Pelada Semanal)

## 1. Visão Geral do Produto
O objetivo deste sistema é automatizar a gestão financeira e administrativa de grupos de futebol amador. O foco é adaptar-se a diferentes frequências de jogo (fixo mensal, semanal ou esporádico), eliminando a inadimplência, dando transparência ao fluxo de caixa ("caixinha") e facilitando o pagamento de despesas e eventos.

## 2. Atores do Sistema
* **Administrador (Organizador):** Cria o grupo, define as regras de cobrança, cadastra jogadores, lança despesas e registra pagamentos.
* **Jogador (Membro):** (Futuro) Acessa o mural de transparência e visualiza suas próprias pendências financeiras.

## 3. Escopo do MVP (Funcionalidades Principais)

### 3.1. Gestão de Grupos e Elenco
* O sistema deve permitir a criação de um **Grupo/Pelada**, onde o Administrador define o **Modelo de Cobrança Padrão** (Mensal Fixo ou Avulso/Por Partida).
* Dentro do grupo, cadastra-se os **Jogadores** (nome, WhatsApp, status) e o seu **Vínculo** (Mensalista ou Convidado/Diarista).

### 3.2. Controle Financeiro Híbrido (Mensal e Avulso)
* **Cobrança Mensal:** Para grupos ou jogadores fixos, o sistema gera automaticamente a cobrança no início do mês.
* **Cobrança por Partida (Lista de Presença):** Para grupos esporádicos ou jogadores convidados, o Administrador pode criar um **Evento/Partida** (ex: "Jogo de Sábado 15/05") e gerar cobranças individuais apenas para quem confirmou presença ou jogou.
* O Administrador registra pagamentos (PIX, Dinheiro) vinculando-os a uma Mensalidade ou a uma Partida específica.
* O painel deve exibir claramente as pendências (Status: Pago, Pendente, Em Atraso).

### 3.3. Fluxo de Caixa Global
* O Administrador lança **Despesas** categorizadas (Arbitragem, Bolas, Aluguel de Quadra/Campo, Confraternização).
* O sistema calcula o **Saldo em Caixa (Montante Final)**, somando todas as entradas (mensalidades + avulsos) e subtraindo as despesas.
* O saldo é contínuo e transferido de um mês para o outro.

## 4. Regras de Negócio Críticas
* Um jogador "Convidado/Diarista" não gera cobrança automática na virada do mês, apenas quando adicionado a uma Partida.
* Um jogador com histórico financeiro não pode ser excluído, apenas inativado.

## 5. Requisitos Não Funcionais (Arquitetura e Integração)
* **Assincronismo (Kafka e/ou spring batch):** A virada do mês deve disparar eventos em lote para gerar as mensalidades dos jogadores fixos ativos.
* **Automação (n8n + WhatsApp):** Pendências em atraso (seja de mensalidade ou de jogo avulso) emitem eventos no backend (Spring Boot) capturados pelo n8n e/ou outro sistema em lote para processamento e disparo de lembretes via WhatsApp.