import { useRef, useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { Modal } from '../../../components/ui/Modal';
import { BASE_PORTS, INVITE_CATEGORIES } from '../../../data/svsDesk';
import { useApp } from '../../../store/app';
import { useSvsDesk } from '../../../store/svsDesk';
import { InShell } from './parts';
import { INPUT, LABEL } from './ui';

/**
 * Invite a supplier (spec §4.5): the SVS team asks a company to apply. The
 * invitation itself is simulated — nothing is sent — and the new applicant
 * starts at Applied with every check pending. The form mounts fresh on each
 * open, so a second invitation never inherits the first one's name.
 */
export function InviteModal({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  /** After a successful invitation, so the screen can show the board. */
  onInvited: () => void;
}) {
  return (
    <InShell>
      <Modal open={open} onClose={onClose} labelledBy="invite-title">
        {open ? <InviteForm onClose={onClose} onInvited={onInvited} /> : null}
      </Modal>
    </InShell>
  );
}

function InviteForm({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const pushToast = useApp((s) => s.pushToast);
  const invite = useSvsDesk((s) => s.inviteSupplier);
  const companyRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState(INVITE_CATEGORIES[0] ?? '');
  const [port, setPort] = useState(BASE_PORTS[0] ?? 'Aberdeen');
  const [tried, setTried] = useState(false);
  const missing = company.trim() === '';

  function send(e: FormEvent) {
    e.preventDefault();
    if (missing) {
      setTried(true);
      companyRef.current?.focus();
      return;
    }
    const name = company.trim();
    invite({ company: name, category, port });
    pushToast(`Invitation sent to ${name} (simulated). They appear under Applied.`);
    onInvited();
  }

  return (
    <form noValidate onSubmit={send}>
      <Eyebrow>Supplier Vetting System</Eyebrow>
      <h2 id="invite-title" className="mt-1 font-display text-[19px] font-bold">
        Invite a supplier
      </h2>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        The company is asked to apply, then works through the same four stages and eight checks as
        everyone else.
      </p>

      <div className="mt-4 grid gap-3.5">
        <label className={LABEL}>
          Company name
          <input
            ref={companyRef}
            type="text"
            value={company}
            maxLength={80}
            autoComplete="organization"
            aria-invalid={tried && missing ? true : undefined}
            onChange={(e) => setCompany(e.target.value)}
            className={INPUT}
          />
        </label>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className={LABEL}>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={INPUT}
            >
              {INVITE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL}>
            Base port
            <select value={port} onChange={(e) => setPort(e.target.value)} className={INPUT}>
              {BASE_PORTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {tried && missing ? (
        <p
          role="alert"
          className="mt-3.5 rounded-lg border-l-4 border-warn bg-warn-soft px-3 py-2 text-[13px] font-semibold text-warn"
        >
          Still needed: company name
        </p>
      ) : null}

      <p className="mt-4 rounded-lg bg-paper px-3 py-2.5 text-[12.5px] text-ink-soft">
        The invitation is simulated — nothing is sent. The applicant starts at Applied with every
        check pending.
      </p>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Send invitation</Button>
      </div>
    </form>
  );
}
