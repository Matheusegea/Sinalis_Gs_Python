# Sinalis — Global Solution de Dynamic Programming

## Integrantes

| RM | Nome |
|----|------|
| RM563490 | Matheus Tozarelli Egea |
| RM562098 | Ana Luiza Tibiriçá da Paixão |
| RM563643 | Rafael Lorenzini Xavier |
| RM565573 | Luara Martins De Oliveira |

## Execução

1. Instale Python 3
2. Abra um terminal nesta pasta e execute `python main.py` (Windows também aceita `py main.py`).
3. Acesse `http://localhost:8000`.

## Estrutura

- `main.py`: servidor HTTP e algoritmos de programação dinâmica (**tabulação** e **memoização**).
- `catalogo.json`: 60 sinais, nomes, caminhos de imagens e variantes de busca.
- `web/index.html`: interface HTML estática.
- `web/style.css`: estilos da interface.
- `web/app.js`: JavaScript puro, interação, voz e chamadas ao Python.
- `web/img/sinais/`: 60 imagens WebP.

## Algoritmos (Programação Dinâmica)

**Problema (CitizenTech):** converter uma frase em uma sequência de cartões de Libras. Há expressões de várias palavras ("por favor", "bom dia"), então escolher cada palavra isoladamente falha; é preciso segmentar a frase de forma ótima: **maximizar as palavras cobertas por cartões** e, em empate, **usar menos cartões**.

**Subproblema:** `melhor(i)` = melhor forma de cobrir as palavras da posição `i` até o fim. Em cada posição há duas opções: pular a palavra (sem cartão) ou usar uma expressão do catálogo que começa ali. O custo é a dupla `(palavras sem cartão, quantidade de cartões)`, comparada nessa ordem. Como `melhor(i)` depende de `melhor(i+1)` e `melhor(i+k)`, os subproblemas se sobrepõem, e é isso que justifica a programação dinâmica.

Implementamos as duas técnicas, e ambas resolvem o mesmo problema:

1. **Tabulação** (`tabulacao`, padrão): abordagem bottom-up, **sem recursão**. Uma lista `tabela` guarda os resultados intermediários e é preenchida de trás para frente: `tabela[i]` = menor custo para cobrir `termos[i:]`. Uma lista `escolhas` guarda a jogada vencedora de cada posição para reconstruir a resposta.
2. **Memoização** (`memoizacao`): abordagem top-down, **com recursão**. A função `melhor(i)` chama a si mesma para os subproblemas menores e guarda cada resultado no dicionário `memo`, de modo que cada posição é calculada uma única vez.

As duas devolvem o mesmo resultado (verificado em milhares de frases aleatórias). A tabulação evita o limite de profundidade da recursão e é o método padrão da API; a memoização expressa a definição do problema de forma mais direta.

**Por que esta escolha:** segmentação com subproblemas sobrepostos e subestrutura ótima é o caso clássico de PD; sem ela, uma busca exaustiva testaria todas as combinações de segmentação, o que cresce exponencialmente com o tamanho da frase.

**Complexidade:** O(n × C × L) nas duas, com n palavras, C expressões/variantes do catálogo e L comprimento máximo de expressão. A memória é O(n).

`GET /api/catalogo` fornece os 60 sinais à interface. `POST /api/cartoes` recebe JSON como `{"frase":"Bom dia, eu vou estudar"}` e retorna os cartões e as palavras sem imagem. O campo opcional `"metodo"` escolhe o algoritmo: `"tabulacao"` (padrão) ou `"memoizacao"`.

O reconhecimento de voz usa a API do navegador, quando disponível, e pode exigir internet. As imagens são ilustrativas e os sinais devem ser validados por alguém com conhecimento em Libras antes de uso educacional.