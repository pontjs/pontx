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

[src/index.ts:222](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L222)

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

[src/index.ts:226](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L226)

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

[src/index.ts:230](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L230)

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

[src/index.ts:240](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L240)

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

[src/index.ts:204](https://github.com/pontjs/pontx/blob/647ce3c/packages/pontx-spec/src/index.ts#L204)
