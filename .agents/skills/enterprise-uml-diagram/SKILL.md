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
|-- README.md
|-- class-diagram.svg
`-- sequence-diagram.svg
```

The two `.puml` files and `README.md` are mandatory. Keep one primary business function per function directory. Do not place multiple UML diagram types in one `.puml` file. Use English for filenames, diagram content, and the generated README unless the user explicitly requests another language.

## Workflow

1. Read repository instructions, `DESIGN.md`, the matching `docs/features` document, API contracts, relevant code, migrations, and existing diagrams before editing.
2. Confirm the feature directory and define the function boundary, actors, trigger, preconditions, success result, and important failure results.
3. Apply the clarification policy below before creating files.
4. Read [references/class-diagram-rules.md](references/class-diagram-rules.md) before creating or reviewing the class diagram.
5. Read [references/sequence-diagram-rules.md](references/sequence-diagram-rules.md) before creating or reviewing the sequence diagram.
6. Read [references/enterprise-review.md](references/enterprise-review.md) for every task and apply all relevant checks.
7. Create or update both mandatory `.puml` files and the `README.md`. Preserve unrelated user changes.
8. Cross-check names, responsibilities, relationships, messages, states, data ownership, and tenant boundaries across both diagrams and the source contracts.
9. Run `scripts/render-diagrams.ps1` for the function directory. It validates first and renders SVG by default. If no supported renderer exists, keep the sources and report the exact limitation; do not download or install software without authorization.
10. Inspect generated images when an image-viewing tool is available. Fix clipping, unreadable text, excessive crossings, and invalid layout before completion.

## Clarification policy

First attempt to resolve unknowns from the repository sources. Ask the user a concise clarification question before drawing when the answer cannot be inferred reliably and would materially change any of the following:

- The use-case boundary, feature/function identity, actor, or observable outcome
- Whether the class diagram is conceptual, application-design, or persistence-oriented
- The source of truth when feature documentation, API contracts, code, and migrations conflict
- Master-versus-tenant data ownership or the tenant isolation boundary
- Authentication, authorization, token/session, privacy, consent, or audit behavior
- Transaction boundaries, synchronous-versus-asynchronous execution, retries, or failure semantics
- The target feature directory when more than one location is plausible

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
- Class diagram explanation
- Sequence diagram explanation
- Applicable multi-tenant, security, transaction, async, audit, and privacy decisions
- Assumptions and unresolved decisions
- Rendering instructions and generated artifacts
- Review status: `Complete`, `Complete with assumptions`, or `Blocked by missing contract`

Use precise explanations. Do not repeat every message or class mechanically.

## Rendering and image quality

- Treat SVG as the canonical rendered image because it remains sharp at any zoom and is best for documents and copying.
- Include `skinparam dpi 300` in every diagram so optional PNG output is high resolution.
- Prefer readable layout over fitting everything into one image. Split oversized diagrams by use case or bounded context and link them from the README.
- Use UTF-8. Do not rasterize SVG for a document that supports vector images.
- Run `scripts/render-diagrams.ps1 -InputPath <function-directory> -Format Both` only when PNG is also required.

## Completion rules

Do not mark work complete unless both source diagrams and the README exist, cross-diagram checks pass, and syntax validation was attempted. State which images were rendered and which checks could not run. Never modify application behavior merely to make a diagram appear consistent.
