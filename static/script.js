const API_URL = "";

async function login() {
  const matricula = document.getElementById("matricula").value;
  const senha = document.getElementById("senha").value;
  const escola = document.getElementById("escola").value;
  const mensagem = document.getElementById("mensagem");

  mensagem.textContent = "Conectando...";

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricula, senha, escola })
    });

    const data = await response.json();

    if (data.success) {
      mostrarPaginaPonto(data.aluno);
    } else {
      mensagem.textContent = data.message;
      mensagem.style.color = "red";
    }
  } catch (error) {
    console.error("Erro no login:", error);
    mensagem.textContent = "Erro ao conectar com o servidor.";
    mensagem.style.color = "red";
  }
}

if (typeof window !== 'undefined') {
  window.mostrarPaginaPonto = function(aluno) {
    sessionStorage.setItem("alunoMatricula", aluno.matricula);
    sessionStorage.setItem("alunoPontos", aluno.pontos);
    window.location.href = "/ponto";
  };
}

document.getElementById("btn-login").addEventListener("click", login);
