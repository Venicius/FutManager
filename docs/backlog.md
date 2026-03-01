# Backlog do Produto - Gerenciador de Futebol Amador

Este documento contém o backlog do projeto, organizado em Épicos e User Stories, derivado do PRD e da Arquitetura. Todas as interfaces descritas focam em **Mobile First**.

---

## Épico 1: Gestão de Grupos e Jogadores
Focado na estruturação inicial da pelada, regras e elenco.

### US 1.1: Criar Grupo/Pelada
**Como** Administrador,
**Quero** criar um grupo de futebol definindo o modelo de cobrança padrão (Mensal Fixo ou Avulso/Por Partida)
**Para** iniciar a gestão da pelada.

* **Critérios de Aceite:**
  * O formulário (mobile) deve conter: Nome do Grupo e Modelo de Cobrança Padrão.
  * O cadastro deve persistir o administrador como dono do grupo.
* **Fluxo Feliz:** Admin acessa "Novo Grupo", preenche os dados, salva e é redirecionado para o painel do grupo criado com sucesso.
* **Fluxo de Exceção:** Admin tenta salvar sem o Nome do grupo; o sistema exibe erro na interface touch-friendly indicando o campo obrigatório.

### US 1.2: Cadastrar Jogador no Elenco
**Como** Administrador,
**Quero** adicionar um jogador informando nome, WhatsApp, status (Ativo) e vínculo (Mensalista ou Convidado/Diarista)
**Para** compor o elenco do grupo.

* **Critérios de Aceite:**
  * Componentes otimizados para touch (ex: dropdown grande para vínculo).
  * O WhatsApp deve ser validado quanto ao formato básico (apenas números, DDD incluído).
* **Fluxo Feliz:** Admin preenche nome "João Elias", WhatsApp "11999999999", escolhe "Mensalista" e salva. Jogador aparece na lista do elenco.
* **Fluxo de Exceção:** Admin digita WhatsApp inválido (ex: com letras); componente de input emite alerta vermelho validando a máscara.

### US 1.3: Inativar Jogador (Soft Delete)
**Como** Administrador,
**Quero** inativar um jogador em vez de excluí-lo fisicamente
**Para** preservar o histórico financeiro e de partidas da pelada.

* **Critérios de Aceite:**
  * Regra de Negócio Crítica: Jogador com histórico financeiro NUNCA é excluído.
  * Na lista de jogadores, o botão de ação deve sugerir "Inativar".
* **Fluxo Feliz:** Admin clica em "Inativar" num jogador do elenco; o status muda para "Inativo" e ele não é mais listado em novas partidas.
* **Fluxo de Exceção:** N/A (A ação é sempre de inativação visual/lógica).

### US 1.4: Gestão de Isenções (Goleiros e Árbitros) [FUTURO]
**Como** Administrador,
**Quero** configurar uma flag de "Isento" no perfil de um jogador (ex: Goleiro fixo) ou aplicar uma isenção pontual em uma partida específica (ex: jogador de linha que apitou naquele dia)
**Para** que o sistema não gere cobranças (mensais ou avulsas) para ele, mantendo-o ativo no elenco e nas listas de presença.

* **Critérios de Aceite (Planejados):**
  * O cadastro de jogador deve ter um toggle (chave) "Isento de Cobrança Padrão".
  * Na lista de presença da partida (US 2.3), deve haver uma opção rápida para "Isentar nesta partida" (útil para quem quebrou um galho apitando).
  * O motor de processamento em lote (US 2.1) deve ignorar jogadores com a flag de isenção ativa.

---

## Épico 2: Controle Financeiro de Entradas
Gestão híbrida de cobranças e pendências focada na interface de caixa.

### US 2.1: Processamento em Lote de Mensalidades
**Como** Sistema (Firebase),
**Quero** gerar cobranças automaticamente na virada do mês para jogadores "Mensalistas" ativos
**Para** poupar o trabalho do Administrador.

* **Critérios de Aceite:**
  * Deve utilizar uma **Cloud Function (Cron Job/Scheduled)** configurada para rodar no dia 1º de cada mês.
  * Só gera cobrança no Firestore para vínculos = "Mensalista" e status = "Ativo". 
* **Fluxo Feliz:** No dia 01, a Cloud Function roda, identifica 15 mensalistas e cria 15 novos documentos na coleção `cobrancas`.
* **Fluxo de Exceção:** Falha na execução da função; o Firebase relata o erro no Cloud Logging e o admin pode acionar um botão no painel para forçar a geração manual.

### US 2.2: Criar Partida / Evento Avulso
**Como** Administrador,
**Quero** registrar uma partida (ex: "Jogo de Sábado 15/05")
**Para** gerenciar a lista de presença e faturamentos isolados.

* **Critérios de Aceite:**
  * Criação simples via botão flutuante (FAB) no Mobile contendo apenas Data e Título.
* **Fluxo Feliz:** Admin cria a partida "Futebol Sábado". A partida é criada vazia, pronta para receber a lista de presença.
* **Fluxo de Exceção:** Admin tenta criar uma partida numa data no passado (opcionalmente bloqueado por UX, ou com alerta de confirmação de "lançamento retroativo").

### US 2.3: Adicionar Presença e Gerar Cobrança de Partida
**Como** Administrador,
**Quero** marcar a presença de um jogador (Mensalista ou Convidado) na Partida
**Para** que, caso seja Convidado ou esteja fora do seu plano, gere a cobrança avulsa.

* **Critérios de Aceite:**
  * Ao confirmar presença de um "Convidado/Diarista", o sistema gera instantaneamente uma cobrança pendente vinculada àquela Partida.
  * Mensalistas marcados na lista normalmente não geram cobrança extra (já pagam mês), a menos que o grupo seja estritamente "Avulso".
* **Fluxo Feliz:** Admin marca check na lista de presença do Convidado "Carlos". Uma cobrança de valor unitário da partida é gerada no perfil de Carlos.
* **Fluxo de Exceção:** Tentativa de adicionar o mesmo jogador duas vezes; erro tratado no endpoint REST evitando cobrança duplicada.

### US 2.4: Registrar Pagamento Manual (Pix/Dinheiro)
**Como** Administrador,
**Quero** marcar uma cobrança como "Paga", especificando a forma (PIX/Dinheiro)
**Para** manter as finanças da pelada atualizadas.

* **Critérios de Aceite:**
  * Botão de ação rápida (Swipe to pay ou modal) otimizado para mobile.
  * A mutação de dados deve ocorrer via **Next.js Server Actions** para garantir segurança antes de atualizar o Firestore.
* **Fluxo Feliz:** Admin vê a cobrança do "João", toca em "Registrar Pagto -> PIX". A Server Action atualiza o documento e revalida a tela (`revalidatePath`).

### US 2.5: Dashboard de Pendências (Mural Mobile)
**Como** Administrador,
**Quero** visualizar uma lista/resumo de quem está Pago, Pendente e Em Atraso
**Para** cobrar os inadimplentes no dia da pelada.

* **Critérios de Aceite:**
  * Filtros em abas (Tabs) otimizados para touch: Todos, Pagos, Atrasados.
  * Uso de componentes Tailwind CSS com cores semânticas (Verde, Cinza/Amarelo, Vermelho).
* **Fluxo Feliz:** Admin acessa o Dashboard, seleciona aba "Em Atraso" e o frontend consome a API REST devolvendo a lista em menos de 1 segundo.
* **Fluxo de Exceção:** API de listagem sobrecarregada; frontend exibe esqueleto de loading (Skeleton) e mensagem de falha elegante (Toast).

---

## Épico 3: Gestão de Despesas e Fluxo de Caixa Global
Relatórios contínuos da "Caixinha".

### US 3.1: Lançamento de Despesas
**Como** Administrador,
**Quero** registrar saídas de dinheiro categorizadas (Arbitragem, Aluguel, Bolas)
**Para** justificar os gastos do caixa do grupo.

* **Critérios de Aceite:**
  * Campo numérico otimizado para teclado de celular, categoria e data.
* **Fluxo Feliz:** Admin lança R$ 100 de "Arbitragem". Uma **Server Action** processa a transação no Firestore, adicionando o documento de despesa e atualizando o saldo geral de forma atômica.

### US 3.2: Visualização do Saldo Contínuo (Caixinha)
**Como** Administrador,
**Quero** ver o "Montante Final" disponível do grupo
**Para** saber se a pelada está com saldo positivo ou negativo.

* **Critérios de Aceite:**
  * Somatória contínua carregada na home mobile (Entradas das cobranças "Pagas" - "Despesas").
  * Saldo transita automaticamente entre os meses (não zera virando o calendário).
* **Fluxo Feliz:** Admin abre a tela inicial do grupo e um card proeminente mostra "Saldo Atual: R$ 450,00".
* **Fluxo de Exceção:** N/A, leitura de valor consolidado via endpoint otimizado.

---

## Épico 4: Automações e Notificações (Assíncrono)
Integração com ecossistema externo definidos na arquitetura.

### US 4.1: Gatilho de Cobrança no WhatsApp via n8n
**Como** Sistema (Firebase),
**Quero** emitir um evento identificando mensalidades "Em Atraso"
**Para** que o n8n ouça este webhook e dispare mensagens automatizadas.

* **Critérios de Aceite:**
  * Uma **Cloud Function (Firestore Trigger `onUpdate`)** deve observar mudanças no status da cobrança.
  * Se o status mudar para "Em Atraso" (ou via job diário de verificação), a função faz um HTTP POST simples para a URL do webhook do n8n.
* **Fluxo Feliz:** O status da fatura vence. A Cloud Function envia o JSON para o n8n. O n8n dispara a mensagem de WhatsApp.

## Épico 5: Configurações e Segurança
O módulo responsável por gerir quem tem acesso à plataforma e quais as regras globais do grupo.

### US 5.1: Gestão de Acessos (Co-gestores) [FUTURO]
**Como** Administrador Principal,
**Quero** poder convidar outros utilizadores (através do e-mail) para serem "Co-gestores" do meu grupo
**Para** que eles possam lançar despesas no caixa, registar presenças e dar baixa em pagamentos quando eu não estiver presente.

* **Critérios de Aceite (Planeados):**
  * O sistema deve ter um ecrã de "Configurações > Acessos".
  * Deve ser possível adicionar e remover e-mails com a *role* de 'admin' ou 'editor'.
  * As regras de segurança do Firebase (Firestore Rules) devem validar se o `request.auth.token.email` do utilizador logado está na lista de gestores permitidos antes de permitir qualquer escrita no Caixa ou Cobranças.

  ### US 1.5: Lista de Espera [FUTURO]
**Como** Administrador, **Quero** cadastrar interessados em uma "Lista de Espera" **Para** que eu possa facilmente promovê-los a "Mensalistas" quando abrir uma vaga no elenco fixo.

### US 1.6: Edição de Jogadores (CRUD Completo)
**Como** Administrador, **Quero** editar os dados de um jogador (Nome, WhatsApp, Vínculo) **Para** corrigir erros de digitação e atualizar o status (ex: Diarista que virou Mensalista) sem perder o histórico.

### US 2.6: Edição de Partidas
**Como** Administrador, **Quero** editar os dados de uma partida (Título, Data) ou excluí-la **Para** corrigir lançamentos indevidos.

### US 3.3: Relatórios e Exportação (Excel/Impressão) [FUTURO]
**Como** Administrador, **Quero** gerar um relatório visual do Caixa e ter um botão para exportar para CSV/Excel ou Imprimir **Para** prestar contas de forma transparente no grupo de WhatsApp da pelada.

### US 5.2: Segurança e Autenticação (Login)
**Como** Administrador, **Quero** que o sistema exija login (E-mail/Senha ou Google) **Para** proteger os dados financeiros e o cadastro dos jogadores contra acessos não autorizados.

### US 2.7: Geração Flexível de Mensalidades
**Como** Administrador, **Quero** informar o valor manualmente no momento de gerar as mensalidades (em vez de ser um valor fixo no código) e poder rodar essa rotina mais de uma vez no mês **Para** lidar com meses de custos variáveis e gerar cobranças extras, isentando automaticamente quem já possui crédito suficiente ou já quitou a cota daquele mês.

### US 2.8: Sistema de Conta Corrente (Crédito e Pagamento Parcial)
**Como** Administrador, **Quero** poder informar o valor exato que o jogador pagou ao baixar uma cobrança **Para** que o sistema calcule se houve pagamento a maior (gerando um Saldo Credor para o próximo mês) ou a menor (deixando um resto a pagar).