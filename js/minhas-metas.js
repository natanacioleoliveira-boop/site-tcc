
import { supabase } from "./supabase.js";

const $ = (id) => document.getElementById(id);

const moeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const hoje = () => new Date().toLocaleDateString("en-CA");

const categorias = {
  educacao: "Educação",
  tecnologia: "Tecnologia",
  reserva: "Reserva para imprevistos",
  moradia: "Moradia",
  viagem: "Viagem",
  trabalho: "Trabalho ou negócio",
  outros: "Outros"
};

let usuario = null;
let metas = [];

function mensagem(id, texto, erro = false) {
  const el = $(id);
  if (!el) return;

  el.hidden = false;
  el.textContent = texto;
  el.classList.toggle("erro", erro);
}

function limparMensagem(id) {
  const el = $(id);

  if (el) {
    el.hidden = true;
    el.textContent = "";
  }
}

function erroTexto(error) {
  console.error(error);
  return error?.message || "Não foi possível concluir a operação.";
}

function obterMeta(id) {
  return metas.find((meta) => meta.id === id);
}

// BUSCAR METAS NO SUPABASE
async function carregarMetas() {
  const { data, error } = await supabase
    .from("metas")
    .select("*")
    .eq("user_id", usuario.id)
    .order("criado_em", { ascending: false });

  if (error) throw error;

  metas = data || [];
  renderizar();
}

// MONTAR CARTÃO DE CADA META
function montarCartao(meta) {
  const li = $("metas-modelo-cartao")
    .content.firstElementChild.cloneNode(true);

  const objetivo = Number(meta.valor_objetivo);
  const reservado = Number(meta.valor_reservado);

  const percentual = objetivo > 0
    ? Math.min(100, Math.round((reservado / objetivo) * 100))
    : 0;

  li.dataset.id = meta.id;

  li.querySelector(".metas-cartao-categoria").textContent =
    categorias[meta.categoria] || meta.categoria;

  li.querySelector(".metas-cartao-titulo").textContent = meta.nome;
  li.querySelector(".metas-cartao-reservado").textContent = moeda(reservado);
  li.querySelector(".metas-cartao-objetivo").textContent = moeda(objetivo);

  li.querySelector(".metas-progresso").value = percentual;

  li.querySelector(".metas-cartao-percentual").textContent =
    `${percentual}% alcançado`;

  li.querySelector(".metas-cartao-restante").textContent =
    `Faltam ${moeda(Math.max(0, objetivo - reservado))}`;

  const prazo = li.querySelector(".metas-cartao-prazo");

  if (meta.prazo) {
    prazo.hidden = false;
    prazo.textContent =
      `Prazo: ${new Date(meta.prazo + "T12:00:00").toLocaleDateString("pt-BR")}`;
  }

  return li;
}

// MONTAR METAS PAUSADAS E CONCLUÍDAS
function montarHistorico(meta) {
  const li = $("metas-modelo-historico")
    .content.firstElementChild.cloneNode(true);

  li.dataset.id = meta.id;

  li.querySelector(".metas-historico-nome").textContent = meta.nome;

  li.querySelector(".metas-historico-descricao").textContent =
    `${moeda(meta.valor_reservado)} de ${moeda(meta.valor_objetivo)} reservados`;

  const botao = li.querySelector('[data-acao="retomar-meta"]');

  if (botao) {
    botao.hidden = meta.status !== "pausada";
  }

  return li;
}

// ATUALIZAR A INTERFACE
function renderizar() {
  const ativas = metas.filter((m) => m.status === "ativa");
  const pausadas = metas.filter((m) => m.status === "pausada");
  const concluidas = metas.filter((m) => m.status === "concluida");

  $("metas-quantidade-ativas").textContent = ativas.length;
  $("metas-quantidade-concluidas").textContent = concluidas.length;

  $("metas-total-reservado").textContent = moeda(
    metas.reduce((soma, meta) =>
      soma + Number(meta.valor_reservado), 0)
  );

  const grupos = [
    [ativas, "metas-lista-ativas", "metas-ativas-vazio", montarCartao],
    [pausadas, "metas-lista-pausadas", "metas-pausadas-vazio", montarHistorico],
    [concluidas, "metas-lista-concluidas", "metas-concluidas-vazio", montarHistorico]
  ];

  for (const [dados, listaId, vazioId, montar] of grupos) {
    const lista = $(listaId);

    lista.replaceChildren(...dados.map(montar));
    lista.hidden = dados.length === 0;

    $(vazioId).hidden = dados.length > 0;
  }

  $("metas-planejamento-vazio").hidden = ativas.length > 0;
  $("metas-form-simulador").hidden = ativas.length === 0;

  const select = $("simulador-meta");
  const anterior = select.value;

  select.replaceChildren(new Option("Selecione sua meta", ""));

  ativas.forEach((meta) => {
    select.add(new Option(meta.nome, meta.id));
  });

  if (ativas.some((meta) => meta.id === anterior)) {
    select.value = anterior;
  }

  $("metas-resultado-simulacao").hidden = true;
}

// SALVAR ALTERAÇÕES NO SUPABASE
async function atualizarMeta(meta, alteracoes) {
  const { error } = await supabase
    .from("metas")
    .update(alteracoes)
    .eq("id", meta.id)
    .eq("user_id", usuario.id);

  if (error) throw error;

  await carregarMetas();
}

// HABILITAR BOTÕES
$("metas-salvar-nova").disabled = false;
$("metas-calcular-prazo").disabled = false;
$("metas-salvar-edicao").disabled = false;
$("metas-salvar-movimentacao").disabled = false;

// CRIAR META
$("metas-form-criar").addEventListener("submit", async (event) => {
  event.preventDefault();

  limparMensagem("metas-mensagem-criacao");

  const nome = $("meta-nome").value.trim();
  const categoria = $("meta-categoria").value;
  const valor_objetivo = Number($("meta-valor-objetivo").value);
  const valor_reservado = Number($("meta-valor-inicial").value || 0);

  if (
    !nome ||
    !categoria ||
    !Number.isFinite(valor_objetivo) ||
    valor_objetivo <= 0 ||
    !Number.isFinite(valor_reservado) ||
    valor_reservado < 0 ||
    valor_reservado > valor_objetivo
  ) {
    mensagem(
      "metas-mensagem-criacao",
      "Confira os valores: o reservado deve estar entre zero e o objetivo.",
      true
    );
    return;
  }

  const botao = $("metas-salvar-nova");
  botao.disabled = true;

  try {
    const { error } = await supabase.from("metas").insert({
      user_id: usuario.id,
      nome,
      categoria,
      valor_objetivo,
      valor_reservado,
      prazo: $("meta-prazo").value || null,
      descricao: $("meta-descricao").value.trim() || null
    });

    if (error) throw error;

    event.target.reset();
    await carregarMetas();

    mensagem("metas-mensagem-criacao", "Meta criada com sucesso!");
  } catch (error) {
    mensagem("metas-mensagem-criacao", erroTexto(error), true);
  } finally {
    botao.disabled = false;
  }
});

// BOTÕES DAS METAS
$("metas-lista-ativas").addEventListener("click", async (event) => {
  const botao = event.target.closest("button[data-acao]");

  if (!botao) return;

  const meta = obterMeta(botao.closest("li[data-id]")?.dataset.id);

  if (!meta) return;

  const acao = botao.dataset.acao;

  if (acao === "adicionar-valor" || acao === "retirar-valor") {
    $("metas-form-movimentacao").reset();
    limparMensagem("metas-mensagem-movimentacao");

    $("metas-movimento-id").value = meta.id;
    $("metas-movimento-nome").textContent = meta.nome;

    $("metas-movimento-tipo").value =
      acao === "adicionar-valor" ? "adicionar" : "retirar";

    $("metas-movimento-data").value = hoje();

    $("metas-dialogo-movimentacao").showModal();

  } else if (acao === "editar-meta") {
    $("metas-form-edicao").reset();
    limparMensagem("metas-mensagem-edicao");

    $("metas-edicao-id").value = meta.id;
    $("metas-edicao-nome").value = meta.nome;
    $("metas-edicao-valor").value = meta.valor_objetivo;
    $("metas-edicao-prazo").value = meta.prazo || "";

    $("metas-dialogo-edicao").showModal();

  } else if (acao === "pausar-meta" || acao === "concluir-meta") {
    const novoStatus =
      acao === "pausar-meta" ? "pausada" : "concluida";

    if (
      novoStatus === "concluida" &&
      Number(meta.valor_reservado) < Number(meta.valor_objetivo)
    ) {
      alert("Para concluir, reserve o valor total da meta.");
      return;
    }

    if (!confirm(
      `Deseja ${novoStatus === "pausada" ? "pausar" : "concluir"} esta meta?`
    )) return;

    try {
      await atualizarMeta(meta, { status: novoStatus });
    } catch (error) {
      alert(erroTexto(error));
    }
  }
});

// ADICIONAR OU RETIRAR VALOR
$("metas-form-movimentacao").addEventListener("submit", async (event) => {
  event.preventDefault();

  const meta = obterMeta($("metas-movimento-id").value);

  if (!meta) return;

  const valor = Number($("metas-movimento-valor").value);
  const tipo = $("metas-movimento-tipo").value;

  const novoValor = Number(meta.valor_reservado) +
    (tipo === "adicionar" ? valor : -valor);

  if (
    !Number.isFinite(valor) ||
    valor <= 0 ||
    novoValor < 0 ||
    novoValor > Number(meta.valor_objetivo)
  ) {
    mensagem(
      "metas-mensagem-movimentacao",
      "Valor inválido ou maior que o disponível/objetivo.",
      true
    );
    return;
  }

  const botao = $("metas-salvar-movimentacao");
  botao.disabled = true;

  try {
    await atualizarMeta(meta, {
      valor_reservado: Number(novoValor.toFixed(2))
    });

    $("metas-dialogo-movimentacao").close();
  } catch (error) {
    mensagem("metas-mensagem-movimentacao", erroTexto(error), true);
  } finally {
    botao.disabled = false;
  }
});

// EDITAR META
$("metas-form-edicao").addEventListener("submit", async (event) => {
  event.preventDefault();

  const meta = obterMeta($("metas-edicao-id").value);

  if (!meta) return;

  const nome = $("metas-edicao-nome").value.trim();
  const valor_objetivo = Number($("metas-edicao-valor").value);

  if (
    !nome ||
    !Number.isFinite(valor_objetivo) ||
    valor_objetivo <= 0 ||
    valor_objetivo < Number(meta.valor_reservado)
  ) {
    mensagem(
      "metas-mensagem-edicao",
      "O objetivo não pode ser menor que o valor já reservado.",
      true
    );
    return;
  }

  const botao = $("metas-salvar-edicao");
  botao.disabled = true;

  try {
    await atualizarMeta(meta, {
      nome,
      valor_objetivo,
      prazo: $("metas-edicao-prazo").value || null
    });

    $("metas-dialogo-edicao").close();
  } catch (error) {
    mensagem("metas-mensagem-edicao", erroTexto(error), true);
  } finally {
    botao.disabled = false;
  }
});

// FECHAR JANELAS
$("metas-cancelar-movimentacao").addEventListener("click", () =>
  $("metas-dialogo-movimentacao").close()
);

$("metas-cancelar-edicao").addEventListener("click", () =>
  $("metas-dialogo-edicao").close()
);

// RETOMAR META PAUSADA
$("metas-lista-pausadas").addEventListener("click", async (event) => {
  const botao = event.target.closest('[data-acao="retomar-meta"]');

  if (!botao) return;

  const meta = obterMeta(botao.closest("li[data-id]")?.dataset.id);

  if (!meta) return;

  try {
    await atualizarMeta(meta, { status: "ativa" });
  } catch (error) {
    alert(erroTexto(error));
  }
});

// SIMULADOR DE PRAZO
$("metas-form-simulador").addEventListener("submit", (event) => {
  event.preventDefault();

  const meta = obterMeta($("simulador-meta").value);
  const mensal = Number($("simulador-valor").value);

  if (!meta || !Number.isFinite(mensal) || mensal <= 0) return;

  const restante = Math.max(
    0,
    Number(meta.valor_objetivo) - Number(meta.valor_reservado)
  );

  const meses = Math.ceil(restante / mensal);

  $("metas-tempo-estimado").textContent =
    meses === 0
      ? "Meta já alcançada"
      : `${meses} ${meses === 1 ? "mês" : "meses"}`;

  $("metas-resultado-simulacao").hidden = false;
});

// INICIAR A PÁGINA
async function iniciar() {
  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      window.location.replace("login.html");
      return;
    }

    usuario = user;
    await carregarMetas();

  } catch (error) {
    console.error("Erro ao carregar metas:", error);

    mensagem(
      "metas-mensagem-criacao",
      `Erro ao carregar metas: ${erroTexto(error)}`,
      true
    );
  }
}

iniciar();
