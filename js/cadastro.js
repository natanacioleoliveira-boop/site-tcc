
import { supabase } from "./supabase.js";

const formulario = document.querySelector("#formCadastro");
const mensagem = document.querySelector("#mensagemCadastro");
const botao = document.querySelector("#btnCadastro");

formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    const nome = document.querySelector("#cadastro-nome").value.trim();
    const email = document.querySelector("#cadastro-email").value.trim();
    const senha = document.querySelector("#cadastro-senha").value;
    const confirmarSenha = document.querySelector("#confirmar-senha").value;

    const preferencia = document.querySelector(
        'input[name="preferencia_estudo"]:checked'
    )?.value || "padrao";

    if (!nome || !email || !senha || !confirmarSenha) {
        mensagem.textContent = "Preencha todos os campos.";
        return;
    }

    if (senha.length < 8) {
        mensagem.textContent = "A senha deve ter pelo menos 8 caracteres.";
        return;
    }

    if (senha !== confirmarSenha) {
        mensagem.textContent = "As senhas não são iguais.";
        return;
    }

    botao.disabled = true;
    mensagem.textContent = "Criando sua conta...";

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: senha,
            options: {
                data: {
                    nome: nome,
                    preferencia_estudo: preferencia
                }
            }
        });

        if (error) throw error;

        if (data.session) {
            mensagem.textContent = "Conta criada com sucesso!";

            formulario.reset();

            // Usuário já está autenticado.
            window.location.href = "minha-area.html";
        } else {
            mensagem.textContent =
                "Cadastro solicitado! Confira seu e-mail para confirmar a conta antes de entrar.";

            formulario.reset();
        }

    } catch (erro) {
        console.error("Erro ao cadastrar:", erro);

        mensagem.textContent =
            "Não foi possível criar a conta: " + erro.message;

    } finally {
        botao.disabled = false;
    }
});
