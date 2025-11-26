// Configuração
const API_URL = "";
const matricula = sessionStorage.getItem("alunoMatricula") || localStorage.getItem("matricula");

if (!matricula) {
  console.error("Matrícula não encontrada");
  alert("Erro: Você precisa fazer login primeiro!");
  window.location.href = "/";
}

// Funções de utilidade
function formatarHorasTotais(segundos) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const seg = segundos % 60;
  
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

function calcularDiasSequencia(registros) {
  if (!registros || registros.length === 0) return 0;
  
  const registrosOrdenados = registros
    .filter(r => r.fim !== null)
    .sort((a, b) => new Date(b.fim) - new Date(a.fim));
  
  if (registrosOrdenados.length === 0) return 0;
  
  let diasSequencia = 1;
  let dataAnterior = new Date(registrosOrdenados[0].fim);
  dataAnterior.setHours(0, 0, 0, 0);
  
  for (let i = 1; i < registrosOrdenados.length; i++) {
    const dataAtual = new Date(registrosOrdenados[i].fim);
    dataAtual.setHours(0, 0, 0, 0);
    
    const diffDias = Math.floor((dataAnterior - dataAtual) / (1000 * 60 * 60 * 24));
    
    if (diffDias === 1) {
      diasSequencia++;
      dataAnterior = dataAtual;
    } else {
      break;
    }
  }
  
  return diasSequencia;
}

function calcularTotalHoras(registros) {
  if (!registros || registros.length === 0) return 0;
  
  return registros.reduce((total, registro) => {
    if (registro.fim) {
      const inicio = new Date(registro.inicio);
      const fim = new Date(registro.fim);
      const segundos = (fim - inicio) / 1000;
      return total + segundos;
    }
    return total;
  }, 0);
}

// Funções de API
async function carregarPerfil() {
  try {
    const resposta = await fetch(`${API_URL}/api/perfil`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricula })
    });
    
    if (!resposta.ok) {
      throw new Error("Erro ao carregar perfil");
    }
    
    const dados = await resposta.json();
    preencherPerfil(dados);
    
  } catch (erro) {
    console.error("Erro ao carregar perfil:", erro);
    document.getElementById("nome").textContent = "Erro ao carregar dados";
  }
}

function preencherPerfil(dados) {
  document.getElementById("nome").textContent = dados.nome || "Não informado";
  document.getElementById("idade").textContent = dados.idade ? `${dados.idade} anos` : "-";
  document.getElementById("nivel-ensino").textContent = dados.nivel_ensino || "-";
  document.getElementById("escola").textContent = dados.escola || "-";
  document.getElementById("matricula").textContent = dados.matricula || "-";
  document.getElementById("pontos").textContent = dados.pontos || 0;
  
  const diasSequencia = calcularDiasSequencia(dados.registros || []);
  document.getElementById("dias-sequencia").textContent = diasSequencia;
  
  const totalSegundos = calcularTotalHoras(dados.registros || []);
  const horasFormatadas = formatarHorasTotais(totalSegundos);
  document.getElementById("total-horas").textContent = horasFormatadas;
  
  document.getElementById("ranking-escola").textContent = dados.escola || "-";
  document.getElementById("ranking-posicao").textContent = dados.posicao_ranking 
    ? `#${dados.posicao_ranking} no Ranking entre escolas!` 
    : "Sem ranking disponível";
}

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  await carregarPerfil();
});

