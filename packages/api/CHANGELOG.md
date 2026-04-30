# @puppledoc/nestjs-api-reference

## 1.2.1

### Patch Changes

- 07947f2: Sidebar groups now default to collapsed (the group containing the active endpoint auto-opens). Body/Response/Frame/Reply card headers surface the linked DTO name when the schema is a `$ref`, and `array<object>` rows show `array<DtoName>` with a clickable model link when the array items reference a named component.
- Type labels now prefer `format` over `type` (e.g. `date-time`, `uri`, `binary`) — also rescues schemas where the generator couldn't resolve a `string | null` union and fell back to `object`.
- For array-of-ref schemas the `array<DtoName>` form is consolidated into the section header (response model line, body / frame / reply card head, and per-row type column) instead of being repeated below.
- Schema rows now indent progressively per nesting depth so children of a nested object sit one level further in.

## 1.2.0

### Minor Changes

- cba0577: Surface `components.schemas` as a Models group at the bottom of the sidebar — collapsed by default — so DTOs are browsable. Enum properties that reference a named schema now show the model name next to the `enum` label and link to its model page.

## 1.0.0

### Major Changes

- Initial release

### Patch Changes

- Updated dependencies
  - @puppledoc/space-ui@1.0.0
