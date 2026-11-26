// BASE 6 - ACESSIBILIDADE GLOBAL
// IDs do painel: a6-* (acessibilidade.html)
// VLibras: solução do script.js (remove os elementos da página
// ao desativar e recoloca no mesmo lugar ao ativar).

(async function iniciarAcessibilidade() {

  if (window.__base6AcessibilidadeIniciada) return;

  window.__base6AcessibilidadeIniciada = true;

  const scriptAtual = document.currentScript;

  const pastaJs = new URL(".", scriptAtual.src);

  const urlHtml = new URL(
    "../html/acessibilidade.html",
    pastaJs
  );

  const urlCss = new URL(
    "../css/acessibilidade.css",
    pastaJs
  );

  const $ = (id) => document.getElementById(id);

  const CHAVE = "base6_acessibilidade_v1";

  const padrao = {
    vlibras: false,
    legendas: true,
    tamanhoFonte: 100,
    contraste: "normal",
    fundo: "#f6f0e2",
    texto: "#10291f",
    iconesReforcados: true,
    espacamento: false,
    controlesGrandes: false
  };

  let preferencias = { ...padrao };
  let lendo = false;
  let carregandoVlibras = false;
  let scriptVlibrasCarregado = false;

  // SALVAR E RECUPERAR

  try {
    const dados = JSON.parse(
      localStorage.getItem(CHAVE)
    );

    if (dados && typeof dados === "object") {
      preferencias = { ...padrao, ...dados };
    }
  } catch (erro) {
    console.warn("Erro nas preferências:", erro);
  }

  function salvar() {
    try {
      localStorage.setItem(
        CHAVE,
        JSON.stringify(preferencias)
      );
    } catch (erro) {
      console.warn("Não foi possível salvar:", erro);
    }
  }

  // CARREGAR O CSS

  if (!document.getElementById("a6-css")) {
    const link = document.createElement("link");

    link.id = "a6-css";
    link.rel = "stylesheet";
    link.href = urlCss.href;

    document.head.appendChild(link);
  }

  // CARREGAR O HTML

  try {
    const resposta = await fetch(urlHtml.href);

    if (!resposta.ok) {
      throw new Error(
        "Erro ao carregar acessibilidade.html"
      );
    }

    if (!$("a6-painel")) {
      const codigo = await resposta.text();

      const modelo = document.createElement("template");
      modelo.innerHTML = codigo;

      // Remove o que não deve ir para o body da página.
      modelo.content
        .querySelectorAll("title, meta, script")
        .forEach((elemento) => elemento.remove());

      // Corrige o caminho do mascote em qualquer página.
      const imagem = modelo.content.querySelector(
        ".a6-mascote"
      );

      if (imagem) {
        imagem.src = new URL(
          imagem.getAttribute("src"),
          urlHtml.href
        ).href;
      }

      document.body.appendChild(
        modelo.content.cloneNode(true)
      );
    }

  } catch (erro) {
    console.error("Erro na acessibilidade:", erro);
    return;
  }

  const painel = $("a6-painel");
  const abrir = $("a6-abrir");
  const fechar = $("a6-fechar");
  const mensagem = $("a6-mensagem");

  if (!painel || !abrir || !fechar || !mensagem) {
    console.error("Painel incompleto.");
    return;
  }

  function avisar(texto) {
    mensagem.textContent = texto;
  }

  // ABRIR E FECHAR PAINEL

  abrir.addEventListener("click", () => {
    if (!painel.open) {
      painel.showModal();
      abrir.setAttribute("aria-expanded", "true");
    }
  });

  fechar.addEventListener("click", () => {
    painel.close();
  });

  painel.addEventListener("close", () => {
    abrir.setAttribute("aria-expanded", "false");
    abrir.focus();
  });

  // Clicar fora do painel também fecha.
  // Só fecha se o clique COMEÇOU e TERMINOU fora, para não
  // fechar ao arrastar o slider e soltar fora do painel.
  let cliqueComecouFora = false;

  function pontoForaDoPainel(evento) {
    const caixa = painel.getBoundingClientRect();

    return (
      evento.clientX < caixa.left ||
      evento.clientX > caixa.right ||
      evento.clientY < caixa.top ||
      evento.clientY > caixa.bottom
    );
  }

  painel.addEventListener("pointerdown", (evento) => {
    cliqueComecouFora =
      evento.target === painel &&
      pontoForaDoPainel(evento);
  });

  painel.addEventListener("click", (evento) => {
    if (
      cliqueComecouFora &&
      evento.target === painel &&
      pontoForaDoPainel(evento)
    ) {
      painel.close();
    }

    cliqueComecouFora = false;
  });

  // ESTILOS FUNCIONAIS
  // Isolados do painel e do VLibras.
  //
  // ATENÇÃO: os :not() ficam COLADOS, sem espaço nem quebra
  // de linha entre eles. Um espaço no CSS vira "descendente de".

  const EXCLUIR = [
    ":not(#a6-painel)",
    ":not(#a6-painel *)",
    ":not(.a6-botao-flutuante)",
    ":not(.a6-botao-flutuante *)",
    ":not([vw])",
    ":not([vw] *)",
    ":not(img)",
    ":not(svg)",
    ":not(svg *)",
    ":not(video)",
    ":not(canvas)",
    ":not(iframe)"
  ].join("");

  const FORA_DO_PAINEL = [
    ":not(#a6-painel)",
    ":not(#a6-painel *)",
    ":not(.a6-botao-flutuante)",
    ":not(.a6-botao-flutuante *)",
    ":not([vw] *)"
  ].join("");

  const estilos = document.createElement("style");
  estilos.id = "a6-efeitos";

  estilos.textContent = `
    html.a6-tema-acessivel,
    html.a6-tema-acessivel body {
      background-color: var(--a6-cor-fundo) !important;
      color: var(--a6-cor-texto) !important;
    }

    html.a6-tema-acessivel body ${EXCLUIR} {
      background-color: var(--a6-cor-fundo) !important;
      color: var(--a6-cor-texto) !important;
      border-color: var(--a6-cor-texto) !important;
    }

    html.a6-tema-acessivel body a${FORA_DO_PAINEL} {
      text-decoration: underline !important;
    }

    html.a6-mais-espaco body
    :is(p, li, label)${FORA_DO_PAINEL} {
      line-height: 1.9 !important;
      letter-spacing: 0.04em !important;
      word-spacing: 0.12em !important;
    }

    html.a6-botoes-grandes body
    :is(button, input, select, textarea)${FORA_DO_PAINEL}:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]) {
      min-height: 52px !important;
      padding: 12px !important;
    }

    html.a6-icones-apoio body
    :is(.icone, .icon, [data-a6-icone])${FORA_DO_PAINEL} {
      filter: drop-shadow(0 0 1px currentColor);
    }

    /* Reserva: VLibras escondido quando está desligado. */
    html:root:not(.a6-vlibras-ativo) body
    :is([vw], [vw-access-button], [vw-plugin-wrapper], .vw-plugin-top-wrapper) {
      display: none !important;
    }
  `;

  document.head.appendChild(estilos);

  // =====================================================
  // VLIBRAS - REMOVER E RECOLOCAR OS ELEMENTOS
  // =====================================================
  // Em vez de só esconder (o plugin pode sobrescrever o
  // estilo), REMOVEMOS os elementos do VLibras da página ao
  // desativar e os recolocamos no mesmo lugar ao ativar.

  const registroVlibras = []; // { no, pai, proximo }

  const ignorarTags = [
    "SCRIPT", "STYLE", "LINK", "NOSCRIPT", "META"
  ];

  const seletorVlibras =
    "[vw], [vw-access-button], [vw-plugin-wrapper], .vw-plugin-top-wrapper";

  // Janela em que elementos soltos no <body> são tratados como
  // sendo do VLibras (logo após ativar/carregar o plugin).
  let janelaVlibrasAte = 0;

  // Nada que pertença ao painel pode ser tratado como VLibras.
  function ehNosso(no) {
    return !!no.closest("#a6-painel, #a6-abrir, .pular");
  }

  function temMarcaVlibras(no) {
    return Array.from(no.attributes).some(
      (atributo) => /^v[wp](-|$)/.test(atributo.name)
    );
  }

  function ehCandidato(no) {
    if (
      no.nodeType !== 1 ||
      ignorarTags.includes(no.tagName) ||
      ehNosso(no)
    ) {
      return false;
    }

    if (
      no.matches(seletorVlibras) ||
      temMarcaVlibras(no) ||
      no.querySelector(seletorVlibras)
    ) {
      return true;
    }

    const pai = no.parentNode;

    const naRaiz =
      pai === document.body ||
      pai === document.documentElement;

    return naRaiz && Date.now() < janelaVlibrasAte;
  }

  function jaRegistrado(no) {
    return registroVlibras.some(
      (item) => item.no === no || item.no.contains(no)
    );
  }

  // Guarda o elemento (e onde ele estava) e já o remove
  // se o VLibras estiver desativado.
  function tratarElemento(no) {
    const item = registroVlibras.find(
      (registro) => registro.no === no
    );

    if (item) {
      // O plugin recolocou o mesmo elemento:
      // desativado = remove de novo.
      if (!preferencias.vlibras) {
        no.remove();
      } else if (no.parentNode) {
        item.pai = no.parentNode;
        item.proximo = no.nextSibling;
      }
      return;
    }

    if (!ehCandidato(no) || jaRegistrado(no)) return;

    registroVlibras.push({
      no: no,
      pai: no.parentNode,
      proximo: no.nextSibling
    });

    if (!preferencias.vlibras) no.remove();
  }

  function mostrarVlibras() {
    // Botão azul oficial, quando o plugin expõe a referência.
    const botaoAzul =
      window.VLibrasWidget && window.VLibrasWidget.initBtn;

    if (
      botaoAzul &&
      botaoAzul.nodeType === 1 &&
      botaoAzul.isConnected
    ) {
      tratarElemento(botaoAzul);
    }

    // Qualquer elemento do VLibras que já esteja na página.
    document
      .querySelectorAll(seletorVlibras)
      .forEach(tratarElemento);

    registroVlibras.forEach((item) => {
      if (preferencias.vlibras) {
        // Ativar: coloca de volta onde estava.
        if (
          !item.no.isConnected &&
          item.pai &&
          item.pai.isConnected
        ) {
          const referencia =
            item.proximo &&
            item.proximo.parentNode === item.pai
              ? item.proximo
              : null;

          item.pai.insertBefore(item.no, referencia);
        }
      } else if (item.no.isConnected) {
        // Desativar: tira da página.
        item.no.remove();
      }
    });
  }

  function atualizarVisibilidadeVlibras() {
    document.documentElement.classList.toggle(
      "a6-vlibras-ativo",
      preferencias.vlibras
    );

    mostrarVlibras();
  }

  // O plugin cria o botão com atraso (e pode recriá-lo).
  // Observamos a página e tratamos o que aparecer.
  function pluginPresente() {
    return (
      carregandoVlibras ||
      scriptVlibrasCarregado ||
      !!document.querySelector(
        'script[src*="vlibras-plugin.js"]'
      )
    );
  }

  new MutationObserver((mutacoes) => {
    if (!pluginPresente()) return;

    mutacoes.forEach((mutacao) => {
      mutacao.addedNodes.forEach((no) => {
        if (no.nodeType === 1) tratarElemento(no);
      });
    });
  }).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Se o plugin não montou o botão sozinho, monta do
  // jeito oficial (marcação + new VLibras.Widget).
  function garantirWidget() {
    setTimeout(() => {
      if (!preferencias.vlibras) return;

      const jaExiste =
        (window.VLibrasWidget && window.VLibrasWidget.initBtn) ||
        document.querySelector("[vw-access-button]") ||
        registroVlibras.length > 0;

      if (jaExiste || window.__base6VlibrasWidget) return;

      if (typeof window.VLibras?.Widget !== "function") return;

      if (!document.querySelector("[vw]")) {
        const container = document.createElement("div");

        container.setAttribute("vw", "");
        container.className = "enabled";

        container.innerHTML = `
          <div vw-access-button class="active"></div>
          <div vw-plugin-wrapper>
            <div class="vw-plugin-top-wrapper"></div>
          </div>
        `;

        document.body.appendChild(container);
      }

      try {
        window.__base6VlibrasWidget = new window.VLibras.Widget(
          "https://vlibras.gov.br/app"
        );
      } catch (erro) {
        console.warn("Erro ao iniciar o VLibras:", erro);
      }

      atualizarVisibilidadeVlibras();
    }, 900);
  }

  function carregarVlibras() {
    if (scriptVlibrasCarregado || carregandoVlibras) {
      mostrarVlibras();
      garantirWidget();
      return;
    }

    carregandoVlibras = true;
    janelaVlibrasAte = Date.now() + 10000;

    $("a6-libras").disabled = true;
    avisar("Carregando VLibras. É necessário ter internet.");

    let concluido = false;

    function concluir() {
      if (concluido) return;
      concluido = true;

      scriptVlibrasCarregado = true;
      carregandoVlibras = false;
      janelaVlibrasAte = Date.now() + 8000;

      $("a6-libras").disabled = false;

      atualizarVisibilidadeVlibras();
      garantirWidget();

      // Algumas partes do VLibras ficam prontas com atraso.
      [250, 700, 1500, 3000, 6000].forEach((tempo) => {
        setTimeout(atualizarVisibilidadeVlibras, tempo);
      });

      avisar(
        preferencias.vlibras
          ? "VLibras ativado. Use o botão azul que apareceu na página."
          : "VLibras desativado."
      );
    }

    // Evita carregar uma segunda cópia do script oficial.
    const scriptExistente = document.querySelector(
      'script[src*="vlibras-plugin.js"]'
    );

    if (scriptExistente) {
      if (typeof window.VLibras?.Widget === "function") {
        concluir();
      } else {
        scriptExistente.addEventListener(
          "load",
          concluir,
          { once: true }
        );
        setTimeout(concluir, 4000);
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";

    script.onload = concluir;

    script.onerror = () => {
      carregandoVlibras = false;
      preferencias.vlibras = false;

      $("a6-libras").disabled = false;
      $("a6-libras").checked = false;

      script.remove();

      atualizarVisibilidadeVlibras();
      salvar();

      avisar("VLibras não carregou. Confira sua internet.");
    };

    document.body.appendChild(script);
  }

  $("a6-libras").addEventListener(
    "change",
    (evento) => {
      preferencias.vlibras = evento.target.checked;

      salvar();
      atualizarVisibilidadeVlibras();

      if (preferencias.vlibras) {
        carregarVlibras();
      } else {
        avisar("VLibras desativado.");
      }
    }
  );

  // LEGENDAS

  function aplicarLegendas() {
    document.querySelectorAll("video").forEach((video) => {
      for (const faixa of video.textTracks) {
        if (
          faixa.kind === "captions" ||
          faixa.kind === "subtitles"
        ) {
          faixa.mode = preferencias.legendas
            ? "showing"
            : "disabled";
        }
      }
    });
  }

  $("a6-legendas").addEventListener(
    "change",
    (evento) => {
      preferencias.legendas = evento.target.checked;

      aplicarLegendas();
      salvar();

      avisar(
        preferencias.legendas
          ? "Legendas disponíveis ativadas."
          : "Legendas desativadas."
      );
    }
  );

  // ALTO CONTRASTE E CORES

  function luminancia(cor) {
    const valores = [1, 3, 5].map((indice) => {
      const numero = parseInt(
        cor.slice(indice, indice + 2),
        16
      ) / 255;

      return numero <= 0.04045
        ? numero / 12.92
        : ((numero + 0.055) / 1.055) ** 2.4;
    });

    return (
      0.2126 * valores[0] +
      0.7152 * valores[1] +
      0.0722 * valores[2]
    );
  }

  function taxaContraste(cor1, cor2) {
    const a = luminancia(cor1);
    const b = luminancia(cor2);

    return (
      (Math.max(a, b) + 0.05) /
      (Math.min(a, b) + 0.05)
    );
  }

  function aplicarContraste() {
    const html = document.documentElement;

    html.classList.remove(
      "a6-contraste-escuro",
      "a6-contraste-claro",
      "a6-contraste-personalizado"
    );

    const modo = preferencias.contraste;

    html.classList.toggle(
      "a6-tema-acessivel",
      modo !== "normal"
    );

    if (modo === "normal") {
      html.style.removeProperty("--a6-cor-fundo");
      html.style.removeProperty("--a6-cor-texto");
      return;
    }

    let fundo = "#000000";
    let texto = "#ffffff";

    if (modo === "claro") {
      fundo = "#ffffff";
      texto = "#000000";
    }

    if (modo === "personalizado") {
      fundo = preferencias.fundo;
      texto = preferencias.texto;
    }

    html.style.setProperty("--a6-cor-fundo", fundo);
    html.style.setProperty("--a6-cor-texto", texto);

    html.classList.add("a6-contraste-" + modo);
  }

  $("a6-contraste").addEventListener(
    "change",
    (evento) => {
      preferencias.contraste = evento.target.checked
        ? "escuro"
        : "normal";

      aplicarContraste();
      sincronizar();
      salvar();
    }
  );

  $("a6-modo-contraste").addEventListener(
    "change",
    (evento) => {
      preferencias.contraste = evento.target.value;

      aplicarContraste();
      sincronizar();
      salvar();
    }
  );

  $("a6-aplicar-cores").addEventListener(
    "click",
    () => {
      const fundo = $("a6-cor-fundo").value;
      let texto = $("a6-cor-texto").value;

      if (taxaContraste(fundo, texto) < 4.5) {
        texto = taxaContraste(fundo, "#ffffff") >= 4.5
          ? "#ffffff"
          : "#000000";

        avisar(
          "A cor do texto foi ajustada para melhorar o contraste."
        );
      } else {
        avisar("Cores personalizadas aplicadas.");
      }

      preferencias.fundo = fundo;
      preferencias.texto = texto;
      preferencias.contraste = "personalizado";

      aplicarContraste();
      sincronizar();
      salvar();
    }
  );

  // TAMANHO DO TEXTO

  function aplicarFonte() {
    const html = document.documentElement;

    const tamanho = Math.max(
      100,
      Math.min(180, Number(preferencias.tamanhoFonte))
    );

    html.classList.toggle(
      "a6-texto-maior",
      tamanho > 100
    );

    // Controla realmente o valor do slider.
    html.style.fontSize = tamanho + "%";
  }

  $("a6-texto").addEventListener(
    "change",
    (evento) => {
      preferencias.tamanhoFonte =
        evento.target.checked ? 130 : 100;

      aplicarFonte();
      sincronizar();
      salvar();
    }
  );

  $("a6-fonte").addEventListener(
    "input",
    (evento) => {
      preferencias.tamanhoFonte =
        Number(evento.target.value);

      aplicarFonte();
      sincronizar();
      salvar();
    }
  );

  // ÍCONES, ESPAÇAMENTO E BOTÕES

  $("a6-icones").addEventListener(
    "change",
    (evento) => {
      preferencias.iconesReforcados =
        evento.target.checked;

      aplicarPreferencias();
      salvar();
    }
  );

  $("a6-espacamento").addEventListener(
    "change",
    (evento) => {
      preferencias.espacamento =
        evento.target.checked;

      aplicarPreferencias();
      salvar();
    }
  );

  $("a6-botoes").addEventListener(
    "change",
    (evento) => {
      preferencias.controlesGrandes =
        evento.target.checked;

      aplicarPreferencias();
      salvar();
    }
  );

  // LEITURA EM VOZ ALTA

  function pararLeitura() {
    lendo = false;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    $("a6-voz").checked = false;
  }

  function obterConteudo() {
    const principal =
      document.querySelector("main") ||
      document.querySelector('[role="main"]') ||
      document.getElementById("conteudo") ||
      document.getElementById("site");

    if (principal) {
      return principal.innerText.trim();
    }

    // Se não existe main, lê a página
    // sem incluir o painel de acessibilidade.
    const copia = document.body.cloneNode(true);

    copia.querySelectorAll(
      "#a6-painel, #a6-abrir, [vw], script, style, nav"
    ).forEach((elemento) => elemento.remove());

    return copia.textContent.trim();
  }

  $("a6-voz").addEventListener(
    "change",
    (evento) => {
      if (!evento.target.checked) {
        pararLeitura();
        avisar("Leitura interrompida.");
        return;
      }

      if (
        !("speechSynthesis" in window) ||
        !("SpeechSynthesisUtterance" in window)
      ) {
        evento.target.checked = false;

        avisar(
          "Seu navegador não possui leitura em voz alta."
        );
        return;
      }

      const texto = obterConteudo();

      if (!texto) {
        evento.target.checked = false;
        avisar("Não encontrei conteúdo para ler.");
        return;
      }

      window.speechSynthesis.cancel();

      const fala = new SpeechSynthesisUtterance(
        texto.slice(0, 4000)
      );

      fala.lang = "pt-BR";
      fala.rate = 0.95;

      fala.onend = () => {
        lendo = false;
        $("a6-voz").checked = false;
      };

      fala.onerror = () => {
        lendo = false;
        $("a6-voz").checked = false;
        avisar("A leitura não pôde continuar.");
      };

      lendo = true;
      window.speechSynthesis.speak(fala);

      avisar("Leitura iniciada.");
    }
  );

  // NAVEGAÇÃO POR TECLADO

  $("a6-ir-conteudo").addEventListener(
    "click",
    () => {
      const principal =
        document.querySelector("main") ||
        document.querySelector('[role="main"]') ||
        document.getElementById("conteudo");

      painel.close();

      if (principal) {
        if (!principal.hasAttribute("tabindex")) {
          principal.setAttribute("tabindex", "-1");
        }

        requestAnimationFrame(() => principal.focus());
      }
    }
  );

  document.addEventListener("keydown", (evento) => {
    if (
      evento.altKey &&
      evento.shiftKey &&
      evento.key.toLowerCase() === "a"
    ) {
      evento.preventDefault();

      if (painel.open) {
        painel.close();
      } else {
        abrir.click();
      }
    }
  });

  // SINCRONIZAR OS CONTROLES

  function sincronizar() {
    $("a6-libras").checked = preferencias.vlibras;
    $("a6-legendas").checked = preferencias.legendas;

    $("a6-texto").checked =
      Number(preferencias.tamanhoFonte) > 100;

    $("a6-contraste").checked =
      preferencias.contraste !== "normal";

    $("a6-fonte").value = preferencias.tamanhoFonte;

    $("a6-fonte-valor").textContent =
      preferencias.tamanhoFonte + "%";

    $("a6-modo-contraste").value =
      preferencias.contraste;

    $("a6-cor-fundo").value = preferencias.fundo;
    $("a6-cor-texto").value = preferencias.texto;

    $("a6-icones").checked =
      preferencias.iconesReforcados;

    $("a6-espacamento").checked =
      preferencias.espacamento;

    $("a6-botoes").checked =
      preferencias.controlesGrandes;
  }

  // APLICAR TODAS AS PREFERÊNCIAS

  function aplicarPreferencias() {
    const html = document.documentElement;

    aplicarFonte();
    aplicarContraste();
    aplicarLegendas();
    atualizarVisibilidadeVlibras();

    html.classList.toggle(
      "a6-mais-espaco",
      preferencias.espacamento
    );

    html.classList.toggle(
      "a6-botoes-grandes",
      preferencias.controlesGrandes
    );

    html.classList.toggle(
      "a6-icones-apoio",
      preferencias.iconesReforcados
    );

    sincronizar();
  }

  // RESTAURAR

  $("a6-restaurar").addEventListener(
    "click",
    () => {
      pararLeitura();

      preferencias = { ...padrao };

      aplicarPreferencias();
      salvar();

      avisar("Configurações restauradas.");
    }
  );

  // INICIALIZAÇÃO

  aplicarPreferencias();

  if (preferencias.vlibras) {
    carregarVlibras();
  }

  document.querySelectorAll("video").forEach((video) => {
    video.addEventListener(
      "loadedmetadata",
      aplicarLegendas
    );
  });

})();