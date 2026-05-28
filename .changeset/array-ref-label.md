---
'@puppledoc/nestjs-api-reference': patch
'@puppledoc/space-ui': patch
---

Fix `array<…>` labels to use the item schema name when the array items are a `$ref`. Parameter rows and model headers previously fell through to `format`/`type` and rendered `array<object>` for ref-typed array items (e.g. `kinds: TypeKind[]` exposed via `@ApiProperty({ enum: TypeKind, enumName: 'TypeKind', isArray: true })`); they now render `array<TypeKind>`, matching how `SchemaTree` already rendered ref arrays in property rows.
