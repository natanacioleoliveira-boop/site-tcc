
import { supabase } from "./supabase.js";

// ==========================================
// 1. ELEMENTOS DO HTML
// ==========================================

const formulario = document.querySelector("#form-renda-recebida");
const mensagem = document.querySelector("#mensagem-renda-recebida");
const botaoSalvar = document.querySelector("#salvar-renda-recebida");

const totalRecebidoElemento = document.querySelector("#renda-total-recebido");
const totalFixoElemento = document.querySelector("#renda-total-fixa");
const totalVariavelElemento = document.querySelector("#renda-total-variavel");
const periodoElemento = document.querySelector("#renda-periodo");

// ==========================================
// 2. FORMATAR VALORES EM REAIS
// ==========================================

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function mostrarHistorico(rendas) {

    const corpoTabela = document.querySelector("#renda-historico-corpo");

    // Separar somente o dinheiro já recebido
    const recebimentos = rendas.filter(function (renda) {
        return renda.status === "recebido";
    });

    // Limpar o conteúdo anterior da tabela
    corpoTabela.replaceChildren();

    // Mostrar mensagem se não houver recebimentos
    if (recebimentos.length === 0) {

        const linha = document.createElement("tr");
        const coluna = document.createElement("td");

        coluna.colSpan = 5;
        coluna.className = "renda-tabela-vazia";
        coluna.textContent = "Você ainda não registrou nenhum recebimento.";

        linha.appendChild(coluna);
        corpoTabela.appendChild(linha);

        return;
    }

    // Criar uma linha para cada recebimento
    recebimentos.forEach(function (renda) {

        const linha = document.createElement("tr");

        const origem = document.createElement("td");
        origem.textContent = renda.descricao;

        const tipo = document.createElement("td");
        tipo.textContent = renda.tipo === "fixa"
            ? "Fixa"
            : "Variável";

        const data = document.createElement("td");

        const dataRecebimento = renda.data_recebimento || renda.data;

        data.textContent = dataRecebimento
            ? dataRecebimento.split("-").reverse().join("/")
            : "Sem data";

        const valor = document.createElement("td");
        valor.textContent = formatarMoeda(renda.valor);


        const acoes = document.createElement("td");

        const botaoEditar = document.createElement("button");

        botaoEditar.type = "button";
        botaoEditar.className = "renda-botao-editar";
        botaoEditar.textContent = "Editar";


        botaoEditar.addEventListener("click", async function () {

            const novaDescricao = prompt(
                "Descrição do recebimento:",
                renda.descricao
            );

            if (novaDescricao === null) return;

            const descricao = novaDescricao.trim();

            if (!descricao) {
                alert("A descrição não pode ficar vazia.");
                return;
            }

            const novoValor = prompt(
                "Novo valor do recebimento:",
                renda.valor
            );

            if (novoValor === null) return;

            const valor = Number(novoValor.replace(",", "."));

            if (!Number.isFinite(valor) || valor <= 0) {
                alert("Digite um valor válido.");
                return;
            }

            const novoTipo = prompt(
                "Tipo de renda (fixa ou variavel):",
                renda.tipo
            );

            if (novoTipo === null) return;

            const tipo = novoTipo.trim().toLowerCase();

            if (!["fixa", "variavel"].includes(tipo)) {
                alert("Escolha fixa ou variavel.");
                return;
            }

            const novaData = prompt(
                "Data do recebimento (AAAA-MM-DD):",
                renda.data_recebimento || renda.data
            );

            if (novaData === null) return;

            const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(novaData);

            if (!dataValida) {
                alert("Use o formato AAAA-MM-DD.");
                return;
            }

            botaoEditar.disabled = true;

            try {
                const { data: usuarioData, error: erroUsuario } =
                    await supabase.auth.getUser();

                if (erroUsuario || !usuarioData.user) {
                    window.location.replace("login.html");
                    return;
                }

                const { data, error } = await supabase
                    .from("rendas")
                    .update({
                        descricao: descricao,
                        tipo: tipo,
                        valor: valor,
                        data: novaData,
                        data_recebimento: novaData
                    })
                    .eq("id", renda.id)
                    .eq("user_id", usuarioData.user.id)
                    .eq("status", "recebido")
                    .select("id");

                if (error) {
                    console.error("Erro ao editar renda:", error);
                    alert("Não foi possível editar o recebimento.");
                    return;
                }

                if (!data || data.length !== 1) {
                    alert("O recebimento não foi encontrado ou não pôde ser alterado.");
                    return;
                }

                await carregarRendas();

                alert("Recebimento atualizado com sucesso!");

            } catch (erro) {
                console.error("Erro inesperado:", erro);
                alert("Ocorreu um erro ao editar.");
            } finally {
                botaoEditar.disabled = false;
            }
        });

        acoes.appendChild(botaoEditar);


        const botaoExcluir = document.createElement("button");

        botaoExcluir.type = "button";
        botaoExcluir.className = "renda-botao-excluir";
        botaoExcluir.textContent = "Excluir";

        botaoExcluir.addEventListener("click", async function () {

            const confirmou = window.confirm(
                `Deseja realmente excluir "${renda.descricao}" de ${formatarMoeda(renda.valor)}?`
            );

            if (!confirmou) return;

            botaoExcluir.disabled = true;

            try {
                const { data: usuarioData, error: erroUsuario } =
                    await supabase.auth.getUser();

                if (erroUsuario || !usuarioData.user) {
                    window.location.replace("login.html");
                    return;
                }

                const { data, error } = await supabase
                    .from("rendas")
                    .delete()
                    .eq("id", renda.id)
                    .eq("user_id", usuarioData.user.id)
                    .eq("status", "recebido")
                    .select("id");

                if (error) {
                    console.error("Erro ao excluir renda:", error);
                    alert("Não foi possível excluir o recebimento.");
                    return;
                }

                if (!data || data.length !== 1) {
                    alert("O registro não foi excluído. Verifique as permissões.");
                    return;
                }

                await carregarRendas();

                alert("Recebimento excluído com sucesso!");

            } catch (erro) {
                console.error("Erro inesperado:", erro);
                alert("Ocorreu um erro ao excluir.");
            } finally {
                botaoExcluir.disabled = false;
            }
        });

        acoes.appendChild(botaoExcluir);



        linha.appendChild(origem);
        linha.appendChild(tipo);
        linha.appendChild(data);
        linha.appendChild(valor);
        linha.appendChild(acoes);

        corpoTabela.appendChild(linha);
    });
}

function mostrarPendentes(rendas) {

    const lista = document.querySelector("#renda-pendentes-lista");
    const mensagemVazia = document.querySelector("#renda-pendentes-vazio");

    if (!lista) return;

    // Separar apenas as rendas previstas
    const pendentes = rendas.filter(function (renda) {
        return renda.status === "previsto";
    });

    // Limpar a lista antes de atualizar
    lista.replaceChildren();

    // Esconder a lista quando não houver previsões
    if (pendentes.length === 0) {
        lista.hidden = true;
        mensagemVazia.hidden = false;
        return;
    }

    lista.hidden = false;
    mensagemVazia.hidden = true;

    // Exibir a lista
    lista.hidden = false;

    pendentes.forEach(function (renda) {

        const item = document.createElement("li");
        item.classList.add("renda-pendente-item");

        const descricao = document.createElement("strong");
        descricao.textContent = renda.descricao;

        const detalhes = document.createElement("span");

        const dataPrevista = renda.data
            ? renda.data.split("-").reverse().join("/")
            : "Sem data";

        detalhes.textContent =
            `${dataPrevista} • ${renda.tipo === "fixa" ? "Fixa" : "Variável"}`;

        const valor = document.createElement("span");
        valor.textContent = formatarMoeda(renda.valor);

        descricao.classList.add("renda-pendente-descricao");
        detalhes.classList.add("renda-pendente-detalhes");
        valor.classList.add("renda-pendente-valor");


        const botaoReceber = document.createElement("button");

        botaoReceber.type = "button";
        botaoReceber.className = "renda-botao-receber";
        botaoReceber.textContent = "Marcar como recebido";

        botaoReceber.addEventListener("click", async function () {

            const confirmou = window.confirm(
                `Você recebeu ${formatarMoeda(renda.valor)} de ${renda.descricao} hoje?`
            );

            if (!confirmou) return;

            botaoReceber.disabled = true;
            botaoReceber.textContent = "Salvando...";

            try {
                await marcarComoRecebido(renda.id);
            } finally {
                botaoReceber.disabled = false;
                botaoReceber.textContent = "Marcar como recebido";
            }
        });


        const botaoEditar = document.createElement("button");

        botaoEditar.type = "button";
        botaoEditar.className = "renda-botao-editar";
        botaoEditar.textContent = "Editar";

        botaoEditar.addEventListener("click", async function () {

            const novaDescricao = prompt(
                "Nova descrição:",
                renda.descricao
            );

            if (novaDescricao === null) return;

            const novoValor = prompt(
                "Novo valor:",
                renda.valor
            );

            if (novoValor === null) return;

            const novoTipo = prompt(
                "Tipo (fixa ou variavel):",
                renda.tipo
            );

            if (novoTipo === null) return;

            const novaData = prompt(
                "Nova data prevista (AAAA-MM-DD):",
                renda.data
            );

            if (novaData === null) return;

            const descricao = novaDescricao.trim();
            const valor = Number(novoValor.replace(",", "."));
            const tipo = novoTipo.trim().toLowerCase();

            if (
                !descricao ||
                !Number.isFinite(valor) ||
                valor <= 0 ||
                !["fixa", "variavel"].includes(tipo) ||
                !/^\d{4}-\d{2}-\d{2}$/.test(novaData) ||
                Number.isNaN(new Date(novaData).getTime()) ||
                new Date(novaData).toISOString().slice(0, 10) !== novaData
            ) {
                alert("Confira os dados informados.");
                return;
            }

            const { data: usuarioData, error: erroUsuario } =
                await supabase.auth.getUser();

            if (erroUsuario || !usuarioData.user) {
                alert("Sessão expirada. Faça login novamente.");
                return;
            }

            const { data, error } = await supabase
                .from("rendas")
                .update({
                    descricao: descricao,
                    valor: valor,
                    tipo: tipo,
                    data: novaData
                })
                .eq("id", renda.id)
                .eq("user_id", usuarioData.user.id)
                .eq("status", "previsto")
                .select("id");

            if (error) {
                console.error(error);
                alert("Erro ao editar previsão.");
                return;
            }

            if (!data || data.length !== 1) {
                alert("A previsão não foi atualizada.");
                return;
            }

            await carregarRendas();

            alert("Previsão atualizada com sucesso!");
        });


        const botaoExcluir = document.createElement("button");

        botaoExcluir.type = "button";
        botaoExcluir.className = "renda-botao-excluir";
        botaoExcluir.textContent = "Excluir";


        botaoExcluir.addEventListener("click", async function () {

            const confirmou = window.confirm(
                `Deseja realmente excluir a previsão "${renda.descricao}" de ${formatarMoeda(renda.valor)}?`
            );

            if (!confirmou) return;

            botaoExcluir.disabled = true;
            botaoExcluir.textContent = "Excluindo...";

            try {
                const { data: usuarioData, error: erroUsuario } =
                    await supabase.auth.getUser();

                if (erroUsuario || !usuarioData.user) {
                    alert("Sessão expirada. Faça login novamente.");
                    return;
                }

                const { data, error } = await supabase
                    .from("rendas")
                    .delete()
                    .eq("id", renda.id)
                    .eq("user_id", usuarioData.user.id)
                    .eq("status", "previsto")
                    .select("id");

                if (error) {
                    console.error("Erro ao excluir previsão:", error);
                    alert("Não foi possível excluir a previsão.");
                    return;
                }

                if (!data || data.length !== 1) {
                    alert("A previsão não foi excluída. Verifique as permissões.");
                    return;
                }

                await carregarRendas();

                alert("Previsão excluída com sucesso!");

            } catch (erro) {
                console.error("Erro inesperado:", erro);
                alert("Ocorreu um erro ao excluir a previsão.");

            } finally {
                botaoExcluir.disabled = false;
                botaoExcluir.textContent = "Excluir";
            }
        });


        item.appendChild(descricao);
        item.appendChild(detalhes);
        item.appendChild(valor);

        item.appendChild(botaoEditar);
        item.appendChild(botaoExcluir);
        item.appendChild(botaoReceber);

        lista.appendChild(item);

    });
}


async function marcarComoRecebido(id) {

    const { data: usuarioData, error: erroUsuario } =
        await supabase.auth.getUser();

    if (erroUsuario || !usuarioData.user) {
        window.location.replace("login.html");
        return;
    }

    // Data local de hoje, no formato YYYY-MM-DD
    const hoje = new Date();
    const dataRecebimento = [
        hoje.getFullYear(),
        String(hoje.getMonth() + 1).padStart(2, "0"),
        String(hoje.getDate()).padStart(2, "0")
    ].join("-");

    const { data, error } = await supabase
        .from("rendas")
        .update({
            status: "recebido",
            data_recebimento: dataRecebimento
        })
        .eq("id", id)
        .eq("user_id", usuarioData.user.id)
        .eq("status", "previsto")
        .select("id");

    if (error) {
        console.error("Erro ao confirmar recebimento:", error);
        alert("Não foi possível confirmar o recebimento.");
        return;
    }

    if (!data || data.length !== 1) {
        alert("Essa previsão não está mais pendente. Vamos atualizar a lista.");
        await carregarRendas();
        return;
    }

    await carregarRendas();

    alert("Recebimento confirmado com sucesso!");
}

// ==========================================
// 3. CARREGAR RENDAS DO SUPABASE
// ==========================================

async function carregarRendas() {

    const { data: usuarioData, error: erroUsuario } =
        await supabase.auth.getUser();

    if (erroUsuario || !usuarioData.user) {
        window.location.replace("login.html");
        return;
    }

    const { data: rendas, error } = await supabase
        .from("rendas")
        .select("*")
        .eq("user_id", usuarioData.user.id)
        .order("data", { ascending: false });

    if (error) {
        console.error("Erro ao carregar rendas:", error);
        return;
    }
    mostrarHistorico(rendas);
    mostrarPendentes(rendas);

    // Identificar mês e ano atuais
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;

    // Selecionar somente recebimentos do mês
    const rendasDoMes = rendas.filter(function (renda) {

        if (renda.status !== "recebido") {
            return false;
        }

        const dataRecebimento = renda.data_recebimento || renda.data;

        const [ano, mes] = dataRecebimento
            .split("-")
            .map(Number);

        return ano === anoAtual && mes === mesAtual;
    });

    // ==========================================
    // 4. CALCULAR OS INDICADORES
    // ==========================================

    const totalRecebido = rendasDoMes.reduce(
        (total, renda) => total + Number(renda.valor),
        0
    );

    const totalFixo = rendasDoMes
        .filter(renda => renda.tipo === "fixa")
        .reduce(
            (total, renda) => total + Number(renda.valor),
            0
        );

    const totalVariavel = rendasDoMes
        .filter(renda => renda.tipo === "variavel")
        .reduce(
            (total, renda) => total + Number(renda.valor),
            0
        );

    // ==========================================
    // 5. ATUALIZAR O HTML
    // ==========================================

    totalRecebidoElemento.textContent =
        formatarMoeda(totalRecebido);

    totalFixoElemento.textContent =
        formatarMoeda(totalFixo);

    totalVariavelElemento.textContent =
        formatarMoeda(totalVariavel);

    const nomeMes = hoje.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });

    periodoElemento.textContent = nomeMes;

    console.log("Rendas do mês:", rendasDoMes);


    // Calcular rendas previstas ainda não recebidas
    const rendasPrevistas = rendas.filter(function (renda) {
        return renda.status === "previsto";
    });

    const totalPrevisto = rendasPrevistas.reduce(
        (total, renda) => total + Number(renda.valor),
        0
    );

    // Atualizar o valor previsto no HTML
    document.querySelector("#renda-total-previsto").textContent =
        formatarMoeda(totalPrevisto);

    // Atualizar a mensagem abaixo do valor
    document.querySelector("#renda-estado-previsto").textContent =
        rendasPrevistas.length > 0
            ? `${rendasPrevistas.length} recebimento(s) aguardando.`
            : "Nenhuma previsão cadastrada.";

}

// ==========================================
// 6. SALVAR RECEBIMENTO
// ==========================================


const formularioPrevisto = document.querySelector("#form-renda-prevista");
const mensagemPrevista = document.querySelector("#mensagem-renda-prevista");
const botaoSalvarPrevisto = document.querySelector("#salvar-renda-prevista");

formularioPrevisto.addEventListener("submit", async function (event) {
    event.preventDefault();

    const descricao = document.querySelector("#previsto-descricao").value.trim();
    const tipo = document.querySelector("#previsto-tipo").value;
    const valor = Number(document.querySelector("#previsto-valor").value);
    const data = document.querySelector("#previsto-data").value;

    if (
        !descricao ||
        !["fixa", "variavel"].includes(tipo) ||
        !Number.isFinite(valor) ||
        valor <= 0 ||
        !data
    ) {
        mensagemPrevista.textContent = "Preencha os campos corretamente.";
        mensagemPrevista.hidden = false;
        return;
    }

    botaoSalvarPrevisto.disabled = true;

    try {
        const { data: usuarioData, error: erroUsuario } =
            await supabase.auth.getUser();

        if (erroUsuario || !usuarioData.user) {
            window.location.replace("login.html");
            return;
        }

        const { error } = await supabase
            .from("rendas")
            .insert({
                user_id: usuarioData.user.id,
                descricao: descricao,
                tipo: tipo,
                valor: valor,
                data: data,
                status: "previsto",
                data_recebimento: null
            });

        if (error) {
            console.error("Erro ao salvar previsão:", error);
            mensagemPrevista.textContent = "Não foi possível salvar a previsão.";
            mensagemPrevista.hidden = false;
            return;
        }

        mensagemPrevista.textContent = "Previsão salva com sucesso!";
        mensagemPrevista.hidden = false;

        formularioPrevisto.reset();

        await carregarRendas();

    } catch (erro) {
        console.error("Erro inesperado:", erro);
        mensagemPrevista.textContent = "Ocorreu um erro. Tente novamente.";
        mensagemPrevista.hidden = false;
    } finally {
        botaoSalvarPrevisto.disabled = false;
    }
});

formulario.addEventListener("submit", async function (event) {

    event.preventDefault();

    const descricao = document
        .querySelector("#recebido-descricao")
        .value.trim();

    const tipo = document
        .querySelector("#recebido-tipo")
        .value;

    const valor = Number(
        document.querySelector("#recebido-valor").value
    );

    const data = document
        .querySelector("#recebido-data")
        .value;

    // Validar campos
    if (
        !descricao ||
        !["fixa", "variavel"].includes(tipo) ||
        !Number.isFinite(valor) ||
        valor <= 0 ||
        !data
    ) {
        mensagem.textContent = "Preencha os campos corretamente.";
        mensagem.hidden = false;
        return;
    }

    botaoSalvar.disabled = true;

    try {

        // Identificar usuário autenticado
        const { data: usuarioData, error: erroUsuario } =
            await supabase.auth.getUser();

        if (erroUsuario || !usuarioData.user) {
            window.location.replace("login.html");
            return;
        }

        // Salvar no Supabase
        const { error } = await supabase
            .from("rendas")
            .insert({
                user_id: usuarioData.user.id,
                descricao: descricao,
                tipo: tipo,
                valor: valor,
                data: data,
                status: "recebido",
                data_recebimento: data
            });

        if (error) {
            console.error("Erro ao salvar renda:", error);

            mensagem.textContent =
                "Não foi possível salvar o recebimento.";

            mensagem.hidden = false;
            return;
        }

        // Confirmar salvamento
        mensagem.textContent =
            "Recebimento salvo com sucesso!";

        mensagem.hidden = false;

        formulario.reset();

        // Atualizar indicadores automaticamente
        await carregarRendas();

    } catch (erro) {

        console.error("Erro inesperado:", erro);

        mensagem.textContent =
            "Ocorreu um erro. Tente novamente.";

        mensagem.hidden = false;

    } finally {

        botaoSalvar.disabled = false;
    }
});

// ==========================================
// 7. CARREGAR AO ABRIR A PÁGINA
// ==========================================

carregarRendas();
