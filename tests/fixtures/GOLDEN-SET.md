# Authoring the golden set

`tests/sopQuality.test.ts` measures how good BioSOP's SOP output actually is. It
cannot run until you supply the one thing no tooling can generate for you: a set
of bench methods where **you already know the right answer.**

That file does not exist in the repo, and it should not be invented. A quality
figure computed against fabricated methods and fabricated reference answers is
worse than having no figure, because it looks like evidence. The whole argument
this project rests on is that a score which cannot fail is worthless; a score
measured against made-up ground truth is the same failure wearing statistics.

## What to create

Put a file at `tests/fixtures/goldenSet.json` matching
`goldenSet.example.json`. It is gitignored by default, because these are your
working methods.

```jsonc
{
  "rubricId": "sop-drafting",
  "createdAt": "2026-08-21",
  "items": [
    {
      "id": "rna-extraction-trizol",
      "sourceMethod": "…your working protocol, verbatim…",
      "referenceSop": "…the approved SOP you grade against…",
      "difficulty": "hard",
      "adversarial": false,
      "notes": "Source omits the incubation temperature. Correct behaviour is to flag it, not to fill it in."
    }
  ]
}
```

## The bar for an item

**Two competent people in your field, reading the source method and the
reference SOP independently, would reach the same pass/fail verdict.** If you
cannot say that about an item, it will add noise, not signal, and it will drag
the agreement statistics down in a way that looks like a model problem.

## Composition

- **Fifteen items is a working minimum. Twenty to fifty is the useful range.**
  Below fifteen the confidence interval is wider than most differences you would
  want to detect.
- **Over-sample hard cases.** Roughly three and a half times enrichment relative
  to what you actually see day to day. Easy items are cheap to pass and tell you
  nothing.
- **Reserve about a third as adversarial.** Sources with a missing parameter, an
  internal contradiction, an ambiguous step, a hazard the source does not name.
- **Include items where the correct answer is "the source does not say."** A
  model that never says this is one that fills gaps silently, which is the
  failure mode that matters most here.
- **Hold back a private split** you do not tune against.

## Grading

Score each generated SOP against `SOP_DRAFTING_RUBRIC` in
`src/core/sopRubric.ts`. Criteria are yes/no on purpose. Hard failures gate the
item regardless of its score, the same way an ERROR forces FAIL in `auditor.ts`.

Grade against **the approved SOP you actually have**, not against what a good SOP
would look like in the abstract. The moment you start grading against your
impression of quality, two runs stop being comparable.

## Calibrating the auditor at the same time

While you are reading these documents anyway, record your own pass/fail call per
audit dimension. That turns the same labour into a `CalibrationCase` for
`src/core/auditCalibration.ts`, which answers a question nothing else in the repo
answers: does `auditor.ts` agree with you? Twenty labelled protocols is the floor
at which those figures start to mean anything.

## What the suite will and will not catch

It **will** catch a real change in output quality between prompt versions, model
versions, or template changes, and it will tell you when the difference you are
looking at is too small for your sample to claim.

It **will not** catch drift by itself unless you run it. `auditProtocol` never
calls a model, so `tests/auditAnchor.test.ts` catches auditor drift only. Model
drift needs this suite run against a live key, on a schedule, with the results
kept.
