#!/usr/bin/env node
/**
 * gemini-grounding-mcp
 * -------------------------------------------------------------
 * Servidor MCP (Model Context Protocol) que dá a qualquer cliente
 * compatível — como o Claude / Claude Code — acesso a busca web com
 * "grounding" do Google Gemini (Google Search), retornando a resposta
 * acompanhada das fontes citadas.
 *
 * Diferenciais desta implementação:
 *  - Saída ENXUTA: devolve apenas o texto + a lista de fontes.
 *    Não inclui o bloco de HTML/CSS da "search box" do Google
 *    (que, em outras implementações, chega a ~50% do payload e
 *    desperdiça tokens do cliente).
 *  - Logs SEMPRE em stderr. O stdout é reservado ao protocolo MCP;
 *    escrever nele corromperia a comunicação com o cliente.
 *
 * Licença: MIT.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error(
    "[gemini-grounding-mcp] ERRO: a variável de ambiente GEMINI_API_KEY não está definida.\n" +
      "Obtenha uma chave gratuita em https://aistudio.google.com/apikey e exporte-a antes de iniciar."
  );
  process.exit(1);
}

// Modelo configurável; padrão estável e barato para grounding.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey });

const server = new McpServer({
  name: "gemini-grounding-mcp",
  version: "1.0.0",
});

server.registerTool(
  "search_with_grounding",
  {
    title: "Busca com grounding (Gemini)",
    description:
      "Busca informação atual na web usando o grounding (Google Search) do Google Gemini " +
      "e retorna a resposta com a lista de fontes citadas. Saída enxuta: apenas texto + fontes.",
    inputSchema: {
      query: z.string().describe("A pergunta ou termo a pesquisar."),
      context: z
        .string()
        .optional()
        .describe("Contexto adicional opcional para orientar a resposta."),
    },
  },
  async ({ query, context }) => {
    const prompt = context ? `${context}\n\nPergunta: ${query}` : query;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    const text = response.text ?? "(resposta vazia)";

    // Extrai apenas título + URL de cada fonte; descarta o resto.
    const chunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources: string[] = [];
    for (const chunk of chunks) {
      const web = chunk.web;
      if (web?.uri) {
        sources.push(`${sources.length + 1}. ${web.title ?? web.uri} — ${web.uri}`);
      }
    }

    const sourcesBlock =
      sources.length > 0 ? `\n\nFontes:\n${sources.join("\n")}` : "";

    return { content: [{ type: "text", text: text + sourcesBlock }] };
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // IMPORTANTE: stderr, nunca stdout (stdout pertence ao protocolo MCP).
  console.error("[gemini-grounding-mcp] servidor ativo via stdio.");
}

main().catch((err) => {
  console.error("[gemini-grounding-mcp] falha fatal:", err);
  process.exit(1);
});
