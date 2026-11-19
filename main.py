import json
import re
import unicodedata
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PASTA_BASE = Path(__file__).resolve().parent

with (PASTA_BASE / "catalogo.json").open(encoding="utf-8") as arquivo:
    ITENS = json.load(arquivo)

CATALOGO = {}

for item in ITENS:
    for termos in [item["termos"], *item.get("variantes", [])]:
        CATALOGO[tuple(termos)] = (item["rotulo"], item["imagem"])


CUSTO_PULAR = (1, 0)
CUSTO_CARTAO = (0, 1)
INFINITO = (float("inf"), float("inf"))

def normalizar(palavra):
    return "".join(
        letra
        for letra in unicodedata.normalize("NFD", palavra.casefold())
        if not unicodedata.combining(letra)
    )


def somar(a, b):
    return (a[0] + b[0], a[1] + b[1])


def opcoes(termos, inicio):
    """Jogadas possíveis a partir de `inicio`: (fim, custo, rotulo, imagem)."""
    jogadas = [(inicio + 1, CUSTO_PULAR, None, None)]

    for expressao, (rotulo, imagem) in CATALOGO.items():
        fim = inicio + len(expressao)

        if tuple(termos[inicio:fim]) == expressao:
            jogadas.append((fim, CUSTO_CARTAO, rotulo, imagem))

    return jogadas


def tabulacao(termos):
    total = len(termos)
    tabela = [INFINITO] * (total + 1)
    escolhas = [None] * total
    tabela[total] = (0, 0)

    for inicio in range(total - 1, -1, -1):
        for jogada in opcoes(termos, inicio):
            proposta = somar(jogada[1], tabela[jogada[0]])

            if proposta < tabela[inicio]:
                tabela[inicio] = proposta
                escolhas[inicio] = jogada

    return escolhas


def memoizacao(termos):
    total = len(termos)
    memo = {}
    escolhas = [None] * total

    def melhor(inicio):
        if inicio == total:
            return (0, 0)

        if inicio in memo:
            return memo[inicio]

        melhorCusto = INFINITO

        for jogada in opcoes(termos, inicio):
            proposta = somar(jogada[1], melhor(jogada[0]))

            if proposta < melhorCusto:
                melhorCusto = proposta
                escolhas[inicio] = jogada

        memo[inicio] = melhorCusto
        return melhorCusto

    melhor(0)
    return escolhas


METODOS = {
    "tabulacao": tabulacao,
    "memoizacao": memoizacao,
}


def selecionarCartoes(frase, metodo="tabulacao"):
    palavras = re.findall(
        r"[^\W\d_]+|\d+",
        unicodedata.normalize("NFC", frase)
    )

    termos = [normalizar(palavra) for palavra in palavras]
    escolhas = METODOS[metodo](termos)

    cartoes = []
    semCartao = []
    inicio = 0

    while inicio < len(termos):
        fim, _, rotulo, imagem = escolhas[inicio]

        if rotulo is None:
            semCartao.append(palavras[inicio])
        else:
            cartoes.append({"rotulo": rotulo, "imagem": imagem})

        inicio = fim

    return {
        "cartoes": cartoes,
        "semCartao": semCartao
    }


class PaginaSinalis(SimpleHTTPRequestHandler):

    def do_GET(self):
        if self.path == "/api/catalogo":
            self.enviarJson(200, [
                {
                    "rotulo": item["rotulo"],
                    "imagem": item["imagem"],
                    "busca": " ".join(item["termos"])
                }
                for item in ITENS
            ])
            return

        super().do_GET()

    def do_POST(self):
        if self.path != "/api/cartoes":
            self.send_error(404)
            return

        try:
            tamanho = int(
                self.headers.get("Content-Length", "0")
            )

            if not 0 < tamanho <= 8192:
                raise ValueError

            dados = json.loads(self.rfile.read(tamanho))

            frase = (
                dados.get("frase")
                if isinstance(dados, dict)
                else None
            )

            metodo = (
                dados.get("metodo", "tabulacao")
                if isinstance(dados, dict)
                else None
            )

            if metodo not in METODOS:
                raise ValueError

            if (
                not isinstance(frase, str)
                or not 0 < len(frase.strip()) <= 500
            ):
                raise ValueError

        except (ValueError, UnicodeError):
            self.enviarJson(400, {
                "erro": "Informe uma frase de até 500 caracteres e, se quiser, metodo \"tabulacao\" ou \"memoizacao\"."
            })
            return

        self.enviarJson(200, selecionarCartoes(frase, metodo))

    def enviarJson(self, status, dados):
        corpo = json.dumps(
            dados,
            ensure_ascii=False
        ).encode("utf-8")

        self.send_response(status)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)


if __name__ == "__main__":
    pastaWeb = Path(__file__).resolve().parent / "web"

    pagina = partial(
        PaginaSinalis,
        directory=str(pastaWeb)
    )

    with ThreadingHTTPServer(
        ("127.0.0.1", 8000),
        pagina
    ) as servidor:
        print("Sinalis aberto em http://localhost:8000")

        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            pass