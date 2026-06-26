// Approval-vs-revision classification (plan §2/§5). The select button is the PRIMARY path and is
// fully deterministic; free text is the fallback. The fallback is a small heuristic today with a
// clearly-marked seam for a model-based classifier — kept out of the hot path so the suite runs
// with no API key.

export type Intent = "approve" | "revise";

// Linear delivers a clicked elicitation option as the prompt BODY text (the option's `value`),
// NOT in a dedicated field — so a button choice and a typed word are indistinguishable on the wire.
// Treat a prompt whose text is exactly one of our known control values as if it were that select
// value, so a click is interpreted the same regardless of how Linear transports it.
const CONTROL_VALUES = new Set(["approve", "request_changes", "complete"]);

/**
 * Normalize a prompt into the control value the user picked, if any. Prefers an explicit
 * `selectValue` (future-proofing in case Linear starts populating it), then falls back to an exact
 * (case-insensitive) match of the prompt text against a known control value. Free text returns
 * `undefined`.
 */
export function selectValueFrom(payload: { text: string; selectValue?: string }): string | undefined {
  if (payload.selectValue) return payload.selectValue;
  const text = (payload.text ?? "").trim().toLowerCase();
  return CONTROL_VALUES.has(text) ? text : undefined;
}

// Phrases that, on their own, read as approval. Conservative: anything ambiguous or containing
// change-y language falls through to "revise" (the safer default — re-planning is cheap, an
// unwanted execute is not).
const APPROVE_PATTERNS: RegExp[] = [
  /^\s*(approve|approved|lgtm|looks good|ok|okay|yes|yep|yeah|sounds good|go ahead|ship it|do it|proceed|👍|✅)\s*[!.]*\s*$/i,
  /^\s*(go|proceed)\b.*\b(ahead|for it)\b/i,
];

// Words that signal the user wants changes even if "ok"/"yes" appears earlier.
const REVISION_HINTS = /\b(but|however|change|instead|don'?t|do not|except|also|add|remove|use|rename|fix|wrong|not quite|revise|redo|rather)\b/i;

export function classifyIntent(payload: { text: string; selectValue?: string }): Intent {
  // 1. Primary: an explicit select-button value (or its text-encoded equivalent).
  const selected = selectValueFrom(payload);
  if (selected) {
    if (selected === "approve") return "approve";
    // any other control value (request_changes, complete, unknown) -> treat as revision (safe default)
    return "revise";
  }

  // 2. Fallback: free-text heuristic. (Model seam: swap this block for a model call if the
  //    heuristic proves too blunt — see plan §H.)
  const text = (payload.text ?? "").trim();
  if (text.length === 0) return "revise"; // empty / dismissed elicitation -> wait for real intent

  if (REVISION_HINTS.test(text)) return "revise";
  if (APPROVE_PATTERNS.some((re) => re.test(text))) return "approve";

  // Anything else is feedback -> revise.
  return "revise";
}
