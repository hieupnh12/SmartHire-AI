---
name: enterprise-uml-diagram
description: Create, review, and render enterprise-grade PlantUML class and sequence diagrams for SmartHire-AI features. Use when adding or updating UML artifacts under docs/diagram, documenting a feature's static model and runtime interactions, or checking consistency between diagrams, code, APIs, persistence, and multi-tenant architecture.
---

# Enterprise UML Diagram

Create evidence-based UML artifacts suitable for architecture and feature documentation. Resolve material ambiguity before drawing. Do not invent implementation details when project contracts are missing; ask for clarification or record explicitly accepted assumptions in the function README.

## Required output layout

Use the existing feature directories under `docs/diagram`. Create a lowercase kebab-case function directory when the function is new:

```text
docs/diagram/<number-feature>/<function-name>/
|-- class-diagram.puml
|-- sequence-diagram.puml
`-- README.md
```

The two `.puml` files and `README.md` are mandatory. Rendered PNG files are optional and must not be created until the user explicitly agrees after reviewing the completed sources and README. Do not generate SVG files. Keep one primary business function per function directory. Do not place multiple UML diagram types in one `.puml` file. Use English for filenames and diagram content. Write the generated README in Vietnamese by default, unless the user explicitly requests another language or repository instructions require one.

## Workflow

1. Read repository instructions, `DESIGN.md`, the matching `docs/features` document, API contracts, relevant code, migrations, and existing diagrams before editing.
2. Confirm the feature directory and define the function boundary, actors, trigger, preconditions, success result, and important failure results. If either the feature or its specific function is ambiguous, follow the clarification policy and obtain the user's choice before creating files.
3. Apply the clarification policy below before creating files.
4. Read [references/class-diagram-rules.md](references/class-diagram-rules.md) before creating or reviewing the class diagram. Use its concise graduation-project application-design view by default; expand to a domain, persistence, or enterprise implementation view only when explicitly requested or materially necessary.
5. Read [references/sequence-diagram-rules.md](references/sequence-diagram-rules.md) before creating or reviewing the sequence diagram. Use its concise graduation-project detail level by default and hide the duplicated bottom participant row; expand to an enterprise implementation view only when explicitly requested or materially necessary.
6. Read [references/enterprise-review.md](references/enterprise-review.md) for every task and apply all relevant checks.
7. Create or update both mandatory `.puml` files and the `README.md`. Preserve unrelated user changes.
8. Cross-check names, responsibilities, relationships, messages, states, data ownership, and tenant boundaries across both diagrams and the source contracts.
9. If a renderer is available, run `scripts/render-diagrams.ps1 -ValidateOnly` to check PlantUML syntax without creating images. If no supported renderer exists, keep the sources and report the exact limitation; do not download or install software without authorization.
10. After both `.puml` files and the README are complete, stop and ask the user whether they want PNG images generated. Do not infer consent from the original diagram request and do not render PNG in the same turn unless the user explicitly requested image generation in advance.
11. Only after the user agrees, generate PNG by running `scripts/render-diagrams.ps1 -Format Png -PngDpi 300`. Do not generate SVG. PNG must satisfy at least one high-resolution criterion: 2x scale, 3x scale, or 300 DPI and above. Use 300 DPI or higher by default because it is deterministic and verifiable.
12. Inspect generated images when an image-viewing tool is available. Fix clipping, unreadable text, excessive crossings, and invalid layout before reporting rendering complete.

## Clarification policy

First attempt to resolve unknowns from the repository sources. Ask the user a concise clarification question before drawing when the answer cannot be inferred reliably and would materially change any of the following:

- The use-case boundary, feature/function identity, actor, or observable outcome
- Whether the class diagram is conceptual, application-design, or persistence-oriented
- The source of truth when feature documentation, API contracts, code, and migrations conflict
- Master-versus-tenant data ownership or the tenant isolation boundary
- Authentication, authorization, token/session, privacy, consent, or audit behavior
- Transaction boundaries, synchronous-versus-asynchronous execution, retries, or failure semantics
- The target feature directory when more than one location is plausible

Treat feature selection and function selection as two distinct decisions:

1. **Feature:** Identify the product capability or numbered directory under `docs/diagram` and its matching `docs/features` contract.
2. **Function:** Identify one concrete business use case inside that feature, including its actor, trigger, and observable outcome.

If the user's request is vague at either level, do not choose silently and do not create a directory, `.puml`, README, or rendered image yet. Inspect the repository first, then ask one concise clarification question. When the user may not know the project taxonomy, include a short evidence-based shortlist of likely choices, each with a plain-language outcome:

- If the **feature is unclear**, suggest the most plausible feature areas or numbered diagram directories.
- If the feature is known but the **function is unclear**, suggest the most plausible business functions within that feature.
- Prefer 2–4 mutually distinct suggestions. Do not overwhelm the user with the entire backlog.
- Mark the best-supported suggestion as recommended when repository evidence makes one clearly more likely.
- Allow the user to describe a different outcome in their own words.

Example response shape: `Bạn muốn làm [Feature A — outcome], [Feature B — outcome], hay một phạm vi khác?` Once the feature is selected, follow with function choices only if the function remains ambiguous.

Group related unknowns into the smallest useful number of questions and explain briefly why the answer affects the diagrams. Do not ask about naming, formatting, or implementation details that are already defined by this skill or can be safely derived from project conventions.

If the uncertainty is non-material, continue with the safest evidence-based interpretation and document it under `Assumptions` in `README.md`. If material uncertainty remains and the user has not authorized an assumption, do not produce misleading final diagrams; report `Blocked by missing contract`. If the user explicitly asks to proceed using assumptions, identify each assumption and use `Complete with assumptions`.

## README contract

Document at least:

- Feature and function identifiers
- Purpose and scope
- Source documents and code inspected
- Actors and participating components
- Preconditions and postconditions
- Main flow and alternative/error flows
- Sequence participant responsibilities and a numbered walkthrough of every meaningful interaction or tightly related interaction group. Explain what each step does, why it exists when the reason is not obvious, what data or state changes, and the entry/outcome conditions of every `alt`, `opt`, `loop`, or `par` fragment.
- Class diagram element responsibilities, including why each class/interface/DTO/entity/database appears. Explain every connector by naming its UML relationship or dependency type, its source and target, what it means in this use case, and why that connector is appropriate. Explicitly explain inheritance, realization, aggregation, composition, association, and dependency whenever used.
- Applicable multi-tenant, security, transaction, async, audit, and privacy decisions
- Assumptions and unresolved decisions
- Rendering instructions and generated artifacts
- Review status: `Source complete — awaiting rendering decision`, `Complete`, `Complete with assumptions`, or `Blocked by missing contract`

Use precise explanations. Do not merely transcribe labels from the diagrams: connect each element and interaction to its responsibility, condition, state change, or design rationale. Adjacent trivial return messages may be explained with their initiating call when that is clearer, but no meaningful step or connector may remain unexplained.

## Rendering and image quality

- Rendering is a separate, user-approved phase. Creating or updating `.puml` and README files does not authorize creating PNG files.
- After rendering is approved, create PNG only; do not generate SVG artifacts.
- Include `skinparam dpi 300` in every diagram so PNG output has sufficient pixel dimensions.
- Every generated PNG must satisfy at least one high-resolution criterion: 2x scale, 3x scale, or at least 300 DPI. Prefer the deterministic default of 300 DPI or higher. When using the DPI criterion, the PNG metadata itself must report the target value; pixel dimensions alone are not sufficient. Use the renderer's `-PngDpi` option (default `300`) and verify both horizontal and vertical DPI after rendering.
- Prefer readable layout over fitting everything into one image. Split oversized diagrams by use case or bounded context and link them from the README.
- Use UTF-8.
- After explicit approval, run `scripts/render-diagrams.ps1 -InputPath <function-directory> -Format Png -PngDpi 300`. The script writes and verifies PNG DPI metadata automatically.

## Completion rules

The source phase is complete when both source diagrams and the README exist, cross-diagram checks pass, and syntax validation was attempted without rendering. At that point, report `Source complete — awaiting rendering decision` and ask whether the user wants PNG images. The rendering phase is complete only after explicit approval, successful PNG generation, verification that every PNG reports at least 300 DPI, and image inspection when available. State which images were rendered and which checks could not run. Never modify application behavior merely to make a diagram appear consistent.
