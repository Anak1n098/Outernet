// Configuração
const API_URL = "";
const matricula = sessionStorage.getItem("alunoMatricula") || localStorage.getItem("matricula");

if (!matricula) {
  console.error("Matrícula não encontrada");
  alert("Erro: Você precisa fazer login primeiro!");
  window.location.href = "/";
}

// Funções de API
async function buscarPontos() {
  try {
    const resposta = await fetch(`${API_URL}/get_pontos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricula })
    });
    
    if (!resposta.ok) {
      throw new Error("Erro ao buscar pontos");
    }
    
    const dados = await resposta.json();
    document.getElementById("pontos-atual").textContent = dados.pontos || 0;
    return dados.pontos || 0;
  } catch (erro) {
    console.error("Erro ao buscar pontos:", erro);
    return 0;
  }
}

async function carregarPremios() {
  try {
    const resposta = await fetch(`${API_URL}/api/premios`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!resposta.ok) {
      throw new Error("Erro ao carregar prêmios");
    }
    
    const dados = await resposta.json();
    const pontosAtuais = await buscarPontos();
    exibirPremios(dados.premios || [], pontosAtuais);
    
  } catch (erro) {
    console.error("Erro ao carregar prêmios:", erro);
    const lista = document.getElementById("premios-lista");
    if (lista) {
      lista.innerHTML = `<p style="text-align: center; color: #fff; padding: 2rem;">Erro ao carregar prêmios: ${erro.message}</p>`;
    }
  }
}

function exibirPremios(premios, pontosAtuais) {
  const lista = document.getElementById("premios-lista");
  
  if (!lista) {
    console.error("Elemento premios-lista não encontrado");
    return;
  }
  
  if (premios.length === 0) {
    lista.innerHTML = `
      <p style="text-align: center; color: #fff; padding: 2rem;">
        Nenhum prêmio disponível no momento.
      </p>
    `;
    return;
  }
  
  lista.innerHTML = premios.map(premio => {
    const podeResgatar = pontosAtuais >= premio.pontos_necessarios;
    const classeCard = podeResgatar ? 'premio-card' : 'premio-card desabilitado';
    
    return `
      <div class="${classeCard}" data-premio-id="${premio.id}">
        <div class="premio-info">
          <div class="premio-nome">${premio.nome}</div>
          <div class="premio-descricao">${premio.descricao || ''}</div>
          ${premio.validade ? `<div class="premio-validade">${premio.validade}</div>` : ''}
        </div>
        <div class="premio-pontos">
          <div class="premio-estrela">⭐</div>
          <div class="premio-valor">${premio.pontos_necessarios}</div>
        </div>
      </div>
    `;
  }).join('');
  
  document.querySelectorAll('.premio-card').forEach(card => {
    if (!card.classList.contains('desabilitado')) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        const premioId = parseInt(card.getAttribute('data-premio-id'));
        const premio = premios.find(p => p.id === premioId);
        if (premio) {
          resgatarPremio(premio);
        }
      });
    }
  });
}

async function resgatarPremio(premio) {
  if (!confirm(`Deseja resgatar "${premio.nome}" por ${premio.pontos_necessarios} pontos?`)) {
    return;
  }
  
  try {
    const resposta = await fetch(`${API_URL}/api/resgatar_premio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricula, premio_id: premio.id })
    });
    
    if (!resposta.ok) {
      const dados = await resposta.json();
      throw new Error(dados.erro || "Erro ao resgatar prêmio");
    }
    
    const dados = await resposta.json();
    alert(`${dados.mensagem}\nPontos restantes: ${dados.pontos_restantes}`);
    await carregarPremios();
    
  } catch (erro) {
    console.error("Erro ao resgatar prêmio:", erro);
    alert(`Erro: ${erro.message}`);
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  await carregarPremios();
});

