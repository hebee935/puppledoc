---
'@puppledoc/nestjs-api-reference': patch
'@puppledoc/space-ui': patch
---

Enum UX pass:

- **Auto-lift inline enums into Models.** NestJS swagger inlines enum values when `@ApiProperty`'s `enumName` is omitted, which previously left every such enum unlinkable. The viewer now hoists those inline enums to `components.schemas` (named after the property, e.g. `status` → `Status`) and rewrites the originating site to `$ref`, so the type chip becomes a clickable model link and the enum appears in the sidebar — equivalent to the user having set `enumName` everywhere. Identical value sets dedupe to a single entry, and inline enums whose values match an existing `enumName`'d schema reuse that name. Applies to DTO properties, array items, and operation parameters (query/path/header).
- **Parameter rows link to the model.** The Query/Path/Header rows now render the same `<model>` chip next to `enum` that the body schema rows do — previously they only rendered the bare `enum` label.
- **Custom enum dropdown in the tester.** Replaces the OS-native `<select>` with a dark-themed dropdown that matches the rest of the tester (custom chevron, hover/focus styling, keyboard nav). Triggered automatically whenever a path/query/header param's resolved schema has `enum`.
- **Type labels show base + format.** Schema rows render `string [ulid]` / `string [date-time]` / `integer [int64]` instead of the bare format, so the underlying primitive (and the row's color) stays consistent regardless of which format was set.
