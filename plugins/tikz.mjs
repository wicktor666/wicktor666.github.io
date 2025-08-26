import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TEMPLATE_SOURCE = `
\\documentclass{standalone}
\\usepackage{xcolor}
\\usepackage{pgfplots}
\\usepackage{tikz}
\\begin{document}
\\nopagecolor
%LIBRARY
\\begin{tikzpicture}%ARG
%BODY
\\end{tikzpicture}
\\end{document}
`;

function tikzToDataURL(body, library, arg) {
  const mainSource = TEMPLATE_SOURCE.replace("%BODY", body)
    .replace("%ARG", arg ? `[${arg}]` : "")
    .replace("%LIBRARY", library ? `\\usetikzlibrary{${library}}` : "");
  const tmpDir = mkdtempSync(join(tmpdir(), "tikz-"));
  console.debug(`Writing TikZ temporaries to ${tmpDir}`);
  writeFileSync(join(tmpDir, "main.tex"), mainSource);
  execSync("pdflatex main.tex", { cwd: tmpDir });
  execSync("pdf2svg main.pdf main.svg", { cwd: tmpDir });
  const data = readFileSync(join(tmpDir, "main.svg"), { encoding: "base64" });
  return `data:image/svg+xml;base64,${data}`;
}

const tikzDirective = {
  name: "tikz",
  doc: "An example directive that renders TikZ figures.",
  body: { type: String, doc: "TikZ source" },
  arg: { type: String, doc: "TikZ picture arguments", required: false },
  options: {
    library: {
      type: String,
      doc: "Additional TikZ libraries to use",
    },
  },
  run(data) {
    const body = data.body ?? "";
    const url = tikzToDataURL(body, data.options?.library, data.arg);

    const img = { type: "image", url };
    return [img];
  },
};

const plugin = { name: "TikZ", directives: [tikzDirective] };

export default plugin;
