
import { supabase } from "./supabase.js";

const $ = (id) => document.getElementById(id);

const moeda = (valor) =>
    Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

const categorias = {
    alimentacao: "Alimentação",
    moradia: "Moradia",
    transporte: "Transporte",
    saude: "Saúde",
    educacao: "Educação",
    lazer: "Lazer",
    dividas: "Dívidas",
    outros: "Outros"
};

let rendas = [];
let gastos = [];
let usuarioId = null;

const agora = new Date();
const anoAtual = agora.getFullYear();
const mesAtual = agora.getMonth();

function dataLocal(data) {
    if (!data) return null;

    const partes = data.slice(0, 10).split("-").map(Number);

    return new Date(partes[0], partes[1] - 1, partes[2]);
}

function pertenceAoMes(data, ano, mes) {
    const d = dataLocal(data);

    return d &&
        d.getFullYear() === ano &&
        d.getMonth() === mes;
}

function somar(lista) {
    return lista.reduce(
        (total, item) => total + Number(item.valor || 0),
        0
    );
}

function atualizarTexto(id, valor) {
    const elemento = $(id);

    if (elemento) elemento.textContent = valor;
}

function mostrarMensagem(id, texto) {
    const elemento = $(id);

    if (!elemento) return;

    elemento.textContent = texto;
    elemento.hidden = false;
}

function rendasDoMes(ano, mes) {
    return rendas.filter((r) =>
        pertenceAoMes(r.data, ano, mes) &&
        r.status === "recebido"
    );
}

function gastosDoMes(ano, mes) {
    return gastos.filter((g) =>
        pertenceAoMes(g.data, ano, mes) &&
        g.status === "pago"
    );
}

function atualizarBalanco() {
    const entradas = somar(rendasDoMes(anoAtual, mesAtual));
    const saidas = somar(gastosDoMes(anoAtual, mesAtual));
    const saldo = entradas - saidas;

    atualizarTexto("rf-total-renda", moeda(entradas));
    atualizarTexto("rf-total-gastos", moeda(saidas));
    atualizarTexto("rf-saldo-mes", moeda(saldo));

    atualizarTexto(
        "rf-estado-renda",
        entradas > 0
            ? "Recebimentos confirmados neste mês."
            : "Nenhum recebimento registrado neste mês."
    );

    atualizarTexto(
        "rf-estado-gastos",
        saidas > 0
            ? "Despesas pagas neste mês."
            : "Nenhuma despesa paga neste mês."
    );

    atualizarTexto(
        "rf-estado-saldo",
        saldo > 0
            ? "Você terminou o balanço positivo."
            : saldo < 0
                ? "Seus gastos ultrapassaram suas entradas."
                : "Suas entradas e saídas estão equilibradas."
    );

    return { entradas, saidas, saldo };
}

function atualizarCategorias() {
    const despesas = gastosDoMes(anoAtual, mesAtual);
    const total = somar(despesas);

    const lista = $("rf-lista-categorias");
    const dados = $("rf-categorias-dados");
    const vazio = $("rf-categorias-vazio");
    const graficoVazio = $("rf-grafico-vazio");
    const grafico = $("rf-grafico-real");

    lista.replaceChildren();

    if (total <= 0) {
        dados.hidden = true;
        vazio.hidden = false;
        graficoVazio.hidden = false;
        grafico.hidden = true;
        return;
    }

    const agrupados = {};

    for (const gasto of despesas) {
        const categoria = gasto.categoria || "outros";

        agrupados[categoria] =
            (agrupados[categoria] || 0) + Number(gasto.valor);
    }

    const cores = [
        "#178653",
        "#76b995",
        "#d6a44b",
        "#657cbb",
        "#b96f6f",
        "#8a77a8",
        "#74a8aa",
        "#a0a0a0"
    ];

    const grupos = Object.entries(agrupados)
        .sort((a, b) => b[1] - a[1]);

    const partesGrafico = [];
    let inicio = 0;

    grupos.forEach(([categoria, valor], indice) => {
        const percentual = (valor / total) * 100;
        const fim = inicio + percentual;
        const cor = cores[indice % cores.length];

        const item = document.createElement("li");

        item.textContent =
            `${categorias[categoria] || categoria}: ` +
            `${moeda(valor)} (${percentual.toFixed(1)}%)`;

        lista.appendChild(item);

        partesGrafico.push(
            `${cor} ${inicio}% ${fim}%`
        );

        inicio = fim;
    });

    grafico.replaceChildren();

    const anel = document.createElement("div");

    anel.style.width = "190px";
    anel.style.height = "190px";
    anel.style.borderRadius = "50%";
    anel.style.margin = "auto";
    anel.style.background =
        `conic-gradient(${partesGrafico.join(", ")})`;

    anel.setAttribute("aria-hidden", "true");

    grafico.appendChild(anel);

    dados.hidden = false;
    vazio.hidden = true;
    graficoVazio.hidden = true;
    grafico.hidden = false;
}

function atualizarContas() {
    const contas = gastos
        .filter((g) => g.status === "previsto")
        .sort((a, b) => a.data.localeCompare(b.data))
        .slice(0, 5);

    const lista = $("rf-contas-lista");
    const vazio = $("rf-contas-vazio");

    lista.replaceChildren();

    if (!contas.length) {
        lista.hidden = true;
        vazio.hidden = false;
        return;
    }

    for (const conta of contas) {
        const item = document.createElement("li");

        const data = dataLocal(conta.data)
            .toLocaleDateString("pt-BR");

        item.textContent =
            `${conta.descricao} — ${moeda(conta.valor)} — ${data}`;

        lista.appendChild(item);
    }

    lista.hidden = false;
    vazio.hidden = true;
}

function atualizarComparacao() {
    const anterior = new Date(anoAtual, mesAtual - 1, 1);

    const nomeMes = (data) =>
        data.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric"
        });

    atualizarTexto("rf-mes-anterior", nomeMes(anterior));
    atualizarTexto("rf-mes-atual", nomeMes(agora));

    const entradasAnteriores = somar(
        rendasDoMes(anterior.getFullYear(), anterior.getMonth())
    );

    const gastosAnteriores = somar(
        gastosDoMes(anterior.getFullYear(), anterior.getMonth())
    );

    const entradasAtuais = somar(rendasDoMes(anoAtual, mesAtual));
    const gastosAtuais = somar(gastosDoMes(anoAtual, mesAtual));

    atualizarTexto(
        "rf-dados-anterior",
        `Saldo: ${moeda(entradasAnteriores - gastosAnteriores)}`
    );

    atualizarTexto(
        "rf-dados-atual",
        `Saldo: ${moeda(entradasAtuais - gastosAtuais)}`
    );
}

function atualizarAnalise({ entradas, saidas, saldo }) {
    let texto;

    if (entradas === 0 && saidas === 0) {
        texto = "Registre seus recebimentos e despesas para acompanhar seu mês.";
    } else if (saldo > 0) {
        texto =
            `Neste mês, entraram ${moeda(entradas)} e saíram ` +
            `${moeda(saidas)}. Seu saldo está positivo em ${moeda(saldo)}.`;
    } else if (saldo < 0) {
        texto =
            `Neste mês, seus gastos superaram as entradas em ` +
            `${moeda(Math.abs(saldo))}. Vale revisar suas despesas.`;
    } else {
        texto =
            "Suas entradas e saídas estão equilibradas neste mês.";
    }

    atualizarTexto("rf-texto-analise", texto);
}

function atualizarTela() {
    const periodo = agora.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });

    atualizarTexto("rf-periodo-atual", periodo);

    const balanco = atualizarBalanco();

    atualizarCategorias();
    atualizarContas();
    atualizarComparacao();
    atualizarAnalise(balanco);
}

async function carregarDados() {
    const { data: usuario, error: erroAuth } =
        await supabase.auth.getUser();

    if (erroAuth || !usuario.user) {
        throw new Error("Usuário não autenticado.");
    }

    usuarioId = usuario.user.id;

    const [respostaRendas, respostaGastos] = await Promise.all([
        supabase
            .from("rendas")
            .select("*")
            .eq("user_id", usuarioId),

        supabase
            .from("gastos")
            .select("*")
            .eq("user_id", usuarioId)
    ]);

    if (respostaRendas.error) throw respostaRendas.error;
    if (respostaGastos.error) throw respostaGastos.error;

    rendas = respostaRendas.data || [];
    gastos = respostaGastos.data || [];

    atualizarTela();
}

async function registrarRenda() {
    const descricao = $("rf-renda-descricao").value.trim();
    const valor = Number($("rf-renda-valor").value);
    const data = $("rf-renda-data").value;

    if (!descricao || !Number.isFinite(valor) || valor <= 0 || !data) {
        mostrarMensagem(
            "rf-mensagem-renda",
            "Preencha todos os campos corretamente."
        );
        return;
    }

    const botao = $("rf-salvar-renda");
    botao.disabled = true;

    try {
        const { error } = await supabase
            .from("rendas")
            .insert({
                user_id: usuarioId,
                descricao: descricao,
               tipo: "variavel",
                valor: valor,
                data: data,
                status: "recebido",
                data_recebimento: data
            });

        if (error) throw error;

        $("rf-form-renda").reset();

        await carregarDados();

        mostrarMensagem(
            "rf-mensagem-renda",
            "Renda registrada com sucesso!"
        );

    } catch (erro) {
        console.error("Erro ao registrar renda:", erro);

        mostrarMensagem(
            "rf-mensagem-renda",
            "Não foi possível registrar a renda."
        );

    } finally {
        botao.disabled = false;
    }
}


async function registrarGasto() {
    const descricao = $("rf-gasto-descricao").value.trim();
    const valor = Number($("rf-gasto-valor").value);
    const categoria = $("rf-gasto-categoria").value;
    const data = $("rf-gasto-data").value;

    if (!descricao || valor <= 0 || !categoria || !data) {
        mostrarMensagem(
            "rf-mensagem-gasto",
            "Preencha todos os campos corretamente."
        );
        return;
    }

    const botao = $("rf-salvar-gasto");
    botao.disabled = true;

    try {
        const { error } = await supabase
            .from("gastos")
            .insert({
                user_id: usuarioId,
                descricao,
                valor,
                categoria,
                data,
                status: "pago",
                tipo: "variavel",
                prioridade: "ocasional",
                data_pagamento: data
            });

        if (error) throw error;

        $("rf-form-gasto").reset();

        await carregarDados();

        mostrarMensagem(
            "rf-mensagem-gasto",
            "Gasto registrado com sucesso!"
        );
    } catch (erro) {
        console.error("ERRO SUPABASE:", erro);

        mostrarMensagem(
            "rf-mensagem-renda",
            erro.message || "Não foi possível registrar a renda."
        );
    }
    
}

$("rf-salvar-gasto").addEventListener("click", registrarGasto);

$("rf-form-gasto").addEventListener("submit", (event) => {
    event.preventDefault();
    registrarGasto();
});

$("rf-salvar-renda").addEventListener("click", registrarRenda);

$("rf-form-renda").addEventListener("submit", (event) => {
    event.preventDefault();
    registrarRenda();
});


carregarDados().catch((erro) => {
    console.error("Erro no resumo financeiro:", erro);
    alert("Não foi possível carregar os dados financeiros.");
});
