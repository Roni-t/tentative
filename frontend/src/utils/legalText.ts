// Turns the plain-text policy files in src/legal into sections the legal pages can render.
// The .txt files stay the single source: edit them, not the page.

export interface Item {
  lead?: string; // short bold phrase before the first period, e.g. "Account information."
  text: string;
}

export type Block =
  | { kind: 'p'; lead?: string; text: string }
  | { kind: 'list'; items: Item[] }
  | { kind: 'subheading'; number: string; title: string };

export interface Section {
  id: string;
  number: string;
  title: string;
  blocks: Block[];
}

export interface LegalDoc {
  effective: string;
  updated: string;
  intro: Block[];
  sections: Section[];
}

const PROPER = new Map([
  ['sms', 'SMS'],
  ['(sms)', '(SMS)'],
  ['google', 'Google'],
  ['microsoft', 'Microsoft'],
]);

// "TEXT MESSAGES (SMS)" -> "Text messages (SMS)"
const sentenceCase = (caps: string) => {
  const words = caps.toLowerCase().split(' ').map((w) => PROPER.get(w) ?? w);
  const first = words[0];
  words[0] = first.charAt(0).toUpperCase() + first.slice(1);
  return words.join(' ');
};

// "Account information. To create an account..." -> lead + rest, only for short leads
const splitLead = (text: string): Item => {
  const m = text.match(/^([A-Z][^.,:]{1,40})\.\s+(.+)$/s);
  if (m && m[1].split(' ').length <= 5) return { lead: `${m[1]}.`, text: m[2] };
  return { text };
};

const SECTION = /^(\d+)\.\s+([A-Z0-9][A-Z0-9 ,'’()&/-]+)$/;
const SUBSECTION = /^(\d+\.\d+)\s+(.+)$/s;

export const parseLegal = (raw: string): LegalDoc => {
  const paragraphs = raw
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(1); // the first line is the document title, which the page sets itself

  const doc: LegalDoc = { effective: '', updated: '', intro: [], sections: [] };

  for (const para of paragraphs) {
    const lines = para.split('\n').map((l) => l.trim());

    if (lines.some((l) => l.startsWith('Effective date:'))) {
      for (const l of lines) {
        if (l.startsWith('Effective date:')) doc.effective = l.slice('Effective date:'.length).trim();
        if (l.startsWith('Last updated:')) doc.updated = l.slice('Last updated:'.length).trim();
      }
      continue;
    }

    const heading = lines.length === 1 && para.match(SECTION);
    if (heading) {
      doc.sections.push({ id: `section-${heading[1]}`, number: heading[1], title: sentenceCase(heading[2]), blocks: [] });
      continue;
    }

    const target = doc.sections.length ? doc.sections[doc.sections.length - 1].blocks : doc.intro;

    if (lines.every((l) => l.startsWith('- '))) {
      target.push({ kind: 'list', items: lines.map((l) => splitLead(l.slice(2))) });
      continue;
    }

    // Keep line breaks inside a paragraph (the contact block is a name and an address on two lines)
    const text = lines.join('\n');
    const sub = text.match(SUBSECTION);
    if (sub) {
      const titled = sub[2].match(/^([^.]+)\.\s+(.+)$/s);
      if (titled) {
        // "3.1 Accounts. Hosts must..." reads as a paragraph with a bold lead
        target.push({ kind: 'p', lead: `${sub[1]} ${titled[1]}.`, text: titled[2] });
      } else {
        target.push({ kind: 'subheading', number: sub[1], title: sub[2] });
      }
      continue;
    }

    target.push({ kind: 'p', text });
  }

  return doc;
};
