// Configuração
const API_URL = "";
const matricula = sessionStorage.getItem("alunoMatricula") || localStorage.getItem("matricula");

if (!matricula) {
  console.error("Matrícula não encontrada");
  alert("Erro: Você precisa fazer login primeiro!");
  window.location.href = "/";
}

// Estado da aplicação
const estado = {
  registroId: null,
  tempoTotal: 0,
  intervalo: null,
  estaRodando: false,
  tempoInicio: null
};

const ESTADO_STORAGE_KEY = `ponto_estado_${matricula}`;

// Funções de utilidade
function formatarTempo(segundos) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const seg = segundos % 60;
  
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

function salvarEstado() {
  try {
    const estadoParaSalvar = {
      registroId: estado.registroId,
      tempoTotal: estado.tempoTotal,
      estaRodando: estado.estaRodando,
      tempoInicio: estado.tempoInicio
    };
    localStorage.setItem(ESTADO_STORAGE_KEY, JSON.stringify(estadoParaSalvar));
  } catch (erro) {
    console.error("Erro ao salvar estado:", erro);
  }
}

function restaurarEstado() {
  try {
    const estadoSalvo = localStorage.getItem(ESTADO_STORAGE_KEY);
    if (estadoSalvo) {
      const dados = JSON.parse(estadoSalvo);
      estado.registroId = dados.registroId;
      estado.tempoTotal = dados.tempoTotal || 0;
      estado.estaRodando = false;
      estado.tempoInicio = dados.tempoInicio;
      return true;
    }
  } catch (erro) {
    console.error("Erro ao restaurar estado:", erro);
  }
  return false;
}

function limparEstadoSalvo() {
  localStorage.removeItem(ESTADO_STORAGE_KEY);
}

function atualizarDisplay() {
  const elemento = document.getElementById("tempo");
  if (elemento) {
    elemento.textContent = formatarTempo(estado.tempoTotal);
  }
}

function pararCronometro() {
  if (estado.intervalo) {
    clearInterval(estado.intervalo);
    estado.intervalo = null;
  }
  estado.estaRodando = false;
}

function iniciarCronometro() {
  if (estado.intervalo) {
    clearInterval(estado.intervalo);
    estado.intervalo = null;
  }
  
  if (!estado.registroId) {
    console.warn("Tentativa de iniciar cronômetro sem registro ativo");
    return;
  }
  
  estado.estaRodando = true;
  if (!estado.tempoInicio) {
    estado.tempoInicio = Date.now();
  }
  salvarEstado();
  
  estado.intervalo = setInterval(() => {
    if (estado.estaRodando && estado.registroId) {
      estado.tempoTotal++;
      atualizarDisplay();
      if (estado.tempoTotal % 5 === 0) {
        salvarEstado();
      }
    } else {
      if (estado.intervalo) {
        clearInterval(estado.intervalo);
        estado.intervalo = null;
      }
    }
  }, 1000);
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
      const dadosErro = await resposta.json().catch(() => ({}));
      throw new Error(dadosErro.erro || `Erro ${resposta.status}: ${resposta.statusText}`);
    }
    
    const dados = await resposta.json();
    const elemento = document.getElementById("aluno-info");
    if (elemento) {
      elemento.textContent = `Seus pontos: ${dados.pontos}`;
    }
  } catch (erro) {
    console.error("Erro ao buscar pontos:", erro);
    const elemento = document.getElementById("aluno-info");
    if (elemento) {
      elemento.textContent = `Erro ao carregar pontos: ${erro.message}`;
    }
  }
}

async function iniciarPonto() {
  if (estado.registroId) {
    console.warn("Já existe um ponto ativo");
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/iniciar_ponto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricula })
    });

    if (!resposta.ok) {
      const dadosErro = await resposta.json().catch(() => ({}));
      throw new Error(dadosErro.error || dadosErro.erro || `Erro ${resposta.status}: ${resposta.statusText}`);
    }

    const dados = await resposta.json();
    
    pararCronometro();
    estado.registroId = dados.registro_id;
    estado.tempoTotal = 0;
    estado.estaRodando = true;
    estado.tempoInicio = Date.now();
    salvarEstado();
    atualizarDisplay();
    document.getElementById("mensagem").textContent = "Ponto ativo...";
    document.getElementById("btn-ponto").textContent = "Finalizar Ponto";
    iniciarCronometro();
    
  } catch (erro) {
    console.error("Erro ao iniciar ponto:", erro);
    const mensagem = document.getElementById("mensagem");
    if (mensagem) {
      mensagem.textContent = `Erro ao iniciar ponto: ${erro.message}`;
    }
  }
}

async function finalizarPonto() {
  if (!estado.registroId) {
    console.warn("Nenhum ponto ativo para finalizar");
    return;
  }

  try {
    pararCronometro();
    const botao = document.getElementById("btn-ponto");
    botao.disabled = true;
    document.getElementById("mensagem").textContent = "Finalizando ponto...";

    const resposta = await fetch(`${API_URL}/finalizar_ponto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registro_id: estado.registroId })
    });

    if (!resposta.ok) {
      const dados = await resposta.json();
      throw new Error(dados.erro || "Erro ao finalizar ponto");
    }

    const dados = await resposta.json();
    
    pararCronometro();
    estado.registroId = null;
    estado.tempoTotal = 0;
    estado.estaRodando = false;
    estado.intervalo = null;
    estado.tempoInicio = null;
    limparEstadoSalvo();
    atualizarDisplay();
    document.getElementById("mensagem").textContent = `Ponto finalizado! +${dados.pontos_ganhos} pontos`;
    botao.textContent = "Bater Ponto";
    botao.disabled = false;
    await buscarPontos();
    
  } catch (erro) {
    console.error("Erro ao finalizar ponto:", erro);
    pararCronometro();
    document.getElementById("mensagem").textContent = erro.message;
    const botao = document.getElementById("btn-ponto");
    botao.disabled = false;
    botao.textContent = "Finalizar Ponto";
  }
}

// Handlers de eventos
function handleBotaoClick() {
  if (!estado.registroId) {
    iniciarPonto();
  } else if (!estado.estaRodando) {
    if (estado.intervalo) {
      clearInterval(estado.intervalo);
      estado.intervalo = null;
    }
    if (estado.tempoInicio) {
      const tempoDecorrido = Math.floor((Date.now() - estado.tempoInicio) / 1000);
      estado.tempoTotal += tempoDecorrido;
    }
    estado.estaRodando = true;
    estado.tempoInicio = Date.now();
    salvarEstado();
    document.getElementById("mensagem").textContent = "Ponto retomado...";
    document.getElementById("btn-ponto").textContent = "Finalizar Ponto";
    iniciarCronometro();
  } else {
    finalizarPonto();
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && estado.estaRodando && estado.registroId) {
    estado.estaRodando = false;
    pararCronometro();
    document.getElementById("mensagem").textContent = "Pausado (aba trocada)";
    document.getElementById("btn-ponto").textContent = "Retomar Ponto";
  }
});

window.addEventListener("beforeunload", () => {
  if (estado.registroId) {
    if (estado.tempoInicio && estado.estaRodando) {
      const tempoDecorrido = Math.floor((Date.now() - estado.tempoInicio) / 1000);
      estado.tempoTotal += tempoDecorrido;
    }
    salvarEstado();
  }
  pararCronometro();
});

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  const botao = document.getElementById("btn-ponto");
  if (botao) {
    botao.addEventListener("click", handleBotaoClick);
  }
  
  const estadoRestaurado = restaurarEstado();
  
  if (estadoRestaurado && estado.registroId) {
    estado.tempoInicio = Date.now();
    atualizarDisplay();
    document.getElementById("mensagem").textContent = "Ponto pausado (página recarregada)";
    document.getElementById("btn-ponto").textContent = "Retomar Ponto";
  } else {
    atualizarDisplay();
  }
  
  await buscarPontos();
});
