[pontx-spec](../README.md) / [Exports](../modules.md) / PontSpec

# Class: PontSpec

## Table of contents

### Constructors

- [constructor](PontSpec.md#constructor)

### Properties

- [apis](PontSpec.md#apis)
- [definitions](PontSpec.md#definitions)
- [directories](PontSpec.md#directories)
- [ext](PontSpec.md#ext)
- [name](PontSpec.md#name)

### Methods

- [checkHasMods](PontSpec.md#checkhasmods)
- [constructorByName](PontSpec.md#constructorbyname)
- [getClazzCnt](PontSpec.md#getclazzcnt)
- [getMods](PontSpec.md#getmods)
- [isEmptySpec](PontSpec.md#isemptyspec)
- [reOrder](PontSpec.md#reorder)
- [removeMod](PontSpec.md#removemod)
- [serialize](PontSpec.md#serialize)
- [updateMod](PontSpec.md#updatemod)
- [validateLock](PontSpec.md#validatelock)

## Constructors

### constructor

• **new PontSpec**(`ds?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `ds?` | [`PontSpec`](PontSpec.md) |

#### Defined in

[src/index.ts:175](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L175)

## Properties

### apis

• **apis**: [`ObjectMap`](../modules.md#objectmap)<[`PontAPI`](PontAPI.md)\>

如果有 namespace，则 map key 可能为 namespace.apiName，否则为 apiName

#### Defined in

[src/index.ts:62](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L62)

___

### definitions

• **definitions**: [`ObjectMap`](../modules.md#objectmap)<[`PontJsonSchema`](PontJsonSchema.md)\>

#### Defined in

[src/index.ts:60](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L60)

___

### directories

• **directories**: [`PontDirectory`](PontDirectory.md)[] = `[]`

#### Defined in

[src/index.ts:63](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L63)

___

### ext

• `Optional` **ext**: `any`

扩展字段

#### Defined in

[src/index.ts:65](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L65)

___

### name

• **name**: `string`

#### Defined in

[src/index.ts:59](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L59)

## Methods

### checkHasMods

▸ `Static` **checkHasMods**(`spec`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |

#### Returns

`boolean`

#### Defined in

[src/index.ts:75](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L75)

___

### constructorByName

▸ `Static` **constructorByName**(`name`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[src/index.ts:181](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L181)

___

### getClazzCnt

▸ `Static` **getClazzCnt**(`spec`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |

#### Returns

`number`

#### Defined in

[src/index.ts:198](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L198)

___

### getMods

▸ `Static` **getMods**(`spec`): [`Mod`](Mod.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |

#### Returns

[`Mod`](Mod.md)[]

#### Defined in

[src/index.ts:97](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L97)

___

### isEmptySpec

▸ `Static` **isEmptySpec**(`spec`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |

#### Returns

`boolean`

#### Defined in

[src/index.ts:190](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L190)

___

### reOrder

▸ `Static` **reOrder**(`ds`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `ds` | [`PontSpec`](PontSpec.md) |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[src/index.ts:67](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L67)

___

### removeMod

▸ `Static` **removeMod**(`spec`, `modName`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `modName` | `string` |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[src/index.ts:155](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L155)

___

### serialize

▸ `Static` **serialize**(`ds`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `ds` | [`PontSpec`](PontSpec.md) |

#### Returns

`string`

#### Defined in

[src/index.ts:171](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L171)

___

### updateMod

▸ `Static` **updateMod**(`spec`, `mod`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | [`PontSpec`](PontSpec.md) |
| `mod` | [`Mod`](Mod.md) |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[src/index.ts:138](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L138)

___

### validateLock

▸ `Static` **validateLock**(`ds`): `string`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `ds` | [`PontSpec`](PontSpec.md) |

#### Returns

`string`[]

#### Defined in

[src/index.ts:166](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L166)
