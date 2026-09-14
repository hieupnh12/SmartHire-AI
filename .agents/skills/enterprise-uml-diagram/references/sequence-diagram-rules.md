# Enterprise Sequence Diagram Rules

## Scope

Model one primary use case from trigger to observable result. A sequence diagram explains runtime collaboration and ordering; it is not a component inventory or a replacement for source code.

## Detail level

Default to a graduation-project documentation level unless the user explicitly asks for an enterprise implementation view. The primary diagram must make the business flow, application responsibilities, and architecture-defining boundaries understandable without exposing every internal mechanism.

For a typical primary diagram, prefer roughly 8–10 participants, 20–30 meaningful messages, and no more than 2–3 levels of nested alternatives. Treat these as readability guidance rather than hard limits; split the diagram or justify additional detail when the use case genuinely requires more.

Keep:

- The initiating actor, UI or system boundary, trusted authorization boundary, main controller/service responsibilities, and relevant data stores.
- The complete success path, important state transitions, architecture-defining master/tenant separation, and the few failure branches that change the observable outcome.
- Infrastructure such as Flyway, queues, or external AI providers only when it explains a defining property of the feature.

Normally summarize in a message or note instead of creating separate lifelines for credential-encryption internals, password encoders, connection-pool factories, raw DDL statements, advisory-lock calls, transaction-manager mechanics, and retry internals. Include them only when they are the subject of the diagram, required to explain correctness, or explicitly requested.

When detailed operational behavior is still valuable, keep the primary diagram concise and place the enterprise implementation sequence in a separate diagram or appendix.

## Participants

Use the most accurate PlantUML participant type: `actor`, `boundary`, `control`, `entity`, `database`, `collections`, `queue`, or a clearly stereotyped external system. Order participants from initiator through application and domain components to infrastructure. Include a component only when it sends or receives a relevant message.

Add `hide footbox` to every sequence diagram. Participants remain visible at the top, while the duplicated participant row at the bottom is hidden.

Show activation bars for participants that actively process a call. Prefer explicit `activate` and `deactivate` statements across alternative/error branches so every bar starts when processing begins and ends on its corresponding response or termination; do not allow automatic activation to leave bars open across unrelated branches.

## Required flow content

- Add a title containing the feature ID and function name.
- State important preconditions and invariants in notes.
- Use numbered messages and concise operation-oriented labels.
- Show request data only when it changes a decision or boundary.
- Show the complete success path.
- Use `alt/else`, `opt`, `loop`, `par`, and `break` only with their correct UML semantics.
- Show relevant validation, authentication, authorization, tenant resolution, transactions, persistence, cache, external calls, async messaging, audit, and notifications.
- Show meaningful responses, domain errors, and protocol status codes at system boundaries.
- Show timeout, retry, idempotency, compensation, or circuit-breaking only when required by the contract or operational risk.

## SmartHire-AI invariants

- Resolve and validate the tenant before tenant-database access.
- Set `TenantContext` before tenant work and clear it in a guaranteed cleanup or `finally` path.
- Carry the tenant identifier in RabbitMQ headers and restore and clear context in consumers.
- Keep master and tenant persistence calls visibly separated.
- Return generic authentication errors that do not reveal account existence.
- Do not display or log raw passwords, JWTs, CV contents, or sensitive personal data.
- Indicate human review when AI output is advisory rather than an automatic final decision.

## Quality checks

- Every message has a valid sender and receiver.
- Message order matches actual control flow.
- Alternative branches end with coherent outcomes.
- Synchronous and asynchronous arrows reflect the real contract.
- Cleanup occurs on success and failure.
- Split secondary use cases when they overwhelm the primary flow.
