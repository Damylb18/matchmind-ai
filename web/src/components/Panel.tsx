import type { ReactNode } from "react";
import { Icon } from "./icons/Icon";

export type Provenance = "authoritative" | "session" | "illustrative" | "demo";

const PROVENANCE_LABEL: Record<Provenance, string> = {
  authoritative: "API total",
  session: "Current match",
  illustrative: "Illustrative",
  demo: "Demo profiles",
};

type PanelProps = {
  title: string;
  info?: string;
  provenance?: Provenance;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Panel({ title, info, provenance, actions, className, children }: PanelProps) {
  return (
    <section className={`panel ${className ?? ""}`} aria-label={title}>
      <header className="panel-head">
        <h2>{title}</h2>
        {info && <InfoTip text={info} />}
        {provenance && <ProvenanceTag kind={provenance} />}
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

export function ProvenanceTag({ kind }: { kind: Provenance }) {
  return <span className={`provenance provenance-${kind}`}>{PROVENANCE_LABEL[kind]}</span>;
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="info-tip" tabIndex={0} aria-label={text}>
      <Icon name="info" size={13} />
      <span className="info-tip-body" role="tooltip">
        {text}
      </span>
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}
