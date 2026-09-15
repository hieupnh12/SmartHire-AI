# Enterprise Class Diagram Rules

## Scope

Model the static structure required by the selected function, not the entire application. Choose one explicit viewpoint and state it in the diagram: domain model, application design, or persistence model. Do not silently mix JPA tables, API DTOs, and domain abstractions.

## Detail level

Default to a layered graduation-project application-design view unless the user explicitly requests a domain-only, persistence, clean/hexagonal, or enterprise implementation view. Organize the primary diagram into these layers when they participate in the selected function:

1. `Routing & Boundary`
2. `Controller Layer`
3. `Service Layer`
4. `DTO Layer`
5. `Repository Layer`
6. `Domain Entity Layer`
7. `Infrastructure & Persistence`

Lay out the main request path primarily from top to bottom: `REST API Route → Controller → Service → Repository → Entity / Persistence`. Place DTOs beside or below the controller/service interactions so their `consumes`, `returns`, `creates`, or `emits` dependencies remain visible without interrupting the main path.

Do not use broad package headings such as `Tenant Web / API`, `Tenant Analytics Application`, or `Tenant Runtime / Data` in the default view. Express tenant isolation with `TenantContext`, tenant-scoped repositories, the dedicated tenant database, and notes rather than prefixing every architectural layer with `Tenant`.

The layered grouping is a presentation and responsibility model, not permission to invent code. Only show layers and types supported by the target design or explicitly accepted assumptions.

For a typical primary diagram, prefer roughly 8–12 relevant types and 10–15 meaningful relationships. Treat these as readability guidance rather than hard limits. Split the diagram or justify additional detail when the function genuinely requires more.

Keep:

- The route or API boundary, controller, request/response contracts, main application services, repositories, entities, and data stores needed to explain the selected function.
- Important entity attributes, service operations, state values, multiplicities, and ownership relationships that affect the use case.
- The master-domain and tenant-domain separation when the feature crosses those boundaries.

Normally omit framework and infrastructure helpers such as credential-encryption services, password encoders, datasource or connection-pool factories, Flyway wrappers, transaction managers, cache utilities, and low-level database clients. Represent their responsibility through the main service, a concise note, or the sequence diagram. Include a separate infrastructure type only when it is central to the function, required to explain correctness, or explicitly requested.

A route should normally be shown as a conceptual `<<REST API>>` class in `Routing & Boundary` for the graduation-project application-design view. List only relevant HTTP methods and paths, connect it to the controller with `defines routes`, and label it conceptual when no dedicated route class exists in code.

Place controllers in `Controller Layer`. Show injected service dependencies and public operations relevant to the use case. Controllers consume request DTOs, return response DTOs, and delegate business behavior; do not place metric, persistence, or domain logic in them.

Place service contracts and implementations in `Service Layer` when an interface is meaningful in the target design. Connect implementation to interface with UML realization (`..|>`), labeled `implements`. Do not invent a service interface solely to fill the layer; when there is intentionally one concrete service, show that service alone.

Place request, response, value-object payload, and domain-event contracts in `DTO Layer`. Grouping them here is a documentation convention, not a claim that DTOs form an independent runtime subsystem. Use dependencies such as `consumes`, `returns`, `creates`, `processes`, or `emits` to explain their roles.

Place repository contracts in `Repository Layer`. Service implementations depend on repository interfaces; repository interfaces manage domain entities or query projections. Show concrete repository implementations only when persistence mechanics are part of the selected function.

Place business entities, value types that define entity state, and relevant enums in `Domain Entity Layer`. Use accurate associations, multiplicities, and `typed by` or `has status` dependencies. Avoid turning response projections into domain entities.

Place databases, caches, queues, object stores, and external providers in `Infrastructure & Persistence`. In a class diagram, represent these as stereotyped classes such as `<<Database>>`, `<<Cache>>`, or `<<Message Broker>>`; PlantUML sequence-participant keywords such as `database`, `queue`, and `collections` are not valid class declarations in this view.

Prefer orthogonal connectors and the following approved layered layout:

- Keep the primary chain `Route → Controller → Service interface → ServiceImpl` narrow and vertical.
- Put the `DTO Layer` below and to the left of the service implementation.
- Put the `Repository Layer` below and to the right of the service implementation.
- Put the `Domain Entity Layer` below the repository so `Repository → Entity` reads downward.
- Put `Infrastructure & Persistence` at the bottom or bottom-right, after the domain/repository path.
- Remove secondary helper services from the primary class diagram when they stretch the `Service Layer` horizontally without materially explaining the use case. Summarize their policy responsibility in `ServiceImpl`, a note, the README, or an appendix instead.
- Prefer the real business entities needed by the selected function. For recruitment drill-down, this means entities such as `Application`, `Job`, and `RecruitmentStage` rather than only abstract analytics projections.
- Use hidden directional links only to stabilize this layout; hidden links must not imply undocumented business relationships.

A small number of horizontal infrastructure connections is acceptable. If the diagram still becomes excessively wide, move secondary infrastructure or detailed projections to an appendix instead of shrinking the entire diagram.

Use compact but clearly visible PlantUML visibility icons in the default layered view (`skinparam classAttributeIconSize 12`). Keep UML visibility markers in member declarations so PlantUML renders public members as green circular icons and private members as red square icons, matching the approved reference appearance. Use text-only `+` and `-` markers only when the user explicitly requests a plain notation style.

Use high-contrast structural styling by default: dark slate connector lines, visibly stronger class/package borders, and near-black member text on light backgrounds. A recommended PlantUML baseline is `ArrowColor #334155`, `ArrowThickness 1`, `ClassBorderColor #64748B`, `ClassBorderThickness 1`, `PackageBorderColor #475569`, `PackageBorderThickness 1`, and text color `#111827`. Preserve semantic fill colors while ensuring boundaries and connectors remain readable after PNG downscaling.

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
