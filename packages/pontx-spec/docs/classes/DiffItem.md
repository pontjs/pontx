[pontx-spec](../README.md) / [Exports](../modules.md) / DiffItem

# Class: DiffItem

## Table of contents

### Constructors

- [constructor](DiffItem.md#constructor)

### Properties

- [diffItems](DiffItem.md#diffitems)
- [diffType](DiffItem.md#difftype)
- [name](DiffItem.md#name)
- [new](DiffItem.md#new)
- [pre](DiffItem.md#pre)
- [type](DiffItem.md#type)

### Methods

- [checkHasDefinitionsUpdate](DiffItem.md#checkhasdefinitionsupdate)
- [getControllerDiffItems](DiffItem.md#getcontrollerdiffitems)
- [getDiffCnt](DiffItem.md#getdiffcnt)
- [getSpecDiffCnt](DiffItem.md#getspecdiffcnt)
- [getSpecDiffTree](DiffItem.md#getspecdifftree)

## Constructors

### constructor

• **new DiffItem**()

## Properties

### diffItems

• `Optional` **diffItems**: [`DiffItem`](DiffItem.md)[]

仅当 type = spec 时存在

#### Defined in

[pontx-spec/src/diff.ts:20](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/diff.ts#L20)

___

### diffType

• **diffType**: ``"updated"`` \| ``"deleted"`` \| ``"created"``

#### Defined in

[pontx-spec/src/diff.ts:16](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/diff.ts#L16)

___

### name

• **name**: `string`

#### Defined in

[pontx-spec/src/diff.ts:15](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/diff.ts#L15)

___

### new

• `Optional` **new**: `any`

#### Defined in

[pontx-spec/src/diff.ts:18](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/diff.ts#L18)

___

### pre

• `Optional` **pre**: `any`

#### Defined in

[pontx-spec/src/diff.ts:17](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/diff.ts#L17)

___

### type

• **type**: ``"api"`` \| ``"struct"`` \| ``"specInfo"`` \| ``"spec"`` \| ``"dir"`` \| ``"controller"``

#### Defined in

[pontx-spec/src/diff.ts:14](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/diff.ts#L14)

## Methods

### checkHasDefinitionsUpdate

▸ `Static` **checkHasDefinitionsUpdate**(`diffItem`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `diffItem` | [`DiffItem`](DiffItem.md) |

#### Returns

`boolean`

#### Defined in

[pontx-spec/src/diff.ts:22](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/diff.ts#L22)

___

### getControllerDiffItems

▸ `Static` **getControllerDiffItems**(`diffItem`, `controllerName`): [`DiffItem`](DiffItem.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `diffItem` | [`DiffItem`](DiffItem.md) |
| `controllerName` | `string` |

#### Returns

[`DiffItem`](DiffItem.md)[]

#### Defined in

[pontx-spec/src/diff.ts:40](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/diff.ts#L40)

___

### getDiffCnt

▸ `Static` **getDiffCnt**(`diffItems`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `diffItems` | [`DiffItem`](DiffItem.md)[] |

#### Returns

`void`

#### Defined in

[pontx-spec/src/diff.ts:84](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/diff.ts#L84)

___

### getSpecDiffCnt

▸ `Static` **getSpecDiffCnt**(`specDiffTree`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `specDiffTree` | [`SpecDiffTree`](SpecDiffTree.md) |

#### Returns

`number`

#### Defined in

[pontx-spec/src/diff.ts:60](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/diff.ts#L60)

___

### getSpecDiffTree

▸ `Static` **getSpecDiffTree**(`diffItems`, `specName`): [`SpecDiffTree`](SpecDiffTree.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `diffItems` | [`DiffItem`](DiffItem.md)[] |
| `specName` | `string` |

#### Returns

[`SpecDiffTree`](SpecDiffTree.md)

#### Defined in

[pontx-spec/src/diff.ts:86](https://github.com/pontjs/pontx/tree/main/packages/pontx-spec/src/diff.ts#L86)
