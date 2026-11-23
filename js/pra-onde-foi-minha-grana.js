
import { supabase } from "./supabase.js";

const $ = (id) => document.getElementById(id);

const moeda = (valor) =>
    Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

const hoje = new Date();
const ano = hoje.getFullYear();
const mes = hoje.getMonth();

function dataLocal(valor) {
    if (!valor) return null;

    const [a, m, d] = valor.slice(0, 10).split("-").map(Number);
    return new Date(a, m - 1, d);
}

function noMes(data) {
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

function texto(id, valor) {
    const elemento = $(id);
    if (elemento) elemento.textContent = valor;
}

function criarElemento(tag, conteudo, classe = "") {
    const elemento = document.createElement(tag);
    elemento.textContent = conteudo;

    if (classe) elemento.className = classe;

    return elemento;
}

function atualizarIndicadores(rendas, gastos) {
    const recebidas = rendas.filter(
        (r) => r.status === "recebido" && noMes(r.data)
    );

    const pagos = gastos.filter(
        (g) => g.status === "pago" && noMes(g.data)
    );

    const pendentes = gastos.filter(
        (g) => g.status === "previsto" && noMes(g.data)
    );

    const recebido = somar(recebidas);
    const pago = somar(pagos);
    const pendente = somar(pendentes);

    // Não contamos rendas previstas como dinheiro disponível.
    const resultado = recebido - pago - pendente;

    texto("diagnostico-renda", moeda(recebido));
    texto("diagnostico-pago", moeda(pago));
    texto("diagnostico-pendente", moeda(pendente));
    texto("diagnostico-resultado-valor", moeda(resultado));

    texto(
        "diagnostico-periodo",
        hoje.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric"
        })
    );

    return {
        recebido,
        pago,
        pendente,
        resultado,
        quantidade: recebidas.length + pagos.length + pendentes.length
    };
}

function atualizarResultado(dados) {
    const vazio = $("diagnostico-resultado-vazio");
    const conteudo = $("diagnostico-resultado-texto");

    if (dados.quantidade === 0) {
        vazio.hidden = false;
        conteudo.hidden = true;
        return;
    }

    let mensagem = "";

    if (dados.resultado < 0) {
        mensagem =
            `Seus recebimentos somam ${moeda(dados.recebido)}, ` +
            `mas os gastos pagos e pendentes chegam a ` +
            `${moeda(dados.pago + dados.pendente)}. ` +
            `Se todos os compromissos forem pagos, ` +
            `faltariam ${moeda(Math.abs(dados.resultado))}. ` +
            `Vale revisar os vencimentos e suas prioridades.`;

    } else if (dados.resultado === 0) {
        mensagem =
            "Considerando os recebimentos e os gastos registrados, " +
            "seu orçamento está equilibrado. " +
            "Continue acompanhando seus compromissos.";

    } else {
        mensagem =
            `Você recebeu ${moeda(dados.recebido)} e já pagou ` +
            `${moeda(dados.pago)}. Ainda existem ` +
            `${moeda(dados.pendente)} em compromissos deste mês. ` +
            `Após esses pagamentos, sobrariam ${moeda(dados.resultado)}.`;
    }

    conteudo.textContent = mensagem;
    vazio.hidden = true;
    conteudo.hidden = false;
}

function atualizarLinhaTempo(rendas, gastos) {
    const lista = $("linha-tempo-movimentacoes");
    const vazio = $("tempo-sem-dados");

    const movimentacoes = [];

    for (const renda of rendas) {
        if (!noMes(renda.data)) continue;

        movimentacoes.push({
            data: renda.data,
            descricao: renda.descricao,
            valor: renda.valor,
            tipo: renda.status === "recebido"
                ? "Renda recebida"
                : "Renda prevista"
        });
    }

    for (const gasto of gastos) {
        if (!noMes(gasto.data)) continue;

        movimentacoes.push({
            data: gasto.data,
            descricao: gasto.descricao,
            valor: gasto.valor,
            tipo: gasto.status === "pago"
                ? "Gasto pago"
                : "Conta pendente"
        });
    }

    movimentacoes.sort((a, b) =>
        a.data.localeCompare(b.data)
    );

    let saldoAcumulado = 0;
    lista.replaceChildren();

    if (movimentacoes.length === 0) {
        lista.hidden = true;
        vazio.hidden = false;
        return;
    }

    for (const mov of movimentacoes) {
        const item = document.createElement("li");

        if (mov.tipo === "Renda recebida") {
            saldoAcumulado += Number(mov.valor);
            item.classList.add("tempo-entrada");

        } else if (mov.tipo === "Gasto pago") {
            saldoAcumulado -= Number(mov.valor);

            if (saldoAcumulado < 0) {
                item.classList.add("tempo-aperto");
            } else {
                item.classList.add("tempo-saida");
            }

        } else if (mov.tipo === "Conta pendente") {
            item.classList.add("tempo-pendente");
        }


        const data = dataLocal(mov.data)
            .toLocaleDateString("pt-BR");

        const titulo = criarElemento(
            "strong",
            `${data} — ${mov.tipo}`
        );

        const detalhe = criarElemento(
            "p",
            `${mov.descricao}: ${moeda(mov.valor)}`
        );

        item.append(titulo, detalhe);
        lista.appendChild(item);
    }

    lista.hidden = false;
    vazio.hidden = true;
}

function atualizarFatores(rendas, gastos, dados) {
    const exemplos = $("diagnostico-fatores-exemplos");
    const reais = $("diagnostico-fatores-reais");
    const lista = $("diagnostico-fatores-lista");

    lista.replaceChildren();

    const fatores = [];

    const despesasEssenciais = gastos.filter(
        (g) =>
            noMes(g.data) &&
            ["alimentacao", "moradia", "saude", "transporte"]
                .includes(g.categoria)
    );

    const totalEssencial = somar(despesasEssenciais);

    if (dados.recebido > 0 &&
        totalEssencial > dados.recebido * 0.5) {

        fatores.push({
            titulo: "Despesas essenciais",
            descricao:
                `Seus gastos essenciais registrados representam ` +
                `${((totalEssencial / dados.recebido) * 100).toFixed(1)}% ` +
                `da renda recebida neste mês.`
        });
    }

    if (dados.pendente > 0) {
        fatores.push({
            titulo: "Contas ainda pendentes",
            descricao:
                `Você possui ${moeda(dados.pendente)} ` +
                `em compromissos com vencimento neste mês.`
        });
    }

    const rendasVariaveis = rendas.filter(
        (r) => noMes(r.data) && r.tipo === "variavel"
    );

    if (rendasVariaveis.length > 0) {
        fatores.push({
            titulo: "Renda variável",
            descricao:
                "Você possui registros de renda variável. " +
                "Vale considerar possíveis mudanças nos recebimentos " +
                "ao planejar os próximos meses."
        });
    }

    if (dados.resultado < 0) {
        fatores.push({
            titulo: "Orçamento pressionado",
            descricao:
                "Os gastos pagos e previstos deste mês " +
                "superam os recebimentos confirmados."
        });
    }

    if (fatores.length === 0) {
        exemplos.hidden = false;
        reais.hidden = true;
        return;
    }

    fatores.forEach((fator, indice) => {
        const artigo = document.createElement("article");
        artigo.className = "fator";

        const numero = criarElemento(
            "span",
            String(indice + 1).padStart(2, "0"),
            "fator-numero"
        );

        const titulo = criarElemento("h3", fator.titulo);
        const descricao = criarElemento("p", fator.descricao);

        artigo.append(numero, titulo, descricao);
        lista.appendChild(artigo);
    });

    exemplos.hidden = true;
    reais.hidden = false;
}

async function carregarDiagnostico() {
    try {
        const { data: usuarioData, error: erroAuth } =
            await supabase.auth.getUser();

        if (erroAuth || !usuarioData.user) {
            throw new Error("Usuário não autenticado.");
        }

        const user_id = usuarioData.user.id;

        const [respostaRendas, respostaGastos] = await Promise.all([
            supabase
                .from("rendas")
                .select("*")
                .eq("user_id", user_id),

            supabase
                .from("gastos")
                .select("*")
                .eq("user_id", user_id)
        ]);

        if (respostaRendas.error) throw respostaRendas.error;
        if (respostaGastos.error) throw respostaGastos.error;

        const rendas = respostaRendas.data || [];
        const gastos = respostaGastos.data || [];

        const dados = atualizarIndicadores(rendas, gastos);

        atualizarResultado(dados);
        atualizarLinhaTempo(rendas, gastos);
        atualizarFatores(rendas, gastos, dados);

    } catch (erro) {
        console.error("Erro no diagnóstico financeiro:", erro);
        alert("Não foi possível carregar o diagnóstico financeiro.");
    }
}

carregarDiagnostico();
