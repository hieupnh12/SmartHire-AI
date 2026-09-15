# Enterprise Class Diagram Rules

## Scope

Model the static structure required by the selected function, not the entire application. Choose one explicit viewpoint and state it in the diagram: domain model, application design, or persistence model. Do not silently mix JPA tables, API DTOs, and domain abstractions.

## Visual & Structural Style Standard (Mandatory)

Apply the approved enterprise layered style across all class diagrams:
- **No Diagram Title:** Do NOT include `title ...` in `.puml` files (keep diagrams clean for embedding in reports/documentation).
- **NO "Routing & Boundary" Package:** Do NOT include artificial `Routing & Boundary` or `<<REST API>>` pseudo-classes in class diagrams. Class diagrams model real application code structure (starting from Controller layer down to Infrastructure). Sequence diagrams already document HTTP route triggers.
- **Package Hierarchy (Controller-Downwards):**
  1. `Controller Layer` (`<<Controller>>`)
  2. `DTO Layer` (`<<Request>>`, `<<Response>>`, `<<Domain Event>>`, `<<DTO>>`)
  3. `Service Layer` (Pairing `interface <<Service>>` and implementation `class <<Service>> Impl`)
  4. `Repository Layer` (`interface <<Repository>>`)
  5. `Domain Entity Layer` (`<<Entity>>`, `<<Enum>>`)
  6. `Infrastructure & Persistence` (`<<Database>>`, `<<Cache>>`, `<<Queue>>`, `<<DataSource>>`)
- **Skinparam Specification:**
  ```plantuml
  skinparam dpi 300
  skinparam shadowing false
  skinparam packageStyle rectangle
  skinparam roundcorner 6
  skinparam linetype ortho
  skinparam defaultFontName "Arial"
  skinparam defaultFontSize 11
  skinparam classFontSize 11
  skinparam classAttributeFontSize 10

  skinparam class {
      BackgroundColor #FFFFFF
      BorderColor #2D3748
      ArrowColor #2D3748
  }
  ```
- **Stereotype Styling Standards:**
  - Controllers: `<<Controller>>` (`#F7FAFC`, border `#2D3748`)
  - Services: `interface <<Service>>` and `class <<Service>>` (`#FFFFFF`, border `#2D3748`)
  - DTOs / Events: `<<Request>>`, `<<Response>>`, `<<Domain Event>>` (`#FFFFFF`, border `#4A5568`)
  - Repositories: `interface <<Repository>>` (`#FFFFFF`, border `#2D3748`)
  - Entities: `<<Entity>>` (`#FFFFFF`, border `#2D3748`), `<<Enum>>` (`#EDF2F7`, border `#718096`)
  - Infrastructure: `<<Database>>`, `<<Cache>>`, `<<Queue>>` (`#F7FAFC`, border `#2D3748`)
- **Relationship Labels with Navigation Direction:**
  Always provide clear, directional relationship descriptions:
  - Controller to Service: `delegates >`
  - Controller to DTO: `consumes >`, `returns >`
  - Service to DTO: `creates >`, `processes >`
  - Service to Event/Queue: `emits >`, `publishes event >`
  - Service to Repository: `manages >`, `queries >`, `persists through >`
  - Service to Cache: `caches / evicts >`
  - Repository to Entity: `manages >`
  - Repository to Database: `persists to >`, `reads from >`
  - Entity to Enum: `typed by >`

## Detail level

Default to a graduation-project application-design view. The primary class diagram explains the use case through a clean structural dependency chain: `Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure`.

Keep:
- The controller, request/response contracts, main application service interfaces & implementations, repositories, domain entities, and data stores (PostgreSQL, MySQL, Redis, RabbitMQ).
- Important entity attributes, service operations, state values, multiplicities, and ownership relationships that affect the use case.
- The master-domain and tenant-domain separation when the feature crosses those boundaries.
- **Do NOT include pseudo-classes for routes or URLs in class diagrams.**

## Required content

- **Do NOT add `title`** (keep the diagram clean for embedding into documents).
- Group classes into the standard packages above.
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
