/**
 * Client-side resume export to PDF and DOCX.
 */

import type { ResumeSection } from "./resume-api";

// ── Helpers ──

function selectedEntries(section: ResumeSection): Record<string, unknown>[] {
  return section.entries.filter((e) => e._selected !== false);
}

function visibleSections(sections: ResumeSection[]) {
  return sections.filter((s) => s.visible).sort((a, b) => a.order - b.order);
}

function vis(data: Record<string, string>, key: string): boolean {
  return data[`_visible_${key}`] !== "false";
}

function bulletLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-•]\s*/, ""));
}

// ── PDF Export (html2canvas + jsPDF) ──

export async function exportToPdf(
  previewElement: HTMLElement,
  filename: string,
) {
  const html2canvas = (await import("html2canvas-pro")).default;
  const { jsPDF } = await import("jspdf");

  // Render at 2x for sharpness
  const canvas = await html2canvas(previewElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF("p", "mm", "a4");
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    0,
    position,
    imgWidth,
    imgHeight,
  );
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = -(imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      position,
      imgWidth,
      imgHeight,
    );
    heightLeft -= pageHeight;
  }

  pdf.save(`${filename}.pdf`);
}

// ── DOCX Export (docx.js) ──

export async function exportToDocx(
  sections: ResumeSection[],
  filename: string,
) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    BorderStyle,
  } = await import("docx");
  const { saveAs } = await import("file-saver");

  const children: InstanceType<typeof Paragraph>[] = [];
  const visible = visibleSections(sections);

  for (const section of visible) {
    const t = section.title;
    const entries = selectedEntries(section);

    if (t === "Header") {
      if (entries.length === 0) continue;
      const data = entries[0] as Record<string, string>;
      const name = vis(data, "full_name") ? data.full_name || "" : "";
      const title = vis(data, "title") ? data.title || "" : "";
      const contact = [
        vis(data, "location") ? data.location : "",
        vis(data, "phone") ? data.phone : "",
        vis(data, "email") ? data.email : "",
      ]
        .filter(Boolean)
        .join(" | ");
      const links = [
        vis(data, "linkedin_url") ? data.linkedin_url : "",
        vis(data, "github_url") ? data.github_url : "",
        vis(data, "portfolio_url") ? data.portfolio_url : "",
      ]
        .filter(Boolean)
        .join(" | ");

      if (name) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: name, bold: true, size: 32, font: "Calibri" }),
            ],
          }),
        );
      }
      if (title) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: title, size: 22, color: "666666", font: "Calibri" }),
            ],
          }),
        );
      }
      if (contact) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 20 },
            children: [
              new TextRun({ text: contact, size: 18, color: "888888", font: "Calibri" }),
            ],
          }),
        );
      }
      if (links) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: links, size: 16, color: "888888", font: "Calibri" }),
            ],
          }),
        );
      }
      // Divider
      children.push(
        new Paragraph({
          spacing: { after: 200 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
        }),
      );
      continue;
    }

    // Section heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
        },
        children: [
          new TextRun({
            text: t.toUpperCase(),
            bold: true,
            size: 20,
            font: "Calibri",
            color: "333333",
          }),
        ],
      }),
    );

    if (t === "Summary") {
      if (section.content) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: section.content, size: 20, font: "Calibri", color: "444444" }),
            ],
          }),
        );
      }
      continue;
    }

    if (t === "Skills") {
      for (const entry of entries) {
        const category = String(entry.category || "");
        const skills = String(entry.skills || "");
        const runs: InstanceType<typeof TextRun>[] = [];
        if (category) {
          runs.push(new TextRun({ text: `${category}: `, bold: true, size: 20, font: "Calibri" }));
        }
        runs.push(new TextRun({ text: skills, size: 20, font: "Calibri", color: "444444" }));
        children.push(new Paragraph({ spacing: { after: 60 }, children: runs }));
      }
      continue;
    }

    if (t === "Experience") {
      for (const entry of entries) {
        const role = String(entry.role ?? entry.title ?? "");
        const company = String(entry.company ?? entry.organization ?? "");
        const start = String(entry.start_date ?? "");
        const end = String(entry.end_date ?? "");
        const desc = String(entry.description ?? "");

        const titleRuns: InstanceType<typeof TextRun>[] = [];
        if (role) titleRuns.push(new TextRun({ text: role, bold: true, size: 20, font: "Calibri" }));
        if (company) titleRuns.push(new TextRun({ text: ` at ${company}`, size: 20, font: "Calibri", color: "555555" }));
        if (start || end) titleRuns.push(new TextRun({ text: `  ${start} – ${end || "Present"}`, size: 18, font: "Calibri", color: "888888" }));

        children.push(new Paragraph({ spacing: { after: 40 }, children: titleRuns }));

        if (desc) {
          for (const line of bulletLines(desc)) {
            children.push(
              new Paragraph({
                spacing: { after: 20 },
                bullet: { level: 0 },
                children: [new TextRun({ text: line, size: 19, font: "Calibri", color: "444444" })],
              }),
            );
          }
        }
        children.push(new Paragraph({ spacing: { after: 80 } }));
      }
      continue;
    }

    if (t === "Projects") {
      for (const entry of entries) {
        const name = String(entry.name ?? "");
        const tech = String(entry.tech_stack ?? "");
        const desc = String(entry.description ?? "");

        const runs: InstanceType<typeof TextRun>[] = [];
        if (name) runs.push(new TextRun({ text: name, bold: true, size: 20, font: "Calibri" }));
        if (tech) runs.push(new TextRun({ text: ` | ${tech}`, size: 18, font: "Calibri", color: "888888" }));
        children.push(new Paragraph({ spacing: { after: 40 }, children: runs }));

        if (desc) {
          for (const line of bulletLines(desc)) {
            children.push(
              new Paragraph({
                spacing: { after: 20 },
                bullet: { level: 0 },
                children: [new TextRun({ text: line, size: 19, font: "Calibri", color: "444444" })],
              }),
            );
          }
        }
        children.push(new Paragraph({ spacing: { after: 80 } }));
      }
      continue;
    }

    if (t === "Education") {
      for (const entry of entries) {
        const degree = String(entry.degree ?? entry.title ?? "");
        const institution = String(entry.institution ?? entry.organization ?? "");
        const year = String(entry.year ?? "");
        const coursework = String(entry.coursework ?? "");

        const runs: InstanceType<typeof TextRun>[] = [];
        if (degree) runs.push(new TextRun({ text: degree, bold: true, size: 20, font: "Calibri" }));
        if (institution) runs.push(new TextRun({ text: ` — ${institution}`, size: 20, font: "Calibri", color: "555555" }));
        if (year) runs.push(new TextRun({ text: `  ${year}`, size: 18, font: "Calibri", color: "888888" }));
        children.push(new Paragraph({ spacing: { after: 40 }, children: runs }));

        if (coursework) {
          children.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [new TextRun({ text: coursework, size: 19, font: "Calibri", color: "666666" })],
            }),
          );
        }
      }
      continue;
    }

    if (t === "Certifications" || t === "Certs") {
      for (const entry of entries) {
        const name = String(entry.name ?? entry.title ?? "");
        const issuer = String(entry.issuer ?? entry.organization ?? "");
        const year = String(entry.year ?? "");

        const runs: InstanceType<typeof TextRun>[] = [];
        if (name) runs.push(new TextRun({ text: name, bold: true, size: 20, font: "Calibri" }));
        if (issuer) runs.push(new TextRun({ text: ` — ${issuer}`, size: 20, font: "Calibri", color: "555555" }));
        if (year) runs.push(new TextRun({ text: `  ${year}`, size: 18, font: "Calibri", color: "888888" }));
        children.push(new Paragraph({ spacing: { after: 60 }, children: runs }));
      }
      continue;
    }

    // Generic: Achievements, Leadership, Open Source, Publications, Additional, etc.
    for (const entry of entries) {
      const desc = String(entry.description ?? "");
      const name = String(entry.name ?? entry.repo_name ?? entry.title ?? entry.category ?? "");

      const runs: InstanceType<typeof TextRun>[] = [];
      if (name) runs.push(new TextRun({ text: `${name}: `, bold: true, size: 20, font: "Calibri" }));
      if (desc) runs.push(new TextRun({ text: desc, size: 20, font: "Calibri", color: "444444" }));

      if (runs.length > 0) {
        children.push(new Paragraph({ spacing: { after: 60 }, children: runs }));
      }
    }

    if (section.content && entries.length === 0) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: section.content, size: 20, font: "Calibri", color: "444444" }),
          ],
        }),
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}
