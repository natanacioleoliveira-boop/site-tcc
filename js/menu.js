import { supabase } from "./supabase.js";

const container = document.querySelector("#conta-container");
const botaoConta = document.querySelector("#botaoConta");
const textoConta = document.querySelector("#textoConta");
const menuConta = document.querySelector("#menuConta");
const sairConta = document.querySelector("#sairConta");

let usuarioLogado = false;


// FECHAR MENU

function fecharMenu() {

    menuConta.hidden = true;

    botaoConta.setAttribute("aria-expanded", "false");

}


// ATUALIZAR PERFIL

function atualizarMenu(session) {

    usuarioLogado = Boolean(session?.user);

    if (usuarioLogado) {

        textoConta.textContent = "Meu perfil";
        botaoConta.href = "resumo-financeiro.html";

    } else {

        textoConta.textContent = "Entrar";
        botaoConta.href = "login.html";

        fecharMenu();

    }

}


// VERIFICAR LOGIN

async function verificarUsuario() {

    const { data, error } = await supabase.auth.getSession();

    if (error) {

        console.error(error);
        return;

    }

    atualizarMenu(data.session);

}


// ABRIR E FECHAR AO CLICAR NO PERFIL

botaoConta.addEventListener("click", function (event) {

    if (!usuarioLogado) return;

    event.preventDefault();

    menuConta.hidden = !menuConta.hidden;

    botaoConta.setAttribute(
        "aria-expanded",
        String(!menuConta.hidden)
    );

});


// FECHAR CLICANDO FORA

document.addEventListener("click", function (event) {

    if (!container.contains(event.target)) {

        fecharMenu();

    }

});


// FECHAR COM ESC

container.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

        fecharMenu();

        botaoConta.focus();

    }

});


// SAIR DA CONTA

sairConta.addEventListener("click", async function () {

    const { error } = await supabase.auth.signOut();

    if (error) {

        console.error(error);
        alert("Não foi possível sair da conta.");

        return;

    }

    window.location.href = "index.html";

});


// MONITORAR LOGIN E LOGOUT

supabase.auth.onAuthStateChange(function (evento, session) {

    atualizarMenu(session);

});

verificarUsuario();