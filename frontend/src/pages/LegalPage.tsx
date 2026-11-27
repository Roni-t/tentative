import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Block, Item, LegalDoc, parseLegal } from '../utils/legalText';
import privacyText from '../legal/privacy-policy.txt?raw';
import termsText from '../legal/terms-and-conditions.txt?raw';

const PRIVACY = parseLegal(privacyText);
const TERMS = parseLegal(termsText);

// Email addresses and web addresses in the text become links
const LINKABLE = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

const Linked: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(LINKABLE).map((part, i) => {
      if (i % 2 === 0) return part;
      const trailing = part.match(/[.,;]+$/)?.[0] ?? '';
      const target = part.slice(0, part.length - trailing.length);
      const href = target.includes('@') && !target.startsWith('http') ? `mailto:${target}` : target;
      return (
        <React.Fragment key={i}>
          <a
            href={href}
            {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="text-white underline decoration-white/30 underline-offset-2 hover:decoration-white break-words"
          >
            {target}
          </a>
          {trailing}
        </React.Fragment>
      );
    })}
  </>
);

const Lead: React.FC<{ item: Item }> = ({ item }) => (
  <>
    {item.lead && <span className="font-semibold text-zinc-100">{item.lead} </span>}
    <Linked text={item.text} />
  </>
);

const BlockView: React.FC<{ block: Block }> = ({ block }) => {
  if (block.kind === 'subheading') {
    return (
      <h3 className="pt-2 text-sm font-semibold text-zinc-100">
        <span className="font-mono text-xs text-zinc-500 mr-2 tabular-nums">{block.number}</span>
        {block.title}
      </h3>
    );
  }
  if (block.kind === 'list') {
    return (
      <ul className="space-y-2">
        {block.items.map((item, i) => (
          <li key={i} className="relative pl-5 before:absolute before:left-1 before:top-[0.7em] before:h-1 before:w-1 before:rounded-full before:bg-zinc-500">
            <Lead item={item} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="whitespace-pre-line">
      <Lead item={block} />
    </p>
  );
};

const LegalPage: React.FC<{ doc: LegalDoc; title: string; other: { to: string; label: string } }> = ({ doc, title, other }) => {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | Tentative`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  // Links like /privacy#section-5 open at that section (the page renders after the browser looks for it)
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    // Wait for the web fonts, which change the page height, then jump without the site's smooth scroll
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' }))
    );
  }, [hash]);

  const contents = (
    <ol className="space-y-1.5 text-xs">
      {doc.sections.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="flex gap-2 text-zinc-400 hover:text-white transition-colors">
            <span className="font-mono text-zinc-600 tabular-nums w-5 shrink-0 text-right">{s.number}</span>
            <span>{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <header className="max-w-3xl space-y-4 mb-10">
        <h1 className="display-serif text-5xl sm:text-6xl text-white leading-none">{title}</h1>
        <p className="text-xs text-zinc-500">
          Effective {doc.effective}. Last updated {doc.updated}.
        </p>
        <div className="space-y-4 text-sm leading-7 text-zinc-300 max-w-[68ch]">
          {doc.intro.map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
        </div>
      </header>

      <div className="grid lg:grid-cols-[13rem_minmax(0,1fr)] gap-10 items-start">
        <nav aria-label="Contents" className="hidden lg:block sticky top-28">
          <h2 className="text-xs font-semibold text-zinc-300 mb-3">Contents</h2>
          {contents}
        </nav>

        <details className="lg:hidden glass-card rounded-2xl px-5 py-4">
          <summary className="text-xs font-semibold text-zinc-300 cursor-pointer">Contents</summary>
          <div className="pt-4">{contents}</div>
        </details>

        <article className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-10 space-y-12">
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-28 space-y-4">
              <h2 id={`${s.id}-title`} className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-zinc-500 tabular-nums">{s.number}.</span>
                <span className="display-serif text-2xl sm:text-3xl text-white">{s.title}</span>
              </h2>
              <div className="space-y-4 text-sm leading-7 text-zinc-300 max-w-[68ch]">
                {s.blocks.map((b, i) => (
                  <BlockView key={i} block={b} />
                ))}
              </div>
            </section>
          ))}

          <p className="pt-6 border-t border-white/10 text-xs text-zinc-400">
            See also the{' '}
            <Link to={other.to} className="text-white underline decoration-white/30 underline-offset-2 hover:decoration-white">
              {other.label}
            </Link>
            .
          </p>
        </article>
      </div>
    </div>
  );
};

export const PrivacyPolicyPage: React.FC = () => (
  <LegalPage doc={PRIVACY} title="Privacy Policy" other={{ to: '/terms', label: 'Terms and Conditions' }} />
);

export const TermsPage: React.FC = () => (
  <LegalPage doc={TERMS} title="Terms and Conditions" other={{ to: '/privacy', label: 'Privacy Policy' }} />
);
