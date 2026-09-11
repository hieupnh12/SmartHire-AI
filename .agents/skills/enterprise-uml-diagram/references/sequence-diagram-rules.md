# Enterprise Sequence Diagram Rules

## Scope

Model one primary use case from trigger to observable result. A sequence diagram explains runtime collaboration and ordering; it is not a component inventory or a replacement for source code.

## Participants

Use the most accurate PlantUML participant type: `actor`, `boundary`, `control`, `entity`, `database`, `collections`, `queue`, or a clearly stereotyped external system. Order participants from initiator through application and domain components to infrastructure. Include a component only when it sends or receives a relevant message.

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
