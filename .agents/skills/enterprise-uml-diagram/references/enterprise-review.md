# Enterprise UML Review Checklist

Apply relevant items and record material gaps in the function README.

## Evidence and consistency

- Feature rules, OpenAPI, code, migrations, and diagrams agree.
- Conceptual elements are labeled when no implementation exists.
- Both diagrams use the same domain terminology and responsibility boundaries.
- Sequence participants map to classes/components or are explained as external/runtime infrastructure.
- State changes in the sequence are supported by the class or domain model.

## Architecture and correctness

- Master and tenant data ownership is unambiguous.
- Tenant context cannot leak across requests or workers.
- Authorization is enforced at a trusted server boundary.
- Transaction boundaries and consistency expectations are clear where relevant.
- Async delivery, idempotency, retry, and failure handling are represented when relevant.
- External failures do not silently become successful business outcomes.

## Security and operations

- Sensitive values and PII are not exposed.
- Security-relevant success and failure events are auditable.
- Error messages do not disclose protected internal state.
- Correlation identifiers appear when distributed tracing matters.
- Retention, consent, and human-review rules are described for AI, CV, audio, or video data when relevant.

## Readability and rendering

- Titles and feature/function identifiers are present.
- Legends explain non-obvious stereotypes or styles.
- Fonts remain readable at normal document zoom.
- Lines and labels are not clipped.
- Large diagrams are split instead of compressed.
- Only PNG artifacts are generated; requested PNG output uses at least 300 DPI.
