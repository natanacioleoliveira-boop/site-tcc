(function () {

    // IDENTIFICA A LOCALIZAÇÃO DO JAVASCRIPT

    const scriptSpake = document.currentScript;

    if (!scriptSpake) return;

    const pastaSpake = new URL("./", scriptSpake.src);


    // CAMINHOS DOS ARQUIVOS

    const CAMINHOS = {

        html: new URL(
            "../html/spake.html",
            pastaSpake
        ).href,

        css: new URL(
            "../css/spake.css",
            pastaSpake
        ).href

    };


    // CAMINHOS DAS IMAGENS

    const IMAGENS = {

        rosto: new URL(
            "../srcc/Cão Mascote Laranja com Boné e Fones.png",
            pastaSpake
        ).href,

        personagem: new URL(
            "../srcc/Mascote Cachorro Base6 com Estilo Urbano.png",
            pastaSpake
        ).href

    };


    // CARREGA O CSS

    function carregarCss() {

        if (document.querySelector("#spake-css")) return;

        const link = document.createElement("link");

        link.id = "spake-css";

        link.rel = "stylesheet";

        link.href = CAMINHOS.css;

        link.onerror = function () {

            console.error(
                "CSS do Spake não encontrado:",
                CAMINHOS.css
            );

        };

        document.head.appendChild(link);

    }


    // CARREGA O HTML DO SPAKE

    async function carregarSpake() {

        if (document.querySelector("#spake-container")) return;

        try {

            carregarCss();

            const resposta = await fetch(CAMINHOS.html);

            if (!resposta.ok) {

                throw new Error(
                    "HTML do Spake não encontrado: " +
                    CAMINHOS.html +
                    " (" + resposta.status + ")"
                );

            }

            const html = await resposta.text();

            const modelo = document.createElement("template");

            modelo.innerHTML = html;

            const container = document.createElement("div");

            container.id = "spake-container";

            container.appendChild(
                modelo.content.cloneNode(true)
            );


            // VERIFICA OS ELEMENTOS DO HTML
            console.log("HTML carregado:", CAMINHOS.html);

            console.log(
                "IDs encontrados:",
                [...container.querySelectorAll("[id]")]
                    .map(elemento => elemento.id)
            );

            console.log(
                "Área de resposta:",
                container.querySelector("#spake-resposta")
            );
            const ids = [
                "spake-abrir",
                "spake-fechar",
                "spake-painel",
                "spake-overlay",
                "spake-menu",
                "spake-resposta",
                "spake-voltar",
                "spake-assunto",
                "spake-texto"
            ];

            for (const id of ids) {

                if (!container.querySelector("#" + id)) {

                    throw new Error(
                        "Elemento do Spake não encontrado: " + id
                    );

                }

            }


            // CARREGA AS IMAGENS

            container.querySelectorAll("[data-spake-img]")
                .forEach(function (imagem) {

                    imagem.addEventListener("error", function () {

                        console.error(
                            "Imagem do Spake não encontrada:",
                            imagem.src
                        );

                    });

                    imagem.src = IMAGENS[imagem.dataset.spakeImg];

                });


            // ADICIONA O SPAKE AO SITE

            document.body.appendChild(container);

            iniciarSpake(container);

            console.log("Spake carregado com sucesso!");

        } catch (erro) {

            console.error("Erro ao carregar Spake:", erro);

        }

    }


    // FUNCIONALIDADES DO SPAKE

    function iniciarSpake(container) {

        const abrir = container.querySelector("#spake-abrir");

        const fechar = container.querySelector("#spake-fechar");

        const painel = container.querySelector("#spake-painel");

        const overlay = container.querySelector("#spake-overlay");

        const menu = container.querySelector("#spake-menu");

        const resposta = container.querySelector("#spake-resposta");

        const voltar = container.querySelector("#spake-voltar");

        const titulo = container.querySelector("#spake-assunto");

        const texto = container.querySelector("#spake-texto");

        const opcoes = container.querySelectorAll(".spake-opcao");

        let ultimaOpcao = null;


        // GARANTE QUE O ASSISTENTE COMEÇA FECHADO

        painel.hidden = true;

        overlay.hidden = true;

        resposta.hidden = true;

        menu.hidden = false;

        abrir.setAttribute("aria-expanded", "false");


        // CONTEÚDOS DO ASSISTENTE

        const assuntos = {

            financeiro: {

                titulo: "Bora cuidar do seu dinheiro?",

                texto: `
                    <p>
                        Salve! Eu sou o Spake.
                        Como posso te ajudar?
                    </p>

                    <details>

                        <summary>
                            O que é educação financeira?
                        </summary>

                        <p>
                            É aprender a cuidar do seu dinheiro
                            e tomar decisões mais conscientes.
                        </p>

                    </details>

                    <details>

                        <summary>
                            Como controlar meus gastos?
                        </summary>

                        <p>
                            Registre seus ganhos e despesas.
                            Identifique quais gastos são
                            essenciais e quais podem ser evitados.
                        </p>

                    </details>

                    <details>

                        <summary>
                            Como começar a guardar dinheiro?
                        </summary>

                        <p>
                            Comece com um valor que cabe no seu
                            orçamento, sem comprometer suas
                            necessidades básicas.
                        </p>

                    </details>

                    <details>

                        <summary>
                            O que é reserva de emergência?
                        </summary>

                        <p>
                            É um dinheiro guardado para
                            situações inesperadas.
                        </p>

                    </details>

                    <details>

                        <summary>
                            Como criar uma meta financeira?
                        </summary>

                        <p>
                            Defina seu objetivo, descubra quanto
                            precisa guardar e estabeleça um
                            prazo realista.
                        </p>

                    </details>
                `

            },


            sobre: {

                titulo: "Conheça a Base 6",

                texto: `
                    <p>
                        A Base 6 nasceu com o propósito de
                        democratizar o acesso à educação
                        financeira.
                    </p>

                    <p>
                        Somos seis jovens que acreditam
                        que conhecimento e oportunidade
                        devem ser acessíveis para todos.
                    </p>

                    <p>
                        Nosso objetivo é alcançar jovens
                        das periferias e pessoas com
                        deficiência.
                    </p>

                    <strong>
                        Todo mundo merece uma base.
                    </strong>
                `

            },


            comunidade: {

                titulo: "Vem fazer parte!",

                texto: `
                    <p>
                        Conhecimento compartilhado
                        transforma realidades.
                    </p>

                    <p>
                        Faça parte da nossa caminhada,
                        compartilhe o projeto e acompanhe
                        nossas iniciativas.
                    </p>
                `

            },


            contato: {

                titulo: "Fala com a gente!",

                texto: `
                    <p>
                        Tem alguma dúvida, sugestão ou
                        ideia para melhorar a Base 6?
                    </p>

                    <p>
                        Queremos ouvir você!
                    </p>

                    <p>
                        Nossos canais de contato serão
                        disponibilizados em breve.
                    </p>
                `

            }

        };


        // MOSTRAR O MENU PRINCIPAL

        function mostrarMenu() {

            resposta.hidden = true;

            menu.hidden = false;

        }


        // ABRIR O SPAKE

        function abrirSpake() {

            painel.hidden = false;

            overlay.hidden = false;

            container.classList.add("spake-aberto");

            abrir.setAttribute("aria-expanded", "true");

            fechar.focus();

        }


        // FECHAR O SPAKE

        function fecharSpake() {

            painel.hidden = true;

            overlay.hidden = true;

            container.classList.remove("spake-aberto");

            abrir.setAttribute("aria-expanded", "false");

            mostrarMenu();

            abrir.focus();

        }


        // CLICAR NO ROSTO DO MASCOTE

        abrir.addEventListener("click", function () {

            if (painel.hidden) {

                abrirSpake();

            } else {

                fecharSpake();

            }

        });


        // FECHAR PELO X

        fechar.addEventListener("click", fecharSpake);


        // FECHAR CLICANDO FORA

        overlay.addEventListener("click", fecharSpake);


        // SELECIONAR UM ASSUNTO

        opcoes.forEach(function (opcao) {

            opcao.addEventListener("click", function () {

                const conteudo = assuntos[opcao.dataset.assunto];

                if (!conteudo) return;

                ultimaOpcao = opcao;

                titulo.textContent = conteudo.titulo;

                texto.innerHTML = conteudo.texto;

                menu.hidden = true;

                resposta.hidden = false;

                titulo.focus();

            });

        });


        // VOLTAR AO MENU PRINCIPAL

        voltar.addEventListener("click", function () {

            mostrarMenu();

            if (ultimaOpcao) {

                ultimaOpcao.focus();

            }

        });


        // FECHAR COM A TECLA ESC

        document.addEventListener("keydown", function (event) {

            if (event.key === "Escape" && !painel.hidden) {

                fecharSpake();

            }

        });

    }


    // INICIALIZAÇÃO DO ASSISTENTE

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            carregarSpake
        );

    } else {

        carregarSpake();

    }

})();