# @puppledoc/nestjs-api-reference

## 1.2.4

### Patch Changes

- 9a7fc46: Enum UX pass:

  - **Auto-lift inline enums into Models.** NestJS swagger inlines enum values when `@ApiProperty`'s `enumName` is omitted, which previously left every such enum unlinkable. The viewer now hoists those inline enums to `components.schemas` (named after the property, e.g. `status` → `Status`) and rewrites the originating site to `$ref`, so the type chip becomes a clickable model link and the enum appears in the sidebar — equivalent to the user having set `enumName` everywhere. Identical value sets dedupe to a single entry, and inline enums whose values match an existing `enumName`'d schema reuse that name. Applies to DTO properties, array items, and operation parameters (query/path/header).
  - **Parameter rows link to the model.** The Query/Path/Header rows now render the same `<model>` chip next to `enum` that the body schema rows do — previously they only rendered the bare `enum` label.
  - **Custom enum dropdown in the tester.** Replaces the OS-native `<select>` with a dark-themed dropdown that matches the rest of the tester (custom chevron, hover/focus styling, keyboard nav). Triggered automatically whenever a path/query/header param's resolved schema has `enum`.
  - **Type labels show base + format.** Schema rows render `string [ulid]` / `string [date-time]` / `integer [int64]` instead of the bare format, so the underlying primitive (and the row's color) stays consistent regardless of which format was set.

## 1.2.3

### Patch Changes

- 625b40f: Show enum members inline under parameter rows and DTO property rows. Previously the UI labeled the field as `enum` but never listed the allowed values, so users had to click through to the model page to see them.

## 1.2.2

### Patch Changes

- dbac3e5: Models list / command palette: classify each schema chip as `OBJECT`, `ENUM`, `ARRAY`, `UNION`, etc. instead of the generic `TYPE`. Detail page keeps its richer `array<X>` label.

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
