
import { supabase } from "./supabase.js";

const formulario = document.querySelector("#formulario-login");

formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.querySelector("#login-identificador").value.trim();
    const senha = document.querySelector("#login-senha").value;

    if (!email || !senha) {
        alert("Preencha todos os campos.");
        return;
    }

    const botao = formulario.querySelector('button[type="submit"]');

    botao.disabled = true;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha
    });

    botao.disabled = false;

    if (error) {
        console.error(error);
        alert("Não foi possível entrar. Confira seu e-mail e senha.");
        return;
    }

    if (data.user) {
        window.location.href = "minha-area.html";
    }
});
