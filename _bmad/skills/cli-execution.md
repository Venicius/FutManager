Esta skill permite que o agente execute comandos no terminal local.
Uso permitido:
- Compilar código.
- Instalar dependências (npm, gradle).
- Rodar suítes de testes.
- Subir containers via Docker Compose.
O agente deve sempre analisar a saída do comando (stdout/stderr) para confirmar se a ação foi bem-sucedida ou se requer correção de erros.