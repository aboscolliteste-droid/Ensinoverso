
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { Lesson, Questao, Resultado, User, Turma } from "../types";

export const ExportService = {
  exportToDocx: async (lesson: Lesson, questoes: Questao[]) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Cabeçalho da Escola
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: lesson.escola.toUpperCase(), bold: true, size: 28, color: "000000" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Componente Curricular: ${lesson.componenteCurricular}`, size: 22 }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),

          // Título da Aula
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: lesson.titulo.toUpperCase(), bold: true, size: 36, color: "E65100" }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 400 } }),

          // BNCC Section
          ...(lesson.habilidades && lesson.habilidades.length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "HABILIDADES BNCC:", bold: true, size: 20 })],
              spacing: { before: 200, after: 100 }
            }),
            ...lesson.habilidades.map(h => new Paragraph({
              children: [new TextRun({ text: `• ${h}`, size: 18, italic: true })],
              spacing: { after: 50 }
            }))
          ] : []),

          new Paragraph({ text: "", spacing: { after: 400 } }),

          // Texto Base
          new Paragraph({
            children: [new TextRun({ text: "TEXTO DE APOIO", bold: true, size: 22 })],
            spacing: { after: 200 }
          }),
          ...lesson.texto.split('\n').map(p => new Paragraph({
            children: [new TextRun({ text: p, size: 22 })],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFY
          })),

          // Materiais Extras
          ...(lesson.materiaisExtras && lesson.materiaisExtras.length > 0 ? [
            new Paragraph({ text: "", spacing: { before: 400 } }),
            new Paragraph({
              children: [new TextRun({ text: "MATERIAIS COMPLEMENTARES:", bold: true, size: 22 })],
              spacing: { after: 200 }
            }),
            ...lesson.materiaisExtras.map(link => new Paragraph({
               children: [
                 new TextRun({ text: "🔗 ", size: 20 }),
                 new TextRun({ text: link, color: "0000FF", underline: {}, size: 20 })
               ],
               spacing: { after: 100 }
            }))
          ] : []),

          // Questões
          ...(questoes.length > 0 ? [
            new Paragraph({ text: "", spacing: { before: 600 } }),
            new Paragraph({
              children: [new TextRun({ text: "ATIVIDADES DE FIXAÇÃO", bold: true, size: 26, color: "E65100" })],
              spacing: { after: 300 },
              alignment: AlignmentType.CENTER
            }),
            ...questoes.flatMap((q, i) => [
              new Paragraph({
                children: [
                  new TextRun({ text: `${i + 1}. `, bold: true, size: 22 }),
                  new TextRun({ text: q.pergunta, size: 22 })
                ],
                spacing: { before: 300, after: 150 }
              }),
              ...q.alternativas.map((alt, aIdx) => new Paragraph({
                children: [
                  new TextRun({ text: `${String.fromCharCode(65 + aIdx)}) `, bold: true, size: 20 }),
                  new TextRun({ text: alt, size: 20 })
                ],
                indent: { left: 720 },
                spacing: { after: 80 }
              }))
            ])
          ] : [])
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lesson.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  exportReportToDocx: async (lesson: Lesson, results: Resultado[], users: User[], turmaName: string) => {
    const totalAlunos = results.length;
    const totalQuestoes = results[0]?.total || 0;
    const acertosPorQuestao = new Array(totalQuestoes).fill(0);
    
    results.forEach(r => {
      if (r.detalhes) {
        r.detalhes.forEach((acertou, idx) => {
          if (acertou && idx < totalQuestoes) acertosPorQuestao[idx]++;
        });
      }
    });

    const taxaGeral = totalAlunos > 0 && totalQuestoes > 0 
      ? (results.reduce((acc, curr) => acc + curr.acertos, 0) / (totalAlunos * totalQuestoes)) * 100 
      : 0;

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "RELATÓRIO DE DESEMPENHO POR TURMA", bold: true, size: 32, color: "E65100" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `AULA: ${lesson.titulo.toUpperCase()}`, bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `TURMA: ${turmaName.toUpperCase()}`, bold: true, size: 26, color: "333333" }),
            ],
            spacing: { after: 400 }
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "DADOS DA TURMA NESTA AULA", bold: true, size: 22 }),
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({ children: [new TextRun({ text: `Escola: ${lesson.escola}`, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: `Componente: ${lesson.componenteCurricular}`, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: `Alunos Participantes: ${totalAlunos}`, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: `Média de Acertos: ${taxaGeral.toFixed(1)}%`, size: 20, bold: true })] }),
          new Paragraph({ text: "", spacing: { after: 400 } }),

          new Paragraph({
            children: [new TextRun({ text: "ANÁLISE DE QUESTÕES (TAXA DE SUCESSO)", bold: true, size: 22 })],
            spacing: { after: 200 }
          }),
          ...acertosPorQuestao.map((count, idx) => {
            const perc = totalAlunos > 0 ? (count / totalAlunos) * 100 : 0;
            return new Paragraph({
              children: [
                new TextRun({ text: `Questão ${idx + 1}: `, bold: true, size: 20 }),
                new TextRun({ text: `${count} acertos nesta turma (${perc.toFixed(1)}%)`, size: 20 })
              ],
              spacing: { after: 100 }
            });
          }),

          new Paragraph({ text: "", spacing: { after: 400 } }),
          new Paragraph({
            children: [new TextRun({ text: "LISTAGEM DE ALUNOS E NOTAS", bold: true, size: 22 })],
            spacing: { after: 200 }
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nome do Aluno", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Acertos/Total", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "% Acerto", bold: true })] })] }),
                ]
              }),
              ...results.sort((a,b) => b.acertos - a.acertos).map(r => {
                const aluno = users.find(u => u.id === r.alunoId);
                const perc = (r.acertos / r.total) * 100;
                return new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: aluno?.nome || "Estudante" })] }),
                    new TableCell({ children: [new Paragraph({ text: `${r.acertos}/${r.total}` })] }),
                    new TableCell({ children: [new Paragraph({ text: `${perc.toFixed(0)}%` })] }),
                  ]
                });
              })
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${turmaName.replace(/\s+/g, '_')}_${lesson.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
