// ── 1. referências aos elementos da página ──
const inputMessage = document.getElementById("inputMessage");
const btnSend = document.getElementById("btnSend");
const chatArea = document.getElementById("chatArea");

inputMessage.focus(); // cursor já no campo ao abrir a página

// ── DESAFIO 8: um id por aba, mantido enquanto a aba estiver aberta ──
const sessionId = sessionStorage.getItem("sessionId") || crypto.randomUUID();
sessionStorage.setItem("sessionId", sessionId);

// ── 2. cria e insere uma bolha de mensagem ──
function addMessage(message, sender) {
  const divMessage = document.createElement("div");
  divMessage.classList.add("message", sender); // sender é "user" ou "bot"

  // marked.parse converte Markdown em HTML;
  // DOMPurify.sanitize remove <script>, onerror= etc. antes de inserir (Desafio 9)
  divMessage.innerHTML = DOMPurify.sanitize(marked.parse(message));

  chatArea.appendChild(divMessage);
  chatArea.scrollTop = chatArea.scrollHeight; // rola para o fim
}

// ── 3. envia a mensagem ao backend ──
async function sendMessage() {
  if (btnSend.disabled) return; // evita envio duplicado (Enter durante a espera)

  const message = inputMessage.value.trim();

  inputMessage.value = ""; // limpa o campo imediatamente
  inputMessage.focus();

  if (!message) return; // ignora envio vazio

  addMessage(message, "user"); // mostra o que o usuário escreveu

  // ── DESAFIO 2: bolha "Pensando..." + botão desabilitado ──
  const loading = document.createElement("div");
  loading.classList.add("message", "bot", "loading");
  loading.textContent = "Pensando...";
  chatArea.appendChild(loading);
  chatArea.scrollTop = chatArea.scrollHeight;
  btnSend.disabled = true;

  try {
    // caminho relativo: funciona em localhost e depois de publicado
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId }),
    });

    const data = await response.json();
    loading.remove();

    addMessage(response.ok ? data.response : data.error, "bot");
  } catch (error) {
    loading.remove();
    addMessage("Falha de conexão com o servidor.", "bot");
  } finally {
    btnSend.disabled = false; // libera o botão sempre, com ou sem erro
    inputMessage.focus();
  }
}

// ── 4. dois gatilhos: clique no botão e tecla Enter ──
btnSend.addEventListener("click", sendMessage);

inputMessage.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});
