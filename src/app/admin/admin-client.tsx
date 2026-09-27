"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Dictionary, Locale } from "@/app/i18n";
import { useLocale } from "@/app/locale-provider";
import { useUnsavedChanges } from "@/app/unsaved-changes";
import {
  EVENT_STATUSES,
  EVENT_TYPES,
  type Event,
  type EventDraft,
  type EventStatus,
  type EventType,
} from "@/lib/event-types";

const EMPTY_DRAFT: EventDraft = {
  type: "other",
  title: "",
  titleMn: "",
  summary: "",
  summaryMn: "",
  date: "",
  status: "upcoming",
  tags: [],
  featured: false,
};

type AdminDictionary = Dictionary["admin"];
type EventsDictionary = Dictionary["events"];

function apiErrorMessage(
  status: number,
  body: Record<string, unknown>,
  locale: Locale,
  dictionary: AdminDictionary,
  action: "login" | "event",
): string {
  if (locale === "en" && typeof body.error === "string") return body.error;
  switch (status) {
    case 400:
      return action === "login" ? dictionary.passwordRequired : dictionary.invalidEvent;
    case 401:
      return action === "login" ? dictionary.invalidPassword : dictionary.sessionExpired;
    case 403:
      return dictionary.requestRejected;
    case 413:
      return dictionary.requestTooLarge;
    case 429:
      return dictionary.tooManyAttempts;
    case 503:
      return action === "login" ? dictionary.notConfiguredTitle : dictionary.storeUnavailable;
    default:
      return dictionary.error;
  }
}

function freshDraft(): EventDraft {
  return { ...EMPTY_DRAFT, tags: [] };
}

function toDraft(event: Event): EventDraft {
  const draft = { ...event } as EventDraft;
  delete draft.id;
  return draft;
}

async function readResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseTagInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function serializeDraft(draft: EventDraft, tagsInput: string): string {
  return JSON.stringify({ ...draft, tags: parseTagInput(tagsInput) });
}

function sortEventList(events: Event[]): Event[] {
  const statusOrder: Record<EventStatus, number> = {
    upcoming: 0,
    ongoing: 1,
    ended: 2,
  };
  return [...events].sort((a, b) => {
    const statusDifference = statusOrder[a.status] - statusOrder[b.status];
    if (statusDifference !== 0) return statusDifference;
    const dateDifference = a.date.localeCompare(b.date);
    return a.status === "ended" ? -dateDifference : dateDifference;
  });
}

function LoginPanel({
  configured,
  dictionary,
  locale,
}: {
  configured: boolean;
  dictionary: AdminDictionary;
  locale: Locale;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setError(dictionary.passwordRequired);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await readResponse(response);
      if (!response.ok) {
        setError(apiErrorMessage(response.status, body, locale, dictionary, "login"));
        return;
      }
      window.location.reload();
    } catch {
      setError(dictionary.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-login-card" aria-labelledby="admin-login-title">
      <div className="section-label">
        <span>ADMIN</span>
        <span>{dictionary.privateLabel}</span>
      </div>
      <h1 id="admin-login-title">{dictionary.loginTitle}</h1>
      <p>{dictionary.loginBody}</p>
      {!configured ? (
        <div className="admin-config-note" role="note">
          <strong>{dictionary.notConfiguredTitle}</strong>
          <span>{dictionary.notConfiguredBody}</span>
        </div>
      ) : (
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            value="admin"
            readOnly
            hidden
            autoComplete="username"
          />
          <label className="form-field" htmlFor="admin-password">
            <span>{dictionary.password}</span>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              maxLength={256}
            />
          </label>
          {error ? <p className="admin-error" role="alert">{error}</p> : null}
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? dictionary.signingIn : dictionary.signIn}
          </button>
        </form>
      )}
    </section>
  );
}

function EventForm({
  draft,
  tagsInput,
  dictionary,
  eventsDictionary,
  editing,
  busy,
  onChange,
  onTagsInputChange,
  onSubmit,
  onCancel,
}: {
  draft: EventDraft;
  tagsInput: string;
  dictionary: AdminDictionary;
  eventsDictionary: EventsDictionary;
  editing: boolean;
  busy: boolean;
  onChange: (draft: EventDraft) => void;
  onTagsInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  function update<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  const typeLabels: Record<EventType, string> = eventsDictionary.types;
  const statusLabels: Record<EventStatus, string> = eventsDictionary.status;

  return (
    <form className="admin-event-form" onSubmit={onSubmit}>
      <fieldset className="admin-form-fields" disabled={busy}>
        <div className="admin-form-heading">
        <div>
          <span className="form-kicker">{dictionary.eventLabel}</span>
          <h2>{editing ? dictionary.editEvent : dictionary.newEvent}</h2>
        </div>
        {editing ? (
          <button className="text-button" type="button" onClick={onCancel}>
            {dictionary.newEvent}
          </button>
        ) : null}
      </div>

      <div className="form-grid">
        <label className="form-field" htmlFor="event-type">
          <span>{dictionary.fields.type}</span>
          <select
            id="event-type"
            value={draft.type}
            onChange={(event) => update("type", event.target.value as EventType)}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field" htmlFor="event-status">
          <span>{dictionary.fields.status}</span>
          <select
            id="event-status"
            value={draft.status}
            onChange={(event) => update("status", event.target.value as EventStatus)}
          >
            {EVENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field" htmlFor="event-title">
          <span>{dictionary.fields.titleEn} *</span>
          <input
            id="event-title"
            value={draft.title}
            onChange={(event) => update("title", event.target.value)}
            required
            maxLength={120}
          />
        </label>
        <label className="form-field" htmlFor="event-title-mn">
          <span>{dictionary.fields.titleMn} *</span>
          <input
            id="event-title-mn"
            value={draft.titleMn}
            onChange={(event) => update("titleMn", event.target.value)}
            required
            maxLength={120}
          />
        </label>

        <label className="form-field form-field-full" htmlFor="event-summary">
          <span>{dictionary.fields.summaryEn} *</span>
          <textarea
            id="event-summary"
            value={draft.summary}
            onChange={(event) => update("summary", event.target.value)}
            required
            maxLength={600}
            rows={4}
          />
        </label>
        <label className="form-field form-field-full" htmlFor="event-summary-mn">
          <span>{dictionary.fields.summaryMn} *</span>
          <textarea
            id="event-summary-mn"
            value={draft.summaryMn}
            onChange={(event) => update("summaryMn", event.target.value)}
            required
            maxLength={600}
            rows={4}
          />
        </label>

        <label className="form-field" htmlFor="event-date">
          <span>{dictionary.fields.date} *</span>
          <input
            id="event-date"
            type="date"
            value={draft.date}
            onChange={(event) => update("date", event.target.value)}
            required
          />
        </label>
        <label className="form-field" htmlFor="event-end-date">
          <span>{dictionary.fields.endDate}</span>
          <input
            id="event-end-date"
            type="date"
            value={draft.endDate || ""}
            onChange={(event) => update("endDate", event.target.value || undefined)}
          />
        </label>

        <details className="form-field-full admin-optional-fields">
          <summary>{dictionary.optionalDetails}</summary>
          <div className="form-grid">
            <label className="form-field" htmlFor="event-location">
              <span>{dictionary.fields.locationEn}</span>
              <input
                id="event-location"
                value={draft.location || ""}
                onChange={(event) => update("location", event.target.value || undefined)}
                maxLength={120}
              />
            </label>
            <label className="form-field" htmlFor="event-location-mn">
              <span>{dictionary.fields.locationMn}</span>
              <input
                id="event-location-mn"
                value={draft.locationMn || ""}
                onChange={(event) => update("locationMn", event.target.value || undefined)}
                maxLength={120}
              />
            </label>
    
            <label className="form-field" htmlFor="event-format">
              <span>{dictionary.fields.formatEn}</span>
              <input
                id="event-format"
                value={draft.format || ""}
                onChange={(event) => update("format", event.target.value || undefined)}
                maxLength={120}
              />
            </label>
            <label className="form-field" htmlFor="event-format-mn">
              <span>{dictionary.fields.formatMn}</span>
              <input
                id="event-format-mn"
                value={draft.formatMn || ""}
                onChange={(event) => update("formatMn", event.target.value || undefined)}
                maxLength={120}
              />
            </label>
    
            <label className="form-field" htmlFor="event-team-size">
              <span>{dictionary.fields.teamSizeEn}</span>
              <input
                id="event-team-size"
                value={draft.teamSize || ""}
                onChange={(event) => update("teamSize", event.target.value || undefined)}
                maxLength={80}
              />
            </label>
            <label className="form-field" htmlFor="event-team-size-mn">
              <span>{dictionary.fields.teamSizeMn}</span>
              <input
                id="event-team-size-mn"
                value={draft.teamSizeMn || ""}
                onChange={(event) => update("teamSizeMn", event.target.value || undefined)}
                maxLength={80}
              />
            </label>
    
            <label className="form-field" htmlFor="event-prize">
              <span>{dictionary.fields.prizeEn}</span>
              <input
                id="event-prize"
                value={draft.prize || ""}
                onChange={(event) => update("prize", event.target.value || undefined)}
                maxLength={120}
              />
            </label>
            <label className="form-field" htmlFor="event-prize-mn">
              <span>{dictionary.fields.prizeMn}</span>
              <input
                id="event-prize-mn"
                value={draft.prizeMn || ""}
                onChange={(event) => update("prizeMn", event.target.value || undefined)}
                maxLength={120}
              />
            </label>
    
            <label className="form-field" htmlFor="event-tags">
              <span>{dictionary.fields.tags}</span>
              <input
                id="event-tags"
                value={tagsInput}
                onChange={(event) => onTagsInputChange(event.target.value)}
                placeholder="pwn, web, crypto"
                maxLength={300}
              />
            </label>
            <label className="form-field" htmlFor="event-registration">
              <span>{dictionary.fields.registrationUrl}</span>
              <input
                id="event-registration"
                type="url"
                value={draft.registrationUrl || ""}
                onChange={(event) => update("registrationUrl", event.target.value || undefined)}
                placeholder="https://..."
                maxLength={500}
              />
            </label>
    
            <label className="form-field form-field-full" htmlFor="event-cover">
              <span>{dictionary.fields.coverImage}</span>
              <input
                id="event-cover"
                value={draft.coverImage || ""}
                onChange={(event) => update("coverImage", event.target.value || undefined)}
                placeholder="/events/example.webp"
                maxLength={240}
              />
              <small>{dictionary.coverHint}</small>
            </label>
          </div>
        </details>

        <div className="form-field form-field-full">
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(event) => update("featured", event.target.checked)}
            />
            <span>{dictionary.fields.featured}</span>
          </label>
          <small>{dictionary.featuredHint}</small>
        </div>
      </div>

      <div className="admin-form-actions">
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? dictionary.saving : dictionary.save}
        </button>
        {editing ? (
          <button className="button button-quiet" type="button" onClick={onCancel}>
            {dictionary.cancel}
          </button>
        ) : null}
        </div>
      </fieldset>
    </form>
  );
}

export default function AdminClient({
  initialEvents,
  initialAuthenticated,
  configured,
}: {
  initialEvents: Event[];
  initialAuthenticated: boolean;
  configured: boolean;
}) {
  const { dictionary: t, locale } = useLocale();
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [events, setEvents] = useState(initialEvents);
  const [draft, setDraft] = useState<EventDraft>(freshDraft);
  const [tagsInput, setTagsInput] = useState("");
  const [initialDraftSnapshot, setInitialDraftSnapshot] = useState(() =>
    serializeDraft(freshDraft(), ""),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conflictEventId, setConflictEventId] = useState<string | null>(null);
  const hasUnsavedChanges =
    serializeDraft(draft, tagsInput) !== initialDraftSnapshot;

  useEffect(() => {
    setHasUnsavedChanges(authenticated && hasUnsavedChanges);
  }, [authenticated, hasUnsavedChanges, setHasUnsavedChanges]);

  useEffect(() => () => setHasUnsavedChanges(false), [setHasUnsavedChanges]);

  useEffect(() => {
    if (!authenticated || !hasUnsavedChanges) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [authenticated, hasUnsavedChanges]);

  if (!authenticated) {
    return <LoginPanel configured={configured} dictionary={t.admin} locale={locale} />;
  }

  function clearForm() {
    const nextDraft = freshDraft();
    setDraft(nextDraft);
    setTagsInput("");
    setInitialDraftSnapshot(serializeDraft(nextDraft, ""));
    setEditingId(null);
    setError("");
    setConflictEventId(null);
  }

  function resetForm() {
    if (hasUnsavedChanges && !window.confirm(t.admin.discardUnsaved)) return;
    clearForm();
    setMessage("");
  }

  function editEvent(event: Event) {
    if (hasUnsavedChanges && !window.confirm(t.admin.discardUnsaved)) return;
    const nextDraft = toDraft(event);
    const nextTagsInput = event.tags.join(", ");
    setDraft(nextDraft);
    setTagsInput(nextTagsInput);
    setInitialDraftSnapshot(serializeDraft(nextDraft, nextTagsInput));
    setEditingId(event.id);
    setMessage("");
    setError("");
    setConflictEventId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.requestAnimationFrame(() => {
      document.getElementById("event-title")?.focus();
    });
  }

  async function syncEvents(): Promise<Event[] | null> {
    try {
      const response = await fetch("/api/admin/events", { cache: "no-store" });
      if (response.status === 401) {
        setAuthenticated(false);
        return null;
      }
      const body = await readResponse(response);
      if (!response.ok || !Array.isArray(body.events)) return null;
      const nextEvents = sortEventList(body.events as Event[]);
      setEvents(nextEvents);
      return nextEvents;
    } catch {
      return null;
    }
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    setConflictEventId(null);

    const editing = Boolean(editingId);
    const submittedDraft: EventDraft = {
      ...draft,
      tags: parseTagInput(tagsInput),
    };

    try {
      const response = await fetch("/api/admin/events", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? { id: editingId, event: submittedDraft }
            : { event: submittedDraft },
        ),
      });
      const body = await readResponse(response);
      if (!response.ok) {
        if (response.status === 409) {
          await syncEvents();
          setError(t.admin.conflict);
          setConflictEventId(editingId);
        } else {
          setError(apiErrorMessage(response.status, body, locale, t.admin, "event"));
        }
        return;
      }

      const savedEvent = body.event as Event | undefined;
      if (!savedEvent) {
        setError(t.admin.error);
        return;
      }

      setEvents((current) =>
        sortEventList(
          editing
            ? current.map((item) =>
                item.id === savedEvent.id ? savedEvent : item,
              )
            : [...current, savedEvent],
        ),
      );
      clearForm();
      setMessage(t.admin.saved);
      const synced = await syncEvents();
      if (!synced) {
        setMessage(`${t.admin.saved} ${t.admin.refreshWarning}`);
      }
    } catch {
      setError(t.admin.error);
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent(event: Event) {
    const confirmation =
      editingId === event.id && hasUnsavedChanges
        ? t.admin.confirmDeleteDraft
        : t.admin.confirmDelete;
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    setError("");
    setConflictEventId(null);
    try {
      const response = await fetch("/api/admin/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, revision: event.revision }),
      });
      const body = await readResponse(response);
      if (!response.ok || body.deleted !== true) {
        if (response.status === 409) {
          await syncEvents();
          setError(t.admin.conflict);
          setConflictEventId(editingId === event.id ? editingId : null);
          return;
        }
        setError(apiErrorMessage(response.status, body, locale, t.admin, "event"));
        return;
      }
      setEvents((current) => current.filter((item) => item.id !== event.id));
      if (editingId === event.id) clearForm();
      setMessage(t.admin.deleted);
      const synced = await syncEvents();
      if (!synced) {
        setMessage(`${t.admin.deleted} ${t.admin.refreshWarning}`);
      }
    } catch {
      setError(t.admin.error);
    } finally {
      setBusy(false);
    }
  }

  async function reloadLatest() {
    if (!editingId) return;
    if (hasUnsavedChanges && !window.confirm(t.admin.confirmReloadLatest)) return;
    const latestEvents = await syncEvents();
    const latest = latestEvents?.find((event) => event.id === editingId);
    if (!latest) {
      setError(t.admin.error);
      setConflictEventId(null);
      return;
    }
    const latestDraft = toDraft(latest);
    const latestTagsInput = latest.tags.join(", ");
    setDraft(latestDraft);
    setTagsInput(latestTagsInput);
    setInitialDraftSnapshot(serializeDraft(latestDraft, latestTagsInput));
    setError("");
    setConflictEventId(null);
    setMessage(t.admin.latestLoaded);
  }

  async function logout() {
    if (hasUnsavedChanges && !window.confirm(t.admin.discardUnsaved)) return;
    setError("");
    setConflictEventId(null);
    try {
      const response = await fetch("/api/admin/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        setError(t.admin.error);
        return;
      }
      setAuthenticated(false);
      setEvents([]);
    } catch {
      setError(t.admin.error);
    }
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <div className="section-label">
            <span>ADMIN</span>
            <span>{t.admin.privateLabel}</span>
          </div>
          <h1>{t.admin.title}</h1>
          <p>{t.admin.subtitle}</p>
        </div>
        <button
          className="button button-quiet"
          type="button"
          onClick={logout}
          disabled={busy}
        >
          {t.admin.logout}
        </button>
      </div>

      {message ? <p className="admin-notice" role="status">{message}</p> : null}
      {error ? (
        <div className="admin-error" role="alert">
          <span>{error}</span>
          {editingId && conflictEventId === editingId ? (
            <button
              className="text-button"
              type="button"
              onClick={reloadLatest}
              disabled={busy}
            >
              {t.admin.reloadLatest}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="admin-toolbar">
        <div>
          <span className="form-kicker">{t.admin.eventLabel}</span>
          <h2>{t.admin.dashboard}</h2>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={resetForm}
          disabled={busy}
        >
          {t.admin.newEvent}
        </button>
      </div>

      <div className="admin-layout">
        <aside className="admin-event-list" aria-label={t.admin.dashboard}>
          <div className="admin-list-heading">
            <span>{events.length} {t.admin.eventCount}</span>
          </div>
          {events.length > 0 ? (
            events.map((event) => (
              <div className={`admin-event-row ${editingId === event.id ? "is-editing" : ""}`} key={event.id}>
                <button
                  className="admin-event-select"
                  type="button"
                  onClick={() => editEvent(event)}
                  disabled={busy}
                >
                  <span className="admin-event-type">{t.events.types[event.type]}</span>
                  <strong>{locale === "mn" ? event.titleMn : event.title}</strong>
                  <small>{event.date} · {t.events.status[event.status]}</small>
                </button>
                <button
                  className="admin-delete-button"
                  type="button"
                  onClick={() => removeEvent(event)}
                  disabled={busy}
                  aria-label={`${t.admin.delete}: ${locale === "mn" ? event.titleMn : event.title}`}
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <p className="admin-empty">{t.admin.noEvents}</p>
          )}
        </aside>

        <section className="admin-editor" aria-label={t.admin.editorLabel}>
          <EventForm
            draft={draft}
            tagsInput={tagsInput}
            dictionary={t.admin}
            eventsDictionary={t.events}
            editing={Boolean(editingId)}
            busy={busy}
            onChange={setDraft}
            onTagsInputChange={setTagsInput}
            onSubmit={saveEvent}
            onCancel={resetForm}
          />
        </section>
      </div>
    </div>
  );
}
