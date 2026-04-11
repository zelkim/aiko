## REMOVED Requirements

### Requirement: prepare_edit_draft collects edit fields before edit_event
**Reason**: Replaced by conversational field collection in the EDIT specialized agent. The EDIT agent handles missing fields naturally — it asks the user for what it needs, then calls `edit_event` directly. `events.patch` ensures only provided fields are updated, so there is no risk of data loss from missing fields in the request body. `normalizeToRfc3339()` is moved inline into `edit_event.execute()`.
**Migration**: Replace any calls or references to `prepare_edit_draft` with direct `edit_event` calls. The EDIT agent's system prompt instructs the model to collect missing fields conversationally.
