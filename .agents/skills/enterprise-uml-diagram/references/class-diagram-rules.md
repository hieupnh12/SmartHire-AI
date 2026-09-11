# Enterprise Class Diagram Rules

## Scope

Model the static structure required by the selected function, not the entire application. Choose one explicit viewpoint and state it in the diagram: domain model, application design, or persistence model. Do not silently mix JPA tables, API DTOs, and domain abstractions.

## Required content

- Add a title containing the feature ID and function name.
- Group classes into meaningful packages or bounded contexts.
- Show only relevant entities, value objects, services, repositories, controllers, DTOs, domain events, and external ports.
- Include important attributes with meaningful types. Never show passwords, tokens, secrets, or unnecessary PII values.
- Include operations only when they clarify responsibility or a contract.
- Show visibility, abstract/interface stereotypes, enums, and constraints when they affect the design.
- Show association direction, role names, and meaningful multiplicities.
- Distinguish composition, aggregation, inheritance, realization, and dependency accurately.
- Add notes for invariants that UML notation cannot express clearly.

## SmartHire-AI invariants

- Separate master-domain classes from tenant-domain classes.
- Never draw a direct cross-tenant association.
- Show tenant resolution or tenant-scoped repositories when relevant; do not add `tenantId` to every tenant table when database-per-tenant isolation makes it unnecessary.
- Keep API DTOs separate from JPA entities.
- Match table names and persistence types to Flyway migrations for a persistence viewpoint.
- Represent asynchronous integration through events or ports instead of direct domain coupling.

## Quality checks

- Every class has one clear responsibility.
- Multiplicities and ownership agree with migrations and business rules.
- Names match code or are explicitly labeled conceptual.
- The diagram has no unexplained orphan type.
- Avoid getters, setters, framework boilerplate, and exhaustive fields that add no architectural value.
