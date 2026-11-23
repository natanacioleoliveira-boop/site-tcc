
import { supabase } from "./supabase.js";

// Verifica se existe um usuário autenticado

async function verificarLogin() {

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        window.location.replace("login.html");
        return;
    }

    document.body.style.visibility = "visible";

    console.log("Usuário autenticado:", data.user.email);
}


verificarLogin();

const botaoPerfil = document.querySelector("#botao-perfil");
const menuPerfil = document.querySelector("#menu-perfil");
const botaoSair = document.querySelector("#botao-sair");

function fecharMenu() {
    menuPerfil.hidden = true;
    botaoPerfil.setAttribute("aria-expanded", "false");
}

if (botaoPerfil && menuPerfil && botaoSair) {

    botaoPerfil.addEventListener("click", function () {
        const abrir = menuPerfil.hidden;

        menuPerfil.hidden = !abrir;
        botaoPerfil.setAttribute("aria-expanded", String(abrir));
    });

    document.addEventListener("click", function (event) {
        if (!event.target.closest(".perfil-container")) {
            fecharMenu();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !menuPerfil.hidden) {
            fecharMenu();
            botaoPerfil.focus();
        }
    });

    botaoSair.addEventListener("click", async function () {

        botaoSair.disabled = true;

        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("Não foi possível sair da conta.");
            botaoSair.disabled = false;
            return;
        }

        window.location.replace("login.html");
    });
}
