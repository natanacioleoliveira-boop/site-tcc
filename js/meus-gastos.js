
import { supabase } from "./supabase.js";

// BASE 6 — MEUS GASTOS

const $ = (id) => document.getElementById(id);

const moeda = (valor) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(Number(valor) || 0);

const categorias = {
    alimentacao: "Alimentação",
    moradia: "Moradia",
    transporte: "Transporte",
    saude: "Saúde",
    educacao: "Educação",
    lazer: "Lazer",
    dividas: "Dívidas e parcelas",
    outros: "Outros"
};

const dataBR = (data) =>
    data ? data.split("-").reverse().join("/") : "—";

function hojeLocal() {
    const agora = new Date();

    return `${agora.getFullYear()}-${String(
        agora.getMonth() + 1
    ).padStart(2, "0")}-${String(
        agora.getDate()
    ).padStart(2, "0")}`;
}

const mesAtual = () => hojeLocal().slice(0, 7);

let gastos = [];
let usuarioId = null;

// =====================================
// MENSAGENS
// =====================================

function mensagem(id, texto, erro = false) {
    const elemento = $(id);

    if (!elemento) return;

    elemento.textContent = texto;
    elemento.hidden = !texto;
    elemento.style.color = erro ? "#b42318" : "#147d52";
}

// =====================================
// AUTENTICAÇÃO
// =====================================

async function obterUsuario() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        throw new Error(
            "Sessão expirada. Faça login novamente."
        );
    }

    usuarioId = data.user.id;
    return usuarioId;
}

// =====================================
// DADOS DOS FORMULÁRIOS
// =====================================

function dadosFormulario(prefixo) {
    const descricao = $(`${prefixo}-descricao`).value.trim();
    const valor = Number($(`${prefixo}-valor`).value);
    const categoria = $(`${prefixo}-categoria`).value;
    const tipo = $(`${prefixo}-tipo`).value;
    const data = $(`${prefixo}-data`).value;

    const prioridade = prefixo === "pago"
        ? ($("pago-prioridade").value || null)
        : null;

    if (
        !descricao ||
        !Number.isFinite(valor) ||
        valor <= 0 ||
        !categorias[categoria] ||
        !["fixo", "variavel"].includes(tipo) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data)
    ) {
        throw new Error(
            "Confira a descrição, categoria, tipo, valor e data."
        );
    }

    return {
        descricao,
        valor,
        categoria,
        tipo,
        data,
        prioridade
    };
}

// =====================================
// CADASTRAR GASTOS
// =====================================

async function registrar(prefixo) {
    const ehPago = prefixo === "pago";

    const form = $(
        ehPago ? "form-gasto-pago" : "form-conta-pendente"
    );

    const botao = $(
        ehPago ? "salvar-gasto-pago" : "salvar-conta-pendente"
    );

    const msgId = ehPago
        ? "mensagem-gasto-pago"
        : "mensagem-conta-pendente";

    if (!form.reportValidity()) return;

    botao.disabled = true;
    mensagem(msgId, "Salvando...");

    try {
        const user_id = await obterUsuario();

        const dados = dadosFormulario(
            ehPago ? "pago" : "pendente"
        );

        const { error } = await supabase
            .from("gastos")
            .insert({
                ...dados,
                user_id,
                status: ehPago ? "pago" : "previsto",
                data_pagamento: ehPago ? dados.data : null
            });

        if (error) throw error;

        form.reset();

        mensagem(
            msgId,
            ehPago
                ? "Gasto salvo com sucesso!"
                : "Conta prevista salva com sucesso!"
        );

        await carregarGastos();

    } catch (erro) {
        console.error("Erro ao salvar gasto:", erro);

        mensagem(
            msgId,
            erro.message || "Não foi possível salvar.",
            true
        );

    } finally {
        botao.disabled = false;
    }
}

async function carregarParcelamentos() {
    try {
        const user_id = await obterUsuario();

        const { data, error } = await supabase
            .from("compras_parceladas")
            .select("*")
            .eq("user_id", user_id)
            .order("primeiro_vencimento", {
                ascending: true
            });

        if (error) throw error;

        const lista = $("gastos-parcelas-lista");
        const vazio = $("gastos-parcelas-vazio");

        lista.replaceChildren();

        if (!data || data.length === 0) {
            lista.hidden = true;
            vazio.hidden = false;
            return;
        }

        lista.hidden = false;
        vazio.hidden = true;

        for (const compra of data) {
            const parcelas = gastos.filter(
                gasto =>
                    gasto.compra_parcelada_id === compra.id
            );

            const pagas = parcelas.filter(
                gasto => gasto.status === "pago"
            );

            const pendentes = parcelas.filter(
                gasto => gasto.status === "previsto"
            );

            const totalPendente = pendentes.reduce(
                (total, gasto) =>
                    total + Number(gasto.valor),
                0
            );

            const item = document.createElement("li");

            const titulo = document.createElement("strong");
            titulo.textContent = compra.descricao;

            const detalhes = document.createElement("p");
            detalhes.textContent =
                `${pagas.length} de ${compra.quantidade} parcelas pagas`;

            const valor = document.createElement("p");
            valor.textContent =
                `Valor total: ${moeda(compra.valor_total)}`;

            const restante = document.createElement("p");
            restante.textContent =
                `Falta pagar: ${moeda(totalPendente)}`;


            const botaoExcluir = document.createElement("button");

            botaoExcluir.type = "button";
            botaoExcluir.textContent = "Excluir compra";
            botaoExcluir.className = "gastos-acao";

            botaoExcluir.addEventListener("click", async function () {
                botaoExcluir.disabled = true;

                try {
                    await excluirCompraParcelada(compra);
                } finally {
                    botaoExcluir.disabled = false;
                }
            });

            item.append(
                titulo,
                detalhes,
                valor,
                restante,
                botaoExcluir
            );


            lista.appendChild(item);
        }

    } catch (erro) {
        console.error(
            "Erro ao carregar parcelamentos:",
            erro
        );
    }
}

async function excluirCompraParcelada(compra) {

    const confirmou = confirm(
        `Deseja excluir a compra "${compra.descricao}" e todas as suas parcelas?`
    );

    if (!confirmou) return;

    try {
        const user_id = await obterUsuario();

        const { data, error } = await supabase
            .from("compras_parceladas")
            .delete()
            .eq("id", compra.id)
            .eq("user_id", user_id)
            .select("id");

        if (error) throw error;

        if (!data || data.length !== 1) {
            throw new Error("A compra não foi excluída.");
        }

        await carregarGastos();

        alert("Compra parcelada excluída com sucesso!");

    } catch (erro) {
        console.error("Erro ao excluir compra:", erro);
        alert("Não foi possível excluir a compra parcelada.");
    }
}

// =====================================
// CARREGAR GASTOS DO SUPABASE
// =====================================

async function carregarGastos() {
    try {
        const user_id = await obterUsuario();

        const { data, error } = await supabase
            .from("gastos")
            .select(
                "id,user_id,descricao,categoria,tipo,valor,data,status,data_pagamento,prioridade,compra_parcelada_id,numero_parcela,total_parcelas"
            )
            .eq("user_id", user_id)
            .order("data", { ascending: false });

        if (error) throw error;

        gastos = data || [];

        atualizarIndicadores();
        mostrarHistorico();
        mostrarCategorias();
        await carregarParcelamentos();


    } catch (erro) {
        console.error("Erro ao carregar gastos:", erro);

        alert(
            erro.message || "Não foi possível carregar os gastos."
        );
    }
}

// =====================================
// INDICADORES FINANCEIROS
// =====================================

function atualizarIndicadores() {
    const mes = mesAtual();

    const pagosMes = gastos.filter(g =>
        g.status === "pago" &&
        (g.data_pagamento || g.data || "").slice(0, 7) === mes
    );

    const soma = (lista) =>
        lista.reduce(
            (total, g) => total + Number(g.valor),
            0
        );

    $("gastos-total-pago").textContent = moeda(
        soma(pagosMes)
    );

    $("gastos-total-fixos").textContent = moeda(
        soma(pagosMes.filter(g => g.tipo === "fixo"))
    );

    $("gastos-total-variaveis").textContent = moeda(
        soma(pagosMes.filter(g => g.tipo === "variavel"))
    );

    $("gastos-total-pendente").textContent = moeda(
        soma(gastos.filter(g => g.status === "previsto"))
    );

    $("gastos-periodo").textContent =
        new Intl.DateTimeFormat("pt-BR", {
            month: "long",
            year: "numeric"
        }).format(new Date());
}

// =====================================
// ELEMENTOS DO HISTÓRICO
// =====================================

function celula(tr, texto) {
    const td = document.createElement("td");

    td.textContent = texto;
    tr.appendChild(td);

    return td;
}

function botaoAcao(texto, acao) {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.textContent = texto;
    botao.className = "gastos-acao";

    botao.addEventListener("click", async () => {
        botao.disabled = true;

        try {
            await acao();
        } finally {
            botao.disabled = false;
        }
    });

    return botao;
}

// =====================================
// MOSTRAR HISTÓRICO
// =====================================

function mostrarHistorico() {
    const corpo = $("gastos-historico-corpo");

    corpo.replaceChildren();

    const categoria = $("filtro-categoria").value;
    const situacao = $("filtro-situacao").value;

    const filtrados = gastos.filter(g =>
        (categoria === "todas" || g.categoria === categoria) &&
        (
            situacao === "todas" ||
            (
                situacao === "pendente"
                    ? g.status === "previsto"
                    : g.status === situacao
            )
        )
    );

    if (!filtrados.length) {
        const tr = document.createElement("tr");
        const td = celula(tr, "Nenhum gasto encontrado.");

        td.colSpan = 6;
        td.className = "gastos-tabela-vazia";

        corpo.appendChild(tr);
        return;
    }

    for (const gasto of filtrados) {
        const tr = document.createElement("tr");

        celula(tr, gasto.descricao);
        celula(
            tr,
            categorias[gasto.categoria] || gasto.categoria
        );
        celula(tr, dataBR(gasto.data));
        celula(tr, moeda(gasto.valor));
        celula(
            tr,
            gasto.status === "pago" ? "Pago" : "Pendente"
        );

        const acoes = celula(tr, "");

        if (gasto.status === "previsto") {
            acoes.appendChild(
                botaoAcao(
                    "Marcar como pago",
                    () => marcarComoPago(gasto)
                )
            );
        }
        if (!gasto.compra_parcelada_id) {
            acoes.appendChild(
                botaoAcao("Editar", () => editarGasto(gasto))
            );

            acoes.appendChild(
                botaoAcao("Excluir", () => excluirGasto(gasto))
            );
        }

        corpo.appendChild(tr);
    }
}

// =====================================
// ATUALIZAR REGISTRO NO SUPABASE
// =====================================

async function atualizarRegistro(gasto, alteracoes) {
    try {
        const user_id = await obterUsuario();

        const { data, error } = await supabase
            .from("gastos")
            .update(alteracoes)
            .eq("id", gasto.id)
            .eq("user_id", user_id)
            .eq("status", gasto.status)
            .select("id");

        if (error) throw error;

        if (data?.length !== 1) {
            throw new Error(
                "Registro não atualizado. Confira as permissões."
            );
        }

        await carregarGastos();
        return true;

    } catch (erro) {
        console.error("Erro ao atualizar gasto:", erro);

        alert(
            erro.message || "Não foi possível atualizar o gasto."
        );

        return false;
    }
}

// =====================================
// MARCAR CONTA COMO PAGA
// =====================================

async function marcarComoPago(gasto) {
    if (
        !confirm(
            `Marcar "${gasto.descricao}" como pago hoje?`
        )
    ) return;

    const sucesso = await atualizarRegistro(gasto, {
        status: "pago",
        data_pagamento: hojeLocal()
    });

    if (sucesso) {
        alert("Pagamento registrado!");
    }
}

// =====================================
// EDITAR GASTO
// =====================================

async function editarGasto(gasto) {
    const descricaoInput = prompt(
        "Descrição:",
        gasto.descricao
    );

    if (descricaoInput === null) return;

    const valorInput = prompt(
        "Valor (R$):",
        gasto.valor
    );

    if (valorInput === null) return;

    const categoriaInput = prompt(
        `Categoria (${Object.keys(categorias).join(", ")}):`,
        gasto.categoria
    );

    if (categoriaInput === null) return;

    const tipoInput = prompt(
        "Tipo (fixo ou variavel):",
        gasto.tipo
    );

    if (tipoInput === null) return;

    const dataInput = prompt(
        "Data (AAAA-MM-DD):",
        gasto.data
    );

    if (dataInput === null) return;

    const descricao = descricaoInput.trim();
    const valor = Number(
        valorInput.trim().replace(",", ".")
    );

    const categoria = categoriaInput.trim().toLowerCase();
    const tipo = tipoInput.trim().toLowerCase();
    const data = dataInput.trim();

    const dataValida =
        /^\d{4}-\d{2}-\d{2}$/.test(data) &&
        !Number.isNaN(new Date(data).getTime()) &&
        new Date(data).toISOString().slice(0, 10) === data;

    if (
        !descricao ||
        !Number.isFinite(valor) ||
        valor <= 0 ||
        !categorias[categoria] ||
        !["fixo", "variavel"].includes(tipo) ||
        !dataValida
    ) {
        alert(
            "Dados inválidos. Nenhuma alteração foi salva."
        );
        return;
    }

    const alteracoes = {
        descricao,
        valor,
        categoria,
        tipo,
        data
    };

    if (gasto.status === "pago") {
        alteracoes.data_pagamento = data;
    }

    const sucesso = await atualizarRegistro(
        gasto,
        alteracoes
    );

    if (sucesso) {
        alert("Gasto atualizado!");
    }
}

// =====================================
// EXCLUIR GASTO
// =====================================

async function excluirGasto(gasto) {
    const confirmou = confirm(
        `Excluir definitivamente "${gasto.descricao}" (${moeda(gasto.valor)})?`
    );

    if (!confirmou) return;

    try {
        const user_id = await obterUsuario();

        const { data, error } = await supabase
            .from("gastos")
            .delete()
            .eq("id", gasto.id)
            .eq("user_id", user_id)
            .eq("status", gasto.status)
            .select("id");

        if (error) throw error;

        if (data?.length !== 1) {
            throw new Error(
                "Registro não excluído. Confira as permissões."
            );
        }

        await carregarGastos();

        alert("Gasto excluído!");

    } catch (erro) {
        console.error("Erro ao excluir gasto:", erro);

        alert(
            erro.message || "Não foi possível excluir o gasto."
        );
    }
}

// =====================================
// GASTOS POR CATEGORIA
// =====================================

function mostrarCategorias() {
    const mes = mesAtual();

    const pagos = gastos.filter(g =>
        g.status === "pago" &&
        (g.data_pagamento || g.data || "").slice(0, 7) === mes
    );

    const valores = {};

    for (const gasto of pagos) {
        valores[gasto.categoria] =
            (valores[gasto.categoria] || 0) +
            Number(gasto.valor);
    }

    const itens = Object.entries(valores)
        .sort((a, b) => b[1] - a[1]);

    const vazio = $("gastos-grafico-vazio");
    const grafico = $("gastos-grafico-real");
    const lista = $("gastos-categorias-valores");
    const aviso = $("gastos-categorias-vazio");

    lista.replaceChildren();

    vazio.hidden = itens.length > 0;
    grafico.hidden = itens.length === 0;
    lista.hidden = itens.length === 0;
    aviso.hidden = itens.length > 0;

    if (!itens.length) {
        grafico.replaceChildren();
        return;
    }

    const total = itens.reduce(
        (s, [, v]) => s + v,
        0
    );

    const cores = [
        "#147d52",
        "#38a169",
        "#9bd8b5",
        "#b7a35b",
        "#6b9f89",
        "#8cbb99",
        "#c5d9ce",
        "#557b69"
    ];

    let acumulado = 0;

    const fatias = itens.map(([, valor], i) => {
        const inicio = acumulado;

        acumulado += valor / total * 100;

        return `${cores[i % cores.length]} ${inicio}% ${acumulado}%`;
    });

    grafico.style.width = "180px";
    grafico.style.height = "180px";
    grafico.style.borderRadius = "50%";
    grafico.style.background =
        `conic-gradient(${fatias.join(", ")})`;

    grafico.setAttribute("role", "img");

    grafico.setAttribute(
        "aria-label",
        "Distribuição de gastos pagos neste mês por categoria. Confira os valores na lista."
    );

    for (const [categoria, valor] of itens) {
        const li = document.createElement("li");

        li.textContent =
            `${categorias[categoria] || categoria}: ` +
            `${moeda(valor)} ` +
            `(${(valor / total * 100).toFixed(1).replace(".", ",")}%)`;

        lista.appendChild(li);
    }
}

// =====================================
// EVENTOS DOS FORMULÁRIOS
// =====================================

$("salvar-gasto-pago").addEventListener(
    "click",
    () => registrar("pago")
);

$("salvar-conta-pendente").addEventListener(
    "click",
    () => registrar("pendente")
);

$("form-gasto-pago").addEventListener(
    "submit",
    e => {
        e.preventDefault();
        registrar("pago");
    }
);

$("form-conta-pendente").addEventListener(
    "submit",
    e => {
        e.preventDefault();
        registrar("pendente");
    }
);

// =====================================
// FILTROS
// =====================================

$("filtro-categoria").addEventListener(
    "change",
    mostrarHistorico
);

$("filtro-situacao").addEventListener(
    "change",
    mostrarHistorico
);

$("gastos-form-filtros").addEventListener(
    "submit",
    e => e.preventDefault()
);

// =====================================
// COMPRAS PARCELADAS — PRÓXIMA ETAPA
// =====================================


$("salvar-compra-parcelada").addEventListener(
    "click",
    registrarCompraParcelada
);

$("form-compra-parcelada").addEventListener(
    "submit",
    function (event) {
        event.preventDefault();
        registrarCompraParcelada();
    }
);

async function registrarCompraParcelada() {
    const formulario = $("form-compra-parcelada");
    const botao = $("salvar-compra-parcelada");

    if (!formulario.reportValidity()) return;

    const descricao = $("parcela-descricao").value.trim();
    const valorTotal = Number($("parcela-total").value);
    const quantidade = Number($("parcela-quantidade").value);
    const primeiroVencimento =
        $("parcela-primeiro-vencimento").value;

    if (
        !descricao ||
        !Number.isFinite(valorTotal) ||
        valorTotal <= 0 ||
        Math.round(valorTotal * 100) < quantidade ||
        !Number.isInteger(quantidade) ||
        quantidade < 2 ||
        quantidade > 120 ||
        !primeiroVencimento
    ) {
        mensagem(
            "mensagem-parcelamento",
            "Confira os dados da compra.",
            true
        );
        return;
    }

    botao.disabled = true;
    mensagem("mensagem-parcelamento", "Salvando parcelas...");

    try {
        await obterUsuario();

        const { data, error } = await supabase.rpc(
            "criar_compra_parcelada",
            {
                p_descricao: descricao,
                p_valor_total: valorTotal,
                p_quantidade: quantidade,
                p_primeiro_vencimento: primeiroVencimento
            }
        );

        if (error) throw error;

        console.log("Compra cadastrada:", data);

        formulario.reset();

        await carregarGastos();
        await carregarParcelamentos();

        mensagem(
            "mensagem-parcelamento",
            "Compra parcelada cadastrada com sucesso!"
        );

    } catch (erro) {
        console.error("Erro ao cadastrar parcelas:", erro);

        mensagem(
            "mensagem-parcelamento",
            erro.message || "Erro ao salvar compra.",
            true
        );

    } finally {
        botao.disabled = false;
    }
}


// =====================================
// COLUNA DE AÇÕES
// =====================================

const cabecalhoHistorico = document.querySelector(
    ".gastos-tabela thead tr"
);

if (
    cabecalhoHistorico &&
    cabecalhoHistorico.children.length === 5
) {
    const th = document.createElement("th");

    th.scope = "col";
    th.textContent = "Ações";

    cabecalhoHistorico.appendChild(th);
}

// =====================================
// INICIALIZAÇÃO
// =====================================

carregarGastos();
