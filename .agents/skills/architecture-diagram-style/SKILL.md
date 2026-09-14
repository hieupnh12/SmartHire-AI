---
name: architecture-diagram-style
description: Reuse the approved SmartHire-AI visual style for System Architecture, Package Diagram, and Database Design/ERD images. Applies only to these three diagram families, not application UI, banners, slides, or other UML diagrams.
---

# Architecture Diagram Style

Apply the user's saved visual preference to **System Architecture**, **Package Diagram**, and **Database Design / ERD** only. This is a project-local diagram style, not an extension of application UI tokens in `DESIGN.md`. Later user instructions override these defaults.

## Approved visual references

Paths below are relative to the repository root. Inspect the relevant existing PNG before drawing; reuse its style, not its potentially outdated architecture or schema:

- System Architecture: `docs/diagram/00-system-architecture/system-architecture-detailed.png` and `system-architecture.png`.
- Package Diagram: `docs/diagram/00-system-architecture/package-diagram-detailed.png`.
- Database Design: `docs/diagram/00-system-architecture/database-design-workspace-postgresql.png` and `database-design-tenant-mysql.png`.

Do not require temporary scripts from earlier sessions; those are not durable project resources.

## Visual specification

- Opaque white background (`#FFFFFF`), generous spacing, flat rectangular containers, no gradients or shadows.
- Colored pale fills with dark matching borders and headings. Use a 4–5 logical-pixel left accent bar for component/package cards; database tables use a colored header band.
- Main title: `#19354C`, bold Segoe UI, 30–36 logical px. Subtitle: 16–24 px. Card title: 18–20 px; body: 14–17 px; dense table rows: 14–15 px. Use Arial or another readable sans-serif if Segoe UI is unavailable.
- Primary text: `#263649`; secondary text: `#46596B`. Avoid faint gray labels.
- Container borders: 2.2–2.5 logical px, outer frame `#40566B`. Connectors: 3.2 logical px, default `#34475B`, with clear arrowheads. Logical px are measured before export scaling.
- Prefer orthogonal connectors routed through reserved gutters. Keep lines away from text and card interiors. Leave room for arrowheads and labels. Reduce crossings by moving cards or using explicit FK references, not by shrinking text.
- Include a concise title, scope, and legend. Content inside diagrams is English; accompanying product documentation is Vietnamese.

## Color palette

| Role / group | Border and heading | Pale fill |
| --- | --- | --- |
| Deployment, Master business domain, identity/jobs | `#126346` | `#DDF2E8` |
| REST/controllers, CI, shared backend configuration | `#1956AD` | `#DFEBFF` |
| PostgreSQL, application/ranking tables | `#244D91` | `#E0EAFE` |
| React, MySQL, CV/storage | `#08778A` | `#D9F3F6` |
| Repositories / persistence component | `#08766B` | `#DAF2ED` |
| Tenant domain, services, Zustand, workers, assessment | `#7942A1` | `#F0E3FA` |
| Multi-tenant core, RabbitMQ, helpers, interview tables | `#A8500A` | `#FFE9CE` |
| TanStack Query | `#A44918` | `#FFF0D9` |
| Security / identity provider | `#3C7422` | `#E7F4D9` |
| Redis, messaging package, scheduling/practice tables | `#AC302B` | `#FCE2E0` |
| Users, repository hosting, neutral components | `#334155` | `#E5EAF0` |

These mappings are presentation defaults, not technical semantics. Reuse colors for related groups; labels remain authoritative. For large nested packages, use lighter parent fills (`#F1FAF5` master, `#F9F3FD` tenant, `#FFF7EC` multi-tenancy) with saturated child borders.

## Diagram-specific rules

### System Architecture

Place users/frontend on the left, backend centrally, deployment/CI above, data infrastructure below, and external integrations to the right when included. For a detailed view, show Master Domain, Tenant Domain, Multi-Tenant Core and messaging separately. Expand the core into tenant validation, context, registry and connection selection when it improves clarity.

Solid connectors represent runtime interactions/dependencies; dashed connectors represent deployment mappings or planned integrations, with explicit labels. Mark planned/scaffold integrations instead of implying they are complete. Derive technologies and responsibilities from current code/configuration; do not freeze the stack from reference images.

### Package Diagram

Use folder-tab package boxes and nesting to show ownership. Keep frontend folders separate from Java packages; distinguish child packages from example classes. Expand meaningful subpackages for detailed views.

Dashed arrows point from the dependent package to the package it uses; solid arrows represent HTTP calls between frontend/backend. State that only selected dependencies are drawn if omitting edges. Do not add packages that only exist in planned conventions.

If a README explanation is requested, include `Package Descriptions` with columns `No`, `Package`, `Description`, sequential numbers such as `01`, and Vietnamese descriptions.

### Database Design / ERD

Read the active Flyway pipelines, including ALTER statements, and cross-check entities. For a physical design, SQL constraints are authoritative: a JPA association or a column ending in `_id` does not prove a database foreign key exists.

Separate workspace/Master PostgreSQL and tenant MySQL images when both databases are in scope, unless the user requests another arrangement. Draw tables as colored header + column rows. Show types, `PK`, `FK`, `UQ`, and nullable `?`; derive cardinality from FK nullability and unique/primary constraints. Explain composite unique constraints separately. Never include stored credentials or record values.

For a large schema, group tables by domain in readable lanes. List every declared FK and its target in table footers if routing every connector would obscure the diagram. Label selected drawn connections as selected; do not suggest all edges are drawn. Explain unconstrained reference-like columns when relevant. Keep a useful readable overview without dropping tables silently.

## Export and verification

- Default deliverable: **PNG only**, unless another format is requested. A request to export an image authorizes rendering that image; do not impose a source-review approval step for this style. Do not create class/sequence diagrams or SVG files just because a different UML workflow uses them.
- Prefer a deterministic diagram renderer or code-based drawing for exact names and relationships. A local PowerShell/System.Drawing renderer worked for the approved images; other tools are acceptable if they reproduce the specification. Choose text bounds from content size rather than a fixed height that clips multiline labels.
- Export at least 2x logical resolution and at least 300 DPI. With System.Drawing use `SetResolution(300.1, 300.1)` to avoid PNG rounding below 300; verify the saved metadata.
- Choose canvas size to fit content. References range from 3600×2160 to 6720×8402 pixels; these are examples, not fixed dimensions.
- Save beside the existing artifacts under `docs/diagram/00-system-architecture/` for this project. Preserve older variants when asked for another/new image; overwrite only the intended image when asked to update it.
- Inspect the exported image for clipping, wrapped identifiers, overlapping connectors, readable legends and correct relationships. For a dense image, inspect full-resolution detail as needed. Confirm artifact existence, dimensions and DPI before handing it off.
- Finish with direct PNG links and minimal text. Do not change application behavior, feature status, or unrelated diagram families to save/apply this style.
