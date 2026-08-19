# Syntax City v1.1 — Changelog

All changes are in `index.html` only. `worker.js`, `wrangler.toml`, and `functions/`
are untouched — no backend redeploy needed, and existing player saves (local or
on your Cloudflare Worker) load and migrate automatically with no data loss.

## Pedagogy & learner outcomes

- **Smarter answer checking.** Common contractions (didn't/did not, etc.) are
  now treated as equivalent, and small typos/spacing slips no longer fail a
  student outright (tight edit-distance tolerance — genuinely different
  grammar is still marked wrong).
- **Rule reminders on mistakes.** Every wrong answer now shows a one-line
  grammar rule for that category alongside the model answer, so mistakes
  double as a re-teach moment.
- **Free "Rule Hint" button** during a question, plus an optional "Reveal
  Start" hint (shows the first 3 words, halves that question's reward) for
  students who are stuck.
- **Adaptive question mix.** When a student picks "All Categories (Mixed)",
  weaker categories (by their own accuracy history) now come up more often —
  never exclusively, just weighted.
- **Review Mistakes shift.** A new shift type that replays previously-missed
  questions; each one clears from the log once answered correctly. The
  dashboard shows a live count of logged mistakes per difficulty tier.
- **Category Stats table** now flags categories under 60% accuracy (5+
  attempts) with a ⚠️ marker.

## Engagement & fun

- **Streaks.** Consecutive correct answers within a shift now grant a live
  reward bonus (+5% per answer, capped at +50%), shown in real time.
- **9 Achievements** (First Blood, streak milestones, Flawless Shift,
  All-Rounder, Category Master, Century, Endless Legend, Metropolis) tracked
  permanently and shown on the dashboard, with an unlock celebration at the
  end of the shift they're earned in.
- **City Chronicle.** 9 short narrative snippets — one per grammar category —
  unlock at 15 correct answers in that category, tying grammar mastery to the
  city's fiction.
- **Sound + visual feedback.** A synthesized correct/incorrect tone (no audio
  files, mutable via the 🔊 topbar toggle) and a green/red flash on the
  question box on submit.

## Teacher/admin tools

- **Add Question** form in Manage Questions — teachers can add brand-new
  questions from the UI, not just edit existing accepted answers (same
  session-only scope as the existing answer editor).
- **Per-mayor accuracy breakdown** in Manage Cities → mayor lookup: a full
  category-by-category accuracy table with weak spots flagged, plus a
  **CSV export** button for offline review or gradebooks.

## Compatibility

- `ensureGameShape()` runs on every game load and fills in any fields an
  older save doesn't have yet (streaks, mistake log, achievements) — tested
  against a simulated pre-v1.1 save with no crashes or data loss.
