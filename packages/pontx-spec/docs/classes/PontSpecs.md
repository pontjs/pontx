[pontx-spec](../README.md) / [Exports](../modules.md) / PontSpecs

# Class: PontSpecs

## Table of contents

### Constructors

- [constructor](PontSpecs.md#constructor)

### Methods

- [checkIsSingleSpec](PontSpecs.md#checkissinglespec)
- [getSpecByName](PontSpecs.md#getspecbyname)
- [getSpecIndex](PontSpecs.md#getspecindex)
- [getUpdateSpecIndex](PontSpecs.md#getupdatespecindex)
- [updateSpec](PontSpecs.md#updatespec)

## Constructors

### constructor

• **new PontSpecs**()

## Methods

### checkIsSingleSpec

▸ `Static` **checkIsSingleSpec**(`specs`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `specs` | [`PontSpec`](PontSpec.md)[] |

#### Returns

`boolean`

#### Defined in

[pontx-spec/src/type.ts:986](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L986)

___

### getSpecByName

▸ `Static` **getSpecByName**(`specs`, `specName`): [`PontSpec`](PontSpec.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `specs` | [`PontSpec`](PontSpec.md)[] |
| `specName` | `string` |

#### Returns

[`PontSpec`](PontSpec.md)

#### Defined in

[pontx-spec/src/type.ts:990](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L990)

___

### getSpecIndex

▸ `Static` **getSpecIndex**(`specs`, `specName`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `specs` | [`PontSpec`](PontSpec.md)[] |
| `specName` | `string` |

#### Returns

`number`

#### Defined in

[pontx-spec/src/type.ts:994](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L994)

___

### getUpdateSpecIndex

▸ `Static` **getUpdateSpecIndex**(`specs`, `specName`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `specs` | [`PontSpec`](PontSpec.md)[] |
| `specName` | `string` |

#### Returns

`number`

#### Defined in

[pontx-spec/src/type.ts:1004](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L1004)

___

### updateSpec

▸ `Static` **updateSpec**(`specs`, `specName`, `newSpec`): [`PontSpec`](PontSpec.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `specs` | [`PontSpec`](PontSpec.md)[] |
| `specName` | `string` |
| `newSpec` | [`PontSpec`](PontSpec.md) |

#### Returns

[`PontSpec`](PontSpec.md)[]

#### Defined in

[pontx-spec/src/type.ts:968](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/type.ts#L968)
