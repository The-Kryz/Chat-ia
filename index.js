import express from "express";
import Groq from "groq-sdk";
import "dotenv/config"; // carrega o .env para process.env (precisa vir antes de ler process.env)

const app = express();
app.use(express.json()); // sem isso, req.body chega undefined
app.use(express.static("public")); // serve a pasta public como raiz do site

const PORT = process.env.PORT || 3000;
const MODEL = "openai/gpt-oss-120b";

// Cliente criado uma única vez; a chave vem só do .env, nunca do código.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── DESAFIO 3: assistente especializado ──
// Prompt original da aula (guardado para comparação no README):
//   "Não responda nada fora do contexto de ciência da computação e programação."
const SYSTEM_PROMPT = {
  role: "system",
  content:
    "Você é um monitor de Algoritmos e Estruturas de Dados para estudantes de " +
    "Análise e Desenvolvimento de Sistemas. Responda sempre em português do Brasil, " +
    "de forma didática: explique a ideia, mostre um exemplo curto em código e cite " +
    "a complexidade de tempo quando fizer sentido. Se o assunto fugir de computação " +
    "e programação, recuse educadamente e convide o aluno a voltar ao tema.",
};

// ── DESAFIOS 1 e 8: memória de conversa isolada por sessão ──
// Map: chave = sessionId (gerado no navegador), valor = array de mensagens.
const sessoes = new Map();
const MAX_TROCAS = 10; // 10 trocas = 20 mensagens (user + assistant)
const MAX_SESSOES = 500; // proteção simples contra crescimento infinito da memória

function getHistorico(sessionId) {
  if (!sessoes.has(sessionId)) {
    if (sessoes.size >= MAX_SESSOES) {
      // remove a sessão mais antiga (o Map preserva a ordem de inserção)
      sessoes.delete(sessoes.keys().next().value);
    }
    sessoes.set(sessionId, []);
  }
  return sessoes.get(sessionId);
}

// ── DESAFIO 6: mensagens específicas por código de erro ──
const MENSAGENS_ERRO = {
  401: "Chave de API inválida. Verifique o arquivo .env e reinicie o servidor.",
  429: "Muitas requisições. Aguarde alguns segundos e tente de novo.",
  400: "Requisição inválida. Confira o nome do modelo e os parâmetros.",
  413: "Conversa muito longa. Recarregue a página para começar de novo.",
};

app.post("/api/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  // validação: nunca confie no que chega do cliente
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Mensagem não fornecida!" });
  }
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId não fornecido!" });
  }

  const historico = getHistorico(sessionId);
  historico.push({ role: "user", content: message });

  // mantém só as últimas 10 trocas (o system prompt é adicionado na chamada)
  while (historico.length > MAX_TROCAS * 2) {
    historico.shift();
  }

  try {
    const responseGroq = await groq.chat.completions.create({
      model: MODEL,
      messages: [SYSTEM_PROMPT, ...historico], // reenvia TODO o histórico (a API é stateless)
    });

    const resposta = responseGroq.choices[0]?.message?.content || "";
    historico.push({ role: "assistant", content: resposta });

    // registra só metadados, nunca o texto do usuário
    console.log(
      `[ok] sessão=${sessionId.slice(0, 8)} tokens=${responseGroq.usage?.total_tokens ?? "?"}`
    );

    res.json({ response: resposta });
  } catch (error) {
    // falhou: remove a pergunta do histórico para não deixar user sem resposta
    historico.pop();

    const status = error.status || 500;
    console.error(`[erro ${status}]`, error.message);

    return res.status(status).json({
      error: MENSAGENS_ERRO[status] || "Erro ao consultar a API da Groq.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
