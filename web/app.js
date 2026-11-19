(() => {
  let disponiveis = [];
  let cartoes = [];
  let indice = 0;
  let temporizador = null;
  let controle = null;
  let filtro = "todos";
  let reconhecimento = null;

  const el = id => document.getElementById(id);

  const esc = s => String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

  function parar() {
    clearInterval(temporizador);
    temporizador = null;
  }

  function atualizar() {
    const item = cartoes[indice];

    el("contador").textContent = cartoes.length
      ? `${indice + 1} / ${cartoes.length}`
      : "0 / 0";

    el("visual").innerHTML = item
      ? `<img src="${esc(item.imagem)}" alt="Ilustração de ${esc(item.rotulo)}">`
      : `<div class="placeholder">
           <span>✦</span>
           <strong>Nenhum sinal</strong>
           <small>Sua tradução aparece aqui</small>
         </div>`;

    el("rotulo").textContent = item
      ? "SINAL SELECIONADO"
      : "AGUARDANDO FRASE";

    el("nome-sinal").textContent = item
      ? item.rotulo
      : "Aguardando frase";

    el("reproduzir").disabled = !cartoes.length;
    el("anterior").disabled = indice === 0;
    el("proximo").disabled = indice >= cartoes.length - 1;

    el("miniaturas").innerHTML = cartoes.map((c, i) => `
      <button
        type="button"
        class="thumb ${indice === i ? "selected" : ""}"
        data-indice="${i}"
      >
        <img src="${esc(c.imagem)}" alt="">
        <span>${esc(c.rotulo)}</span>
      </button>
    `).join("");
  }

  async function traduzir(texto = el("frase").value) {
    parar();
    controle?.abort();
    texto = texto.trim();

    if (!texto) {
      cartoes = [];
      indice = 0;
      el("ausentes").hidden = true;
      el("mensagem").textContent = "Digite ou fale uma frase para começar.";
      atualizar();
      return;
    }

    controle = new AbortController();
    el("traduzir").disabled = true;
    el("mensagem").textContent = "Procurando sinais disponíveis…";

    try {
      const resposta = await fetch("/api/cartoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frase: texto }),
        signal: controle.signal
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw Error(dados.erro || "Erro ao consultar os sinais");
      }

      cartoes = dados.cartoes || [];
      indice = 0;

      el("mensagem").textContent = cartoes.length
        ? `${cartoes.length} ${cartoes.length === 1 ? "sinal disponível" : "sinais disponíveis"} para esta frase.`
        : "Nenhum sinal disponível para esta frase.";

      const faltantes = dados.semCartao || [];
      el("ausentes").hidden = !faltantes.length;

      el("ausentes").innerHTML = faltantes.length
        ? `<strong>Sem imagem disponível</strong>
           <div>${faltantes.map(p =>
             `<span class="missing-chip">${esc(p)}</span>`
           ).join("")}</div>`
        : "";

      atualizar();
    } catch (e) {
      if (e.name !== "AbortError") {
        cartoes = [];
        indice = 0;
        atualizar();
        el("mensagem").textContent =
          "Não foi possível consultar o Python. Verifique o servidor.";
      }
    } finally {
      el("traduzir").disabled = false;
    }
  }

  function catalogo() {
    const termo = el("pesquisa").value.toLocaleLowerCase("pt-BR");

    const itens = disponiveis.filter(i =>
      filtro !== "pendentes" &&
      i.rotulo.toLocaleLowerCase("pt-BR").includes(termo)
    );

    el("catalogo").innerHTML = itens.map(i => `
      <button
        type="button"
        class="catalog-item available"
        data-busca="${esc(i.busca)}"
      >
        <img src="${esc(i.imagem)}" alt="" loading="lazy">
        <span class="catalog-name">${esc(i.rotulo)}</span>
        <span class="catalog-tag yes">Com imagem</span>
      </button>
    `).join("");

    if (!itens.length) {
      el("catalogo").innerHTML =
        "<p>Nenhum sinal encontrado neste filtro.</p>";
    }
  }

  async function carregarCatalogo() {
    try {
      const resposta = await fetch("/api/catalogo");
      if (!resposta.ok) throw Error();
      disponiveis = await resposta.json();
      catalogo();
    } catch {
      el("catalogo").textContent =
        "Não foi possível carregar o catálogo.";
    }
  }

  el("form").addEventListener("submit", e => {
    e.preventDefault();
    traduzir();
  });

  el("limpar").onclick = () => {
    parar();
    controle?.abort();
    el("frase").value = "";
    cartoes = [];
    indice = 0;
    el("ausentes").hidden = true;
    el("mensagem").textContent =
      "Fale ou digite uma frase para começar.";
    atualizar();
  };

  el("anterior").onclick = () => {
    parar();
    indice = Math.max(0, indice - 1);
    atualizar();
  };

  el("proximo").onclick = () => {
    parar();
    indice = Math.min(cartoes.length - 1, indice + 1);
    atualizar();
  };

  el("reproduzir").onclick = () => {
    parar();
    if (!cartoes.length) return;

    indice = 0;
    atualizar();

    temporizador = setInterval(() => {
      if (indice >= cartoes.length - 1) {
        parar();
        return;
      }

      indice++;
      atualizar();
    }, 1700);
  };

  el("miniaturas").onclick = e => {
    const botao = e.target.closest("[data-indice]");

    if (botao) {
      parar();
      indice = Number(botao.dataset.indice);
      atualizar();
    }
  };

  el("catalogo").onclick = e => {
    const botao = e.target.closest("[data-busca]");

    if (botao) {
      el("frase").value = botao.dataset.busca;
      traduzir(botao.dataset.busca);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  el("pesquisa").oninput = catalogo;

  document.querySelectorAll("[data-filtro]").forEach(botao => {
    botao.onclick = () => {
      filtro = botao.dataset.filtro;

      document.querySelectorAll("[data-filtro]").forEach(b => {
        b.classList.toggle("active", b === botao);
      });

      catalogo();
    };
  });

  const SR = window.SpeechRecognition ||
             window.webkitSpeechRecognition;

  if (!SR) {
    el("falar").disabled = true;
    el("voz").textContent =
      "Reconhecimento de voz indisponível neste navegador.";
  } else {
    el("falar").onclick = () => {
      if (reconhecimento) {
        reconhecimento.stop();
        return;
      }

      const mic = new SR();
      reconhecimento = mic;
      mic.lang = "pt-BR";
      mic.interimResults = true;

      mic.onstart = () => {
        el("falar").textContent = "■ Parar";
        el("voz").textContent = "Ouvindo… fale sua frase.";
      };

      mic.onresult = e => {
        const resultados = Array.from(e.results);

        const texto = resultados
          .map(r => r[0].transcript)
          .join(" ")
          .slice(0, 500);

        el("frase").value = texto;

        if (resultados.every(r => r.isFinal)) {
          el("voz").textContent = "Fala reconhecida.";
          traduzir(texto);
        }
      };

      mic.onerror = e => {
        el("voz").textContent = {
          "not-allowed": "Permita o microfone.",
          "no-speech": "Nenhuma fala detectada.",
          "audio-capture": "Microfone indisponível."
        }[e.error] || "Falha ao reconhecer a fala.";
      };

      mic.onend = () => {
        reconhecimento = null;
        el("falar").textContent = "● Falar";

        if (el("voz").textContent.startsWith("Ouvindo")) {
          el("voz").textContent = "Microfone pronto.";
        }
      };

      try {
        mic.start();
      } catch {
        reconhecimento = null;
        el("voz").textContent =
          "Não foi possível iniciar o microfone.";
      }
    };
  }

  carregarCatalogo();
  atualizar();
})();
