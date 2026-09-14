# Enterprise Class Diagram Rules

## Scope

Model the static structure required by the selected function, not the entire application. Choose one explicit viewpoint and state it in the diagram: domain model, application design, or persistence model. Do not silently mix JPA tables, API DTOs, and domain abstractions.

## Detail level

Default to a graduation-project application-design view unless the user explicitly requests a domain-only, persistence, or enterprise implementation view. The primary class diagram should explain the selected use case through a clear dependency chain such as `Route → Controller → Request/Response DTO → Service → Repository → Entity`.

For a typical primary diagram, prefer roughly 8–12 relevant types and 10–15 meaningful relationships. Treat these as readability guidance rather than hard limits. Split the diagram or justify additional detail when the function genuinely requires more.

Keep:

- The route or API boundary, controller, request/response contracts, main application services, repositories, entities, and data stores needed to explain the selected function.
- Important entity attributes, service operations, state values, multiplicities, and ownership relationships that affect the use case.
- The master-domain and tenant-domain separation when the feature crosses those boundaries.

Normally omit framework and infrastructure helpers such as credential-encryption services, password encoders, datasource or connection-pool factories, Flyway wrappers, transaction managers, cache utilities, and low-level database clients. Represent their responsibility through the main service, a concise note, or the sequence diagram. Include a separate infrastructure type only when it is central to the function, required to explain correctness, or explicitly requested.

A route may be shown as a conceptual `<<REST API>>` class when it helps the reader follow the same structure used in the project's graduation documentation. Label conceptual elements clearly so they are not mistaken for implementation classes.

When detailed infrastructure structure remains valuable, keep the primary class diagram concise and place the enterprise implementation view in a separate diagram or appendix.

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
