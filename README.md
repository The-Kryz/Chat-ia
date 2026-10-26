# Chat de IA com a API da Groq

Chat web que consome um modelo de linguagem pela API da Groq (modelo configurado na constante `MODEL` de `index.js`: `openai/gpt-oss-120b`).
Atividade da Aula 4 — TEC13 Engenharia de IA Aplicada, IFBA Campus Irecê.

Responsável: Paulo Everton Nunes Novais

## Tecnologias

Node.js, Express 5, groq-sdk, dotenv, HTML/CSS/JS puro, marked e DOMPurify (os dois últimos carregados por CDN no `index.html`).

## Estrutura do projeto

```
chat-ia/
├── index.js          # servidor Express, rota /api/chat, chamada à Groq
├── package.json
├── .env.example      # modelo do .env (sem chave)
├── .gitignore        # ignora .env e node_modules/
└── public/
    ├── index.html
    ├── css/index.css
    └── js/main.js    # interface: envio, "Pensando...", sessionId, DOMPurify
```

## Como rodar

1. Clone o repositório e instale as dependências:
   ```
   npm install
   ```
2. Copie `.env.example` para `.env` e preencha sua chave da Groq
   (gerada em console.groq.com):
   ```
   PORT=3000
   GROQ_API_KEY=sua_chave_da_groq
   ```
3. Suba o servidor:
   ```
   npm start
   ```
4. Acesse http://localhost:3000

Se o antivírus interceptar conexões HTTPS e o Node recusar o certificado ao chamar a API, rode antes (PowerShell) `$env:NODE_OPTIONS="--use-system-ca"` e depois `npm start`. Veja a pergunta 2 do relatório.

## Segurança da chave

- O `.env` está no `.gitignore` e nunca vai para o repositório; só o `.env.example`, sem chave, é versionado.
- Verificações feitas antes do push:
  - `git check-ignore .env` deve imprimir `.env`.
  - `git grep` pelo prefixo das chaves da Groq não deve retornar nada.
  - `git log -S` com esse mesmo prefixo, em `--all`, não deve retornar commits.

## Desafios implementados

- **Desafio 1 — Memória de conversa:** o servidor guarda o histórico de cada conversa e o reenvia à Groq a cada chamada, porque a API é stateless. O histórico é limitado a 10 trocas (20 mensagens). Código: `index.js`, função `getHistorico` e o `while (historico.length > MAX_TROCAS * 2)` na rota `/api/chat`. Teste: dizer "meu nome é X" e depois perguntar "qual é o meu nome?".
- **Desafio 2 — Indicador de carregamento:** `public/js/main.js`, dentro de `sendMessage()`. Aparece a bolha "Pensando...", o botão fica desabilitado e é liberado no `finally`, com ou sem erro.
- **Desafio 3 — Assistente especializado:** `SYSTEM_PROMPT` em `index.js`. Virou um monitor de Algoritmos e Estruturas de Dados.
- **Desafio 6 — Erros específicos:** `index.js`, objeto `MENSAGENS_ERRO` e o `catch` da rota. Tratamento de 401, 429, 400 e 413, com mensagem útil para cada caso; qualquer outro código recebe uma mensagem genérica. Teste feito: a chave foi apagada do `.env` e o servidor foi reiniciado. Antes de reiniciar, a pergunta ainda funcionou, porque a chave antiga continuava carregada na memória do processo. Depois de reiniciar e perguntar de novo, apareceu a mensagem do 401: "Chave de API inválida. Verifique o arquivo .env e reinicie o servidor."
- **Desafio 8 — Sessões isoladas:** o navegador gera um `sessionId` (`crypto.randomUUID()` + `sessionStorage`) e o envia no corpo da requisição; o servidor guarda um `Map` com um histórico por sessão, com limite de 500 sessões (a mais antiga é removida). Prova: duas abas mantêm conversas independentes.
- **Desafio 9 — Proteção contra XSS:** o `innerHTML = marked.parse(...)` insere HTML gerado a partir de texto externo. Agora é `DOMPurify.sanitize(marked.parse(...))`. O risco concreto: se o modelo (ou um texto colado pelo usuário) produzisse algo como `<img src=x onerror="...">`, o navegador executaria o script no contexto da página, podendo ler dados da sessão ou redirecionar o usuário. O DOMPurify remove esses atributos e tags antes da inserção.

## Arquitetura

A chamada à Groq acontece no servidor Express, e não no navegador, porque a chave de API precisa ficar em um lugar que o usuário não consegue ler. Tudo que o navegador baixa (HTML e `main.js`) é visível pelo F12; se a chamada fosse feita ali, a chave iria junto. O front-end só conversa com `/api/chat`, no mesmo domínio, sem chave nenhuma. O servidor lê a chave do `.env` (que está no `.gitignore`), chama a Groq e devolve apenas o texto da resposta.

Fluxo de uma mensagem: o navegador envia `{ message, sessionId }` por `fetch` para `/api/chat`; o servidor valida os dois campos, recupera o histórico da sessão, envia o `SYSTEM_PROMPT` mais o histórico à Groq e responde `{ response }`. Em caso de erro, devolve `{ error }` com o status correspondente.

## Relatório

### 1. Por que a chamada à Groq tem de acontecer no servidor?

Se a chamada fosse feita direto do `main.js`, a chave da API estaria dentro de um arquivo que qualquer visitante baixa. Bastaria abrir o F12 (aba Network ou Sources) para copiá-la. Com a chave, uma pessoa mal-intencionada poderia fazer chamadas à Groq em nome da nossa conta, esgotar o limite gratuito (causando erro 429 para todos), usar o modelo para qualquer fim sem passar pelo nosso system prompt e, em um provedor pago, gerar custos na conta do dono da chave. Além disso, bots varrem repositórios e sites em busca de chaves, então o abuso começaria em minutos. No servidor, a chave nunca sai do `.env`.

### 2. Qual foi o erro que mais tempo levou para resolver?

O problema foi o antivírus. Como ele inspeciona conexões HTTPS, o Node não confiava no certificado que o antivírus apresenta, e a chamada do servidor à API da Groq era bloqueada, mesmo com a chave correta. A solução foi definir, antes de subir o servidor, a variável `NODE_OPTIONS` com `--use-system-ca` (`$env:NODE_OPTIONS="--use-system-ca"` no PowerShell), que faz o Node usar os certificados instalados no Windows, incluindo o do antivírus. O erro foi diferente dos erros da aplicação, porque não vinha do código nem da chave, e sim do ambiente da máquina.

### 3. O que acontece quando mudam o system prompt?

O system prompt define o papel e os limites do modelo, e é enviado em toda chamada antes do histórico. Com o prompt original (`Não responda nada fora do contexto de ciência da computação e programação.`), o modelo apenas se restringe ao tema. Com um prompt sem restrição (por exemplo, `Você é um assistente útil.`), ele responde qualquer assunto. Com o prompt novo do monitor, além de restringir o tema, o estilo muda: respostas em português, didáticas, com exemplo em código e complexidade.

### 4. O modelo inventou alguma informação?

Nos testes feitos até aqui (perguntas sobre recursividade) não foi observada informação inventada. 

Um cenário em que provavelmente inventaria: perguntar sobre informações específicas do campus (ex.: "Qual é o horário do colégio no IFBA Irecê?"). O modelo não tem acesso a essa informação, mas tende a gerar uma resposta plausível mesmo assim, porque foi treinado para continuar textos de forma fluente, não para admitir que não sabe. É exatamente o problema que o RAG (próxima aula) resolve.

### 5. Colocariam este chat no site do IFBA Campus Irecê hoje?

Ainda não. **Custo:** no nível gratuito o custo é zero, mas há limite de requisições por minuto, então muitos alunos simultâneos receberiam 429; em um plano pago, o custo por conversa é baixo, mas cresce com o histórico reenviado a cada turno. **Risco de resposta errada:** o modelo pode inventar informações sobre o campus, o que é grave em um site institucional. **Segurança da chave:** está protegida no servidor, mas faltam limite de requisições por usuário (rate limit) e proteção contra abuso. **O que falta construir:** RAG com documentos oficiais do campus, histórico persistente (Redis/banco) em vez de `Map` em memória, autenticação ou rate limit, deploy com HTTPS e monitoramento de custo. Para uso acadêmico controlado, sim; como atendimento oficial, ainda não.

## Limitações conhecidas

- O histórico fica em memória: reiniciar o servidor apaga todas as conversas.
- Recarregar a página limpa a tela, mas não o histórico no servidor, porque o `sessionId` fica no `sessionStorage` da aba. Para começar uma conversa nova, é preciso abrir uma nova aba.
- Não há limite de requisições por usuário.
