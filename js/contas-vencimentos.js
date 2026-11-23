
import { supabase } from "./supabase.js";

const $ = (id) => document.getElementById(id);

const moeda = (valor) =>
    Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

const hoje = new Date();
hoje.setHours(0, 0, 0, 0);

let mesExibido = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
let contas = [];
let usuarioId = null;

const categorias = {
    moradia: "Moradia",
    alimentacao: "Alimentação",
    transporte: "Transporte",
    saude: "Saúde",
    educacao: "Educação",
    lazer: "Lazer",
    servicos: "Serviços",
    dividas: "Dívidas e parcelas",
    outros: "Outros"
};

function converterData(data) {
    const [ano, mes, dia] = data.slice(0, 10).split("-").map(Number);
    return new Date(ano, mes - 1, dia);
}

function dataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function dataBR(data) {
    return converterData(data).toLocaleDateString("pt-BR");
}

function mesmoMes(data) {
    const d = converterData(data);
    return d.getMonth() === mesExibido.getMonth() &&
           d.getFullYear() === mesExibido.getFullYear();
}

function situacao(conta) {
    if (conta.status === "pago") return "paga";

    return converterData(conta.data) < hoje
        ? "atrasada"
        : "pendente";
}

function somar(lista) {
    return lista.reduce(
        (total, conta) => total + Number(conta.valor || 0),
        0
    );
}

function mensagem(id, texto, erro = false) {
    const elemento = $(id);
    elemento.hidden = false;
    elemento.textContent = texto;
    elemento.style.color = erro ? "#a52b23" : "#17643d";
}

async function obterUsuario() {
    if (usuarioId) return usuarioId;

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        throw new Error("Usuário não autenticado.");
    }

    usuarioId = data.user.id;
    return usuarioId;
}

async function carregarContas() {
    try {
        const user_id = await obterUsuario();

        const { data, error } = await supabase
            .from("gastos")
            .select("id,user_id,descricao,categoria,tipo,valor,data,status,data_pagamento,compra_parcelada_id")
            .eq("user_id", user_id)
            .order("data", { ascending: true });

        if (error) throw error;

        contas = data || [];

        atualizarResumo();
        montarCalendario();
        mostrarProximas();
        mostrarSituacoes();

    } catch (erro) {
        console.error("Erro ao carregar contas:", erro);
        alert("Não foi possível carregar suas contas.");
    }
}

function atualizarResumo() {
    const periodo = mesExibido.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });

    $("cv-periodo-resumo").textContent = periodo;

    const contasMes = contas.filter(c => mesmoMes(c.data));

    const pendentes = contasMes.filter(
        c => c.status === "previsto"
    );

    const pagas = contasMes.filter(
        c => c.status === "pago"
    );

    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 7);

    const proximas = contas.filter(c => {
        if (c.status !== "previsto") return false;

        const vencimento = converterData(c.data);

        return vencimento >= hoje && vencimento <= limite;
    });

    $("cv-total-pendente").textContent = moeda(somar(pendentes));
    $("cv-total-pago").textContent = moeda(somar(pagas));
    $("cv-quantidade-proximas").textContent = proximas.length;
}

function montarCalendario() {
    const corpo = $("cv-calendario-dias");
    corpo.replaceChildren();

    const ano = mesExibido.getFullYear();
    const mes = mesExibido.getMonth();

    $("cv-mes-titulo").textContent =
        mesExibido.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric"
        });

    const primeiroDia = new Date(ano, mes, 1).getDay();
    const quantidadeDias = new Date(ano, mes + 1, 0).getDate();

    let dia = 1;

    for (let semana = 0; semana < 6 && dia <= quantidadeDias; semana++) {
        const linha = document.createElement("tr");

        for (let coluna = 0; coluna < 7; coluna++) {
            const celula = document.createElement("td");

            if ((semana === 0 && coluna < primeiroDia) ||
                dia > quantidadeDias) {
                celula.className = "cv-dia-vazio";
                linha.appendChild(celula);
                continue;
            }

            const data = dataISO(new Date(ano, mes, dia));
            const contasDia = contas.filter(c => c.data === data);

            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "cv-dia-botao";
            botao.textContent = dia;

            if (contasDia.length > 0) {
                const estados = contasDia.map(situacao);

                if (estados.includes("atrasada")) {
                    botao.classList.add("cv-dia-atrasado");
                } else if (estados.includes("pendente")) {
                    botao.classList.add("cv-dia-pendente");
                } else {
                    botao.classList.add("cv-dia-pago");
                }

                botao.setAttribute(
                    "aria-label",
                    `${dia} de ${$("cv-mes-titulo").textContent}: ${contasDia.length} conta(s)`
                );
            }

            botao.addEventListener("click", () => mostrarDia(data));

            celula.appendChild(botao);
            linha.appendChild(celula);
            dia++;
        }

        corpo.appendChild(linha);
    }

    $("cv-dia-detalhes").hidden = true;
}

function criarItem(conta) {
    const modelo = $("cv-modelo-item-conta");
    const item = modelo.content.firstElementChild.cloneNode(true);

    const estado = situacao(conta);

    item.querySelector(".cv-item-nome").textContent =
        conta.descricao;

    item.querySelector(".cv-item-vencimento").textContent =
        `Vencimento: ${dataBR(conta.data)}`;

    item.querySelector(".cv-item-situacao").textContent =
        estado === "atrasada" ? "Vencida" :
        estado === "paga" ? "Paga" : "Pendente";

    item.querySelector(".cv-item-valor").textContent =
        moeda(conta.valor);

    const confirmar = item.querySelector(".cv-item-confirmar");
    const editar = item.querySelector(".cv-item-editar");

    if (estado === "paga") {
        confirmar.remove();
    } else {
        confirmar.addEventListener("click", () => abrirPagamento(conta));
    }

    // Parcelas são gerenciadas em Meus Gastos.
    if (conta.compra_parcelada_id) {
        editar.remove();
    } else {
        editar.addEventListener("click", () => editarConta(conta));
    }

    return item;
}

function preencherLista(idLista, idVazio, registros) {
    const lista = $(idLista);
    const vazio = $(idVazio);

    lista.replaceChildren();

    if (registros.length === 0) {
        lista.hidden = true;
        vazio.hidden = false;
        return;
    }

    registros.forEach(conta => {
        lista.appendChild(criarItem(conta));
    });

    lista.hidden = false;
    vazio.hidden = true;
}

function mostrarSituacoes() {
    const mes = contas.filter(c => mesmoMes(c.data));

    preencherLista(
        "cv-lista-pendentes",
        "cv-pendentes-vazio",
        mes.filter(c => situacao(c) === "pendente")
    );

    preencherLista(
        "cv-lista-atrasadas",
        "cv-atrasadas-vazio",
        mes.filter(c => situacao(c) === "atrasada")
    );

    preencherLista(
        "cv-lista-pagas",
        "cv-pagas-vazio",
        mes.filter(c => situacao(c) === "paga")
    );
}

function mostrarProximas() {
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 7);

    const proximas = contas.filter(c => {
        const data = converterData(c.data);

        return c.status === "previsto" &&
               data >= hoje &&
               data <= limite;
    });

    preencherLista(
        "cv-lista-proximas",
        "cv-proximas-vazio",
        proximas
    );
}

function mostrarDia(data) {
    const registros = contas.filter(c => c.data === data);

    $("cv-dia-detalhes-titulo").textContent =
        `Contas de ${dataBR(data)}`;

    const lista = $("cv-dia-detalhes-lista");
    lista.replaceChildren();

    if (registros.length === 0) {
        const item = document.createElement("li");
        item.textContent = "Nenhuma conta nesta data.";
        lista.appendChild(item);
    } else {
        registros.forEach(conta => {
            lista.appendChild(criarItem(conta));
        });
    }

    $("cv-dia-detalhes").hidden = false;
}

async function cadastrarConta(event) {
    event.preventDefault();

    const descricao = $("cv-conta-nome").value.trim();
    const valor = Number($("cv-conta-valor").value);
    const data = $("cv-conta-vencimento").value;
    const categoria = $("cv-conta-categoria").value;
    const tipo = $("cv-conta-tipo").value;
    const recorrencia = $("cv-conta-recorrencia").value;

    if (!descricao || !Number.isFinite(valor) || valor <= 0 ||
        !data || !categoria || !tipo) {
        mensagem("cv-mensagem-cadastro", "Confira os campos.", true);
        return;
    }

    if (recorrencia !== "unica") {
        mensagem(
            "cv-mensagem-cadastro",
            "A recorrência mensal ainda não está disponível.",
            true
        );
        return;
    }

    const botao = $("cv-salvar-conta");
    botao.disabled = true;

    try {
        const user_id = await obterUsuario();

        const { error } = await supabase
            .from("gastos")
            .insert({
                user_id,
                descricao,
                valor,
                data,
                categoria,
                tipo,
                status: "previsto",
                data_pagamento: null
            });

        if (error) throw error;

        $("cv-form-cadastro").reset();

        mensagem("cv-mensagem-cadastro", "Conta cadastrada com sucesso!");

        await carregarContas();

    } catch (erro) {
        console.error("Erro ao cadastrar conta:", erro);
        mensagem("cv-mensagem-cadastro", erro.message, true);
    } finally {
        botao.disabled = false;
    }
}

function abrirPagamento(conta) {
    $("cv-pagamento-conta-id").value = conta.id;
    $("cv-pagamento-valor").value = Number(conta.valor);
    $("cv-pagamento-data").value = dataISO(hoje);

    $("cv-conta-selecionada").textContent =
        `${conta.descricao} — ${moeda(conta.valor)}`;

    $("cv-mensagem-pagamento").hidden = true;
    $("cv-dialogo-pagamento").showModal();
}

async function confirmarPagamento(event) {
    event.preventDefault();

    const id = $("cv-pagamento-conta-id").value;
    const valor = Number($("cv-pagamento-valor").value);
    const data_pagamento = $("cv-pagamento-data").value;

    if (!Number.isFinite(valor) || valor <= 0 || !data_pagamento) {
        mensagem("cv-mensagem-pagamento", "Confira os dados.", true);
        return;
    }

    const botao = $("cv-confirmar-pagamento");
    botao.disabled = true;

    try {
        const user_id = await obterUsuario();

        const { data, error } = await supabase
            .from("gastos")
            .update({
                status: "pago",
                valor,
                data_pagamento
            })
            .eq("id", id)
            .eq("user_id", user_id)
            .eq("status", "previsto")
            .select("id");

        if (error) throw error;
        if (!data?.length) {
            throw new Error("Esta conta já foi alterada ou não foi encontrada.");
        }

        $("cv-dialogo-pagamento").close();
        await carregarContas();

    } catch (erro) {
        console.error("Erro ao confirmar pagamento:", erro);
        mensagem("cv-mensagem-pagamento", erro.message, true);
    } finally {
        botao.disabled = false;
    }
}

async function editarConta(conta) {
    const descricao = prompt("Nome da conta:", conta.descricao);
    if (descricao === null) return;

    const nome = descricao.trim();
    if (!nome) return alert("Informe um nome válido.");

    const valorTexto = prompt(
        "Valor da conta:",
        String(conta.valor)
    );

    if (valorTexto === null) return;

    const valor = Number(valorTexto.replace(",", "."));

    if (!Number.isFinite(valor) || valor <= 0) {
        return alert("Informe um valor válido.");
    }

    const novaData = prompt(
        "Vencimento (AAAA-MM-DD):",
        conta.data
    );

    if (novaData === null) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData) ||
        dataISO(converterData(novaData)) !== novaData) {
        return alert("Data inválida.");
    }

    try {
        const user_id = await obterUsuario();

        const { error } = await supabase
            .from("gastos")
            .update({
                descricao: nome,
                valor,
                data: novaData
            })
            .eq("id", conta.id)
            .eq("user_id", user_id);

        if (error) throw error;

        await carregarContas();

    } catch (erro) {
        console.error("Erro ao editar conta:", erro);
        alert("Não foi possível editar a conta.");
    }
}

$("cv-form-cadastro").addEventListener("submit", cadastrarConta);
$("cv-form-pagamento").addEventListener("submit", confirmarPagamento);

$("cv-cancelar-pagamento").addEventListener("click", () => {
    $("cv-dialogo-pagamento").close();
});

$("cv-mes-anterior").addEventListener("click", () => {
    mesExibido = new Date(
        mesExibido.getFullYear(),
        mesExibido.getMonth() - 1,
        1
    );

    atualizarResumo();
    montarCalendario();
    mostrarSituacoes();
});

$("cv-proximo-mes").addEventListener("click", () => {
    mesExibido = new Date(
        mesExibido.getFullYear(),
        mesExibido.getMonth() + 1,
        1
    );

    atualizarResumo();
    montarCalendario();
    mostrarSituacoes();
});

// Habilita os controles preparados no HTML.
$("cv-salvar-conta").disabled = false;
$("cv-confirmar-pagamento").disabled = false;
$("cv-mes-anterior").disabled = false;
$("cv-proximo-mes").disabled = false;

// Não permitir recorrência que ainda não foi implementada.
const opcaoMensal = $(
    "cv-conta-recorrencia"
).querySelector('option[value="mensal"]');

if (opcaoMensal) {
    opcaoMensal.disabled = true;
    opcaoMensal.textContent = "Mensal (em desenvolvimento)";
}

carregarContas();
