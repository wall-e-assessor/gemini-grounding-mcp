# gemini-grounding-mcp

Servidor **MCP (Model Context Protocol)** que dá ao **Claude** — e a qualquer cliente compatível com MCP — **busca web com _grounding_ do Google Gemini** (Google Search), retornando a resposta acompanhada das **fontes citadas**.

## Por que este servidor

- **Saída enxuta.** Devolve só o **texto + a lista de fontes**. Implementações comuns anexam o bloco de HTML/CSS da "search box" do Google, que pode representar ~50% do payload e desperdiçar tokens do cliente. Aqui esse lixo é descartado.
- **Protocolo limpo.** Todo log vai para `stderr`. O `stdout` é reservado ao protocolo MCP — escrever nele corromperia a conexão.
- **Uma dependência de IA.** Usa o SDK oficial `@google/genai`.

## Manual didático para iniciantes

Nunca usou o Terminal? Siga o passo a passo completo, com explicações aula por aula:

- [Manual didático (Markdown)](./docs/MANUAL_DIDATICO.md)
- [Manual didático (PDF)](./docs/Manual_Didatico_Gemini_Claude.pdf)
- [Painel de apresentação (PDF, formato slides)](./docs/Painel_Apresentacao_Gemini_Claude.pdf)
- [Manual de instalação resumido (PDF, 4 páginas)](./docs/Manual_Instalacao_Resumido.pdf)

## Requisitos

- **Node.js 18+**
- Uma **chave de API do Gemini** (gratuita): https://aistudio.google.com/apikey

## Instalação

```bash
git clone https://github.com/wall-e-assessor/gemini-grounding-mcp.git
cd gemini-grounding-mcp
npm install
npm run build
```

Isso gera o executável em `dist/index.js`.

## Configuração da chave

O servidor lê a chave da variável de ambiente **`GEMINI_API_KEY`**.

- **Em produção (via cliente MCP):** passe a chave na configuração do cliente (veja abaixo) — você **não** precisa de arquivo `.env`.
- **Para testar localmente:** copie `.env.example` para `.env`, preencha a chave e rode:
  ```bash
  npm run dev
  ```
  (usa o `--env-file` nativo do Node; nenhuma dependência extra.)

> ⚠️ **Nunca** faça commit do seu `.env` nem exponha a chave. O `.gitignore` já bloqueia o `.env`.

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `GEMINI_API_KEY` | sim | — | Chave do Google AI Studio |
| `GEMINI_MODEL` | não | `gemini-2.5-flash` | Modelo do Gemini |

## Usar no Claude Code

Registre o servidor no escopo de usuário (vale para todas as sessões). Troque o caminho e a chave pelos seus:

> As opções (`--scope`, `--env`, `--transport`) vêm **antes** do nome do servidor. Se o nome vier logo depois de `--env`, o CLI o lê como mais uma variável e recusa o comando; por isso o `--transport stdio` fica entre os dois ([documentação oficial](https://code.claude.com/docs/en/mcp)).

```bash
claude mcp add --scope user \
  --env GEMINI_API_KEY=SUA_CHAVE_AQUI \
  --transport stdio \
  gemini-grounding \
  -- node /caminho/absoluto/para/gemini-grounding-mcp/dist/index.js
```

No **Windows** (Prompt de Comando), use o caminho completo do `node`, com cada caminho entre aspas. No PowerShell, troque o `^` do fim das linhas por `` ` ``. Exemplo:

```bash
claude mcp add --scope user ^
  --env GEMINI_API_KEY=SUA_CHAVE_AQUI ^
  --transport stdio ^
  gemini-grounding ^
  -- "C:\Program Files\nodejs\node.exe" "C:\caminho\gemini-grounding-mcp\dist\index.js"
```

Reinicie o cliente para que a ferramenta apareça.

### Configuração equivalente em JSON

```json
{
  "mcpServers": {
    "gemini-grounding": {
      "command": "node",
      "args": ["/caminho/absoluto/para/gemini-grounding-mcp/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "SUA_CHAVE_AQUI"
      }
    }
  }
}
```

## Ferramenta exposta

### `search_with_grounding`

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `query` | string | sim | A pergunta ou termo a pesquisar |
| `context` | string | não | Contexto adicional para orientar a resposta |

**Retorno:** texto da resposta seguido de uma seção `Fontes:` com `título — URL` de cada fonte.

## Aviso

As respostas vêm de um modelo de linguagem com busca. Trate-as como **dado a verificar**, não como verdade absoluta — confirme fatos críticos na fonte oficial.

## Autor

@pro.hudsontravassos

## Licença

[MIT](./LICENSE)
