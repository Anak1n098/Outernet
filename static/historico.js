// Configuração
const API_URL = "";
const matricula = sessionStorage.getItem("alunoMatricula") || localStorage.getItem("matricula");

if (!matricula) {
  console.error("Matrícula não encontrada");
  alert("Erro: Você precisa fazer login primeiro!");
  window.location.href = "/";
}

// Funções de API
async function carregarHistorico() {
  try {
    const resposta = await fetch(`${API_URL}/historico_pontos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricula })
    });
    
    if (!resposta.ok) {
      throw new Error("Erro ao carregar histórico");
    }
    
    const dados = await resposta.json();
    exibirHistorico(dados.historico || []);
    
  } catch (erro) {
    console.error("Erro ao carregar histórico:", erro);
    const lista = document.getElementById("historico-lista");
    if (lista) {
      lista.innerHTML = `<p style="text-align: center; color: #d32f2f; padding: 2rem;">Erro ao carregar histórico: ${erro.message}</p>`;
    }
  }
}

function exibirHistorico(historico) {
  const lista = document.getElementById("historico-lista");
  
  if (!lista) {
    console.error("Elemento historico-lista não encontrado");
    return;
  }
  
  if (historico.length === 0) {
    lista.innerHTML = `
      <p style="text-align: center; color: #666; padding: 2rem;">
        Nenhum ponto registrado ainda.<br>
        Comece a bater ponto para ver seu histórico aqui!
      </p>
    `;
    return;
  }
  
  lista.innerHTML = historico.map(item => `
    <div class="historico-card">
      <div class="historico-card-content">
        <div class="historico-escola">${item.escola || 'Escola'}</div>
        <div class="historico-data-hora">
          ${item.data} - ${item.hora}
        </div>
      </div>
      <div class="historico-pontos">
        <div class="historico-estrela">⭐</div>
        <div class="historico-valor">+ ${item.pontos_ganhos}</div>
      </div>
    </div>
  `).join('');
}

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  await carregarHistorico();
});

