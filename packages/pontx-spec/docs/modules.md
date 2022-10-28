[pontx-spec](README.md) / Exports

# pontx-spec

## Table of contents

### Classes

- [Mod](classes/Mod.md)
- [Parameter](classes/Parameter.md)
- [PontAPI](classes/PontAPI.md)
- [PontDirectory](classes/PontDirectory.md)
- [PontJsonSchema](classes/PontJsonSchema.md)
- [PontSpec](classes/PontSpec.md)
- [PontSpecs](classes/PontSpecs.md)

### Type Aliases

- [ObjectMap](modules.md#objectmap)

### Variables

- [PontJsonPointer](modules.md#pontjsonpointer)
- [WithoutModsName](modules.md#withoutmodsname)

### Functions

- [removeMapKeys](modules.md#removemapkeys)

## Type Aliases

### ObjectMap

Ƭ **ObjectMap**<`T`\>: `Object`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Index signature

▪ [key: `string`]: `T`

#### Defined in

[src/utils.ts:4](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/utils.ts#L4)

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

[src/jsonpointer.ts:163](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/jsonpointer.ts#L163)

___

### WithoutModsName

• `Const` **WithoutModsName**: typeof [`WithoutModsName`](modules.md#withoutmodsname)

#### Defined in

[src/index.ts:50](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L50)

## Functions

### removeMapKeys

▸ **removeMapKeys**<`T`\>(`obj`, `checkRemoveKey`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ObjectMap`](modules.md#objectmap)<`any`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `obj` | `T` |
| `checkRemoveKey` | (`key`: `string`) => `boolean` |

#### Returns

`T`

#### Defined in

[src/utils.ts:117](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/utils.ts#L117)
