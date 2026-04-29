---
'@puppledoc/nestjs-api-reference': patch
'@puppledoc/space-ui': patch
---

Sidebar groups now default to collapsed (the group containing the active endpoint auto-opens). Body/Response/Frame/Reply card headers surface the linked DTO name when the schema is a `$ref`, and `array<object>` rows show `array<DtoName>` with a clickable model link when the array items reference a named component.
