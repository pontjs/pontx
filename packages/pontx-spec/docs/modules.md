[pontx-spec](README.md) / Exports

# pontx-spec

## Table of contents

### Enumerations

- [PontxDirectoryNodeType](enums/PontxDirectoryNodeType.md)

### Classes

- [DiffItem](classes/DiffItem.md)
- [Mod](classes/Mod.md)
- [Parameter](classes/Parameter.md)
- [PontAPI](classes/PontAPI.md)
- [PontJsonSchema](classes/PontJsonSchema.md)
- [PontNamespace](classes/PontNamespace.md)
- [PontSpec](classes/PontSpec.md)
- [PontSpecs](classes/PontSpecs.md)
- [PontxDirectoryNode](classes/PontxDirectoryNode.md)
- [SpecDiffTree](classes/SpecDiffTree.md)

### Type Aliases

- [ObjectMap](modules.md#objectmap)
- [ResponseObject](modules.md#responseobject)

### Variables

- [PontJsonPointer](modules.md#pontjsonpointer)
- [WithoutModsName](modules.md#withoutmodsname)

### Functions

- [parsePontSpec2OAS2](modules.md#parsepontspec2oas2)
- [removeMapKeys](modules.md#removemapkeys)

## Type Aliases

### ObjectMap

Ƭ **ObjectMap**\<`T`\>: `Object`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Index signature

▪ [key: `string`]: `T`

#### Defined in

[pontx-spec/src/utils.ts:4](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/utils.ts#L4)

___

### ResponseObject

Ƭ **ResponseObject**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `description?` | `string` |
| `headers?` | `OAS2.HeadersObject` |
| `schema` | [`PontJsonSchema`](classes/PontJsonSchema.md) |

#### Defined in

[pontx-spec/src/type.ts:15](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L15)

## Variables

### PontJsonPointer

• `Const` **PontJsonPointer**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `get` | (`json`: `any`, `jsonpointer`: `string`) => `any` |
| `remove` | (`json`: `any`, `jsonpointer`: `string`) => `any` |
| `removeMapKeyBy` | (`json`: `any`, `jsonpointer`: `string`, `checkRemoveKey`: (`key`: `string` \| `number`) => `boolean`) => `any` |
| `set` | (`json`: `any`, `jsonpointer`: `string`, `newValue`: `any`) => `any` |
| `update` | (`json`: `any`, `jsonpointer`: `string`, `updator`: (`val`: `any`) => `any`) => `any` |

#### Defined in

[pontx-spec/src/jsonpointer.ts:163](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/jsonpointer.ts#L163)

___

### WithoutModsName

• `Const` **WithoutModsName**: typeof [`WithoutModsName`](modules.md#withoutmodsname)

#### Defined in

[pontx-spec/src/type.ts:225](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L225)

## Functions

### parsePontSpec2OAS2

▸ **parsePontSpec2OAS2**(`spec`): `SwaggerObject` \| \{ `apis`: [`ObjectMap`](modules.md#objectmap)\<[`PontAPI`](classes/PontAPI.md)\> = spec.apis; `basePath`: `string` = spec.basePath; `definitions`: [`ObjectMap`](modules.md#objectmap)\<[`PontJsonSchema`](classes/PontJsonSchema.md)\> = spec.definitions; `externalDocs`: `ExternalDocumentationObject` = spec.externalDocs; `host`: `string` = spec.host; `info`: \{ `description`: `string` = spec.description; `title`: `string` = spec.title; `version`: `string` = spec.version } ; `swagger`: `string` = "2.0"; `tags`: \{ `description`: `string` ; `name`: `string`  }[]  }

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](classes/PontSpec.md) |

#### Returns

`SwaggerObject` \| \{ `apis`: [`ObjectMap`](modules.md#objectmap)\<[`PontAPI`](classes/PontAPI.md)\> = spec.apis; `basePath`: `string` = spec.basePath; `definitions`: [`ObjectMap`](modules.md#objectmap)\<[`PontJsonSchema`](classes/PontJsonSchema.md)\> = spec.definitions; `externalDocs`: `ExternalDocumentationObject` = spec.externalDocs; `host`: `string` = spec.host; `info`: \{ `description`: `string` = spec.description; `title`: `string` = spec.title; `version`: `string` = spec.version } ; `swagger`: `string` = "2.0"; `tags`: \{ `description`: `string` ; `name`: `string`  }[]  }

#### Defined in

[pontx-spec/src/parse.ts:6](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/parse.ts#L6)

___

### removeMapKeys

▸ **removeMapKeys**\<`T`\>(`obj`, `checkRemoveKey`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ObjectMap`](modules.md#objectmap)\<`any`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `obj` | `T` |
| `checkRemoveKey` | (`key`: `string`) => `boolean` |

#### Returns

`T`

#### Defined in

[pontx-spec/src/utils.ts:117](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/utils.ts#L117)
