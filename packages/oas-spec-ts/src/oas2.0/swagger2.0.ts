/** https://github.com/OAI/OpenAPI-Specification/blob/main/schemas/v2.0/schema.json */

import { JsonSchema } from "../JsonSchema";
/**
 * This is the root document object for the API specification. It combines what previously was the Resource Listing and API Declaration (version 1.2 and earlier) together into one document.
 */
export class SwaggerObject {
  /**
   * Specifies the Swagger Specification version being used. It can be used by the Swagger UI and other clients to interpret the API listing. The value MUST be <code>"2.0"</code>.
   */
  swagger: string;

  /**
   * Provides metadata about the API. The metadata can be used by the clients if needed.
   */
  info: InfoObject;

  /**
   * The host (name or ip) serving the API. This MUST be the host only and does not include the scheme nor sub-paths. It MAY include a port. If the <code>host</code> is not included, the host serving the documentation is to be used (including the port). The <code>host</code> does not support <a href="https://swagger.io/specification/v2/#pathTemplating">path templating</a>.
   */
  host: string;

  /**
   * The base path on which the API is served, which is relative to the <a href="https://swagger.io/specification/v2/#swaggerHost"><code>host</code></a>. If it is not included, the API is served directly under the <code>host</code>. The value MUST start with a leading slash (<code>/</code>). The <code>basePath</code> does not support <a href="https://swagger.io/specification/v2/#pathTemplating">path templating</a>.
   */
  basePath: string;

  /**
   * The transfer protocol of the API. Values MUST be from the list: <code>"http"</code>, <code>"https"</code>, <code>"ws"</code>, <code>"wss"</code>. If the <code>schemes</code> is not included, the default scheme to be used is the one used to access the Swagger definition itself.
   */
  schemes: Array<string>;

  /**
   * A list of MIME types the APIs can consume. This is global to all APIs but can be overridden on specific API calls. Value MUST be as described under <a href="https://swagger.io/specification/v2/#mimeTypes">Mime Types</a>.
   */
  consumes: Array<string>;

  /**
   * A list of MIME types the APIs can produce. This is global to all APIs but can be overridden on specific API calls. Value MUST be as described under <a href="https://swagger.io/specification/v2/#mimeTypes">Mime Types</a>.
   */
  produces: Array<string>;

  /**
   * The available paths and operations for the API.
   */
  paths: PathsObject;

  /**
   * An object to hold data types produced and consumed by operations.
   */
  definitions: DefinitionsObject;

  /**
   * An object to hold parameters that can be used across operations. This property <em>does not</em> define global parameters for all operations.
   */
  parameters: ParametersDefinitionsObject;

  /**
   * An object to hold responses that can be used across operations. This property <em>does not</em> define global responses for all operations.
   */
  responses: ResponsesDefinitionsObject;

  /**
   * Security scheme definitions that can be used across the specification.
   */
  securityDefinitions: SecurityDefinitionsObject;

  /**
   * A declaration of which security schemes are applied for the API as a whole. The list of values describes alternative security schemes that can be used (that is, there is a logical OR between the security requirements). Individual operations can override this definition.
   */
  security: Array<SecurityRequirementObject>;

  /**
   * A list of tags used by the specification with additional metadata. The order of the tags can be used to reflect on their order by the parsing tools. Not all tags that are used by the <a href="https://swagger.io/specification/v2/#operationObject">Operation Object</a> must be declared. The tags that are not declared may be organized randomly or based on the tools' logic. Each tag name in the list MUST be unique.
   */
  tags: Array<TagObject>;

  /**
   * Additional external documentation.
   */
  externalDocs: ExternalDocumentationObject;
}

/**
 * The object provides metadata about the API. The metadata can be used by the clients if needed, and can be presented in the Swagger-UI for convenience.
 */
export class InfoObject {
  /**
   * The title of the application.
   */
  title: string;

  /**
   * A short description of the application. <a href="https://guides.github.com/features/mastering-markdown/#GitHub-flavored-markdown">GFM syntax</a> can be used for rich text representation.
   */
  description: string;

  /**
   * The Terms of Service for the API.
   */
  termsOfService: string;

  /**
   * The contact information for the exposed API.
   */
  contact: ContactObject;

  /**
   * The license information for the exposed API.
   */
  license: LicenseObject;

  /**
   * <strong>Required</strong> Provides the version of the application API (not to be confused with the specification version).
   */
  version: string;
}

/**
 * Contact information for the exposed API.
 */
export class ContactObject {
  /**
   * The identifying name of the contact person/organization.
   */
  name?: string;

  /**
   * The URL pointing to the contact information. MUST be in the format of a URL.
   */
  url?: string;

  /**
   * The email address of the contact person/organization. MUST be in the format of an email address.
   */
  email?: string;
}

/**
 * License information for the exposed API.
 */
export class LicenseObject {
  /**
   * The license name used for the API.
   */
  name: string;

  /**
   * A URL to the license used for the API. MUST be in the format of a URL.
   */
  url: string;
}

/**
 * Holds the relative paths to the individual endpoints. The path is appended to the <a href="https://swagger.io/specification/v2/#swaggerBasePath"><code>basePath</code></a> in order to construct the full URL.
 * The Paths may be empty, due to <a href="https://swagger.io/specification/v2/#securityFiltering">ACL constraints</a>.
 */
export class PathsObject {
  /**
   * A relative path to an individual endpoint. The field name MUST begin with a slash. The path is appended to the <a href="https://swagger.io/specification/v2/#swaggerBasePath"><code>basePath</code></a> in order to construct the full URL. <a href="https://swagger.io/specification/v2/#pathTemplating">Path templating</a> is allowed.
   */
  [key: string]: PathItemObject;
}

/**
 * Describes the operations available on a single path.
 * A Path Item may be empty, due to <a href="https://swagger.io/specification/v2/#securityFiltering">ACL constraints</a>. The path itself is still exposed to the documentation viewer but they will not know which operations and parameters are available.
 */
export class PathItemObject {
  /**
   * Allows for an external definition of this path item. The referenced structure MUST be in the format of a <a href="https://swagger.io/specification/v2/#pathItemObject">Path Item Object</a>. If there are conflicts between the referenced definition and this Path Item's definition, the behavior is <em>undefined</em>.
   */
  $ref?: string;

  /**
   * A definition of a GET operation on this path.
   */
  get?: OperationObject;

  /**
   * A definition of a PUT operation on this path.
   */
  put?: OperationObject;

  /**
   * A definition of a POST operation on this path.
   */
  post?: OperationObject;

  /**
   * A definition of a DELETE operation on this path.
   */
  delete?: OperationObject;

  /**
   * A definition of a OPTIONS operation on this path.
   */
  options?: OperationObject;

  /**
   * A definition of a HEAD operation on this path.
   */
  head?: OperationObject;

  /**
   * A definition of a PATCH operation on this path.
   */
  patch?: OperationObject;

  /**
   * A list of parameters that are applicable for all the operations described under this path. These parameters can be overridden at the operation level, but cannot be removed there. The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a <a href="https://swagger.io/specification/v2/#parameterName">name</a> and <a href="https://swagger.io/specification/v2/#parameterIn">location</a>. The list can use the <a href="https://swagger.io/specification/v2/#referenceObject">Reference Object</a> to link to parameters that are defined at the <a href="https://swagger.io/specification/v2/#swaggerParameters">Swagger Object's parameters</a>. There can be one "body" parameter at most.
   */
  parameters?: Array<ParameterObject & ReferenceObject>;
}

/**
 * Describes a single API operation on a path.
 */
export class OperationObject {
  /**
   * A list of tags for API documentation control. Tags can be used for logical grouping of operations by resources or any other qualifier.
   */
  tags?: Array<string>;

  /**
   * A short summary of what the operation does. For maximum readability in the swagger-ui, this field SHOULD be less than 120 characters.
   */
  summary?: string;

  /**
   * A verbose explanation of the operation behavior. <a href="https://guides.github.com/features/mastering-markdown/#GitHub-flavored-markdown">GFM syntax</a> can be used for rich text representation.
   */
  description?: string;

  /**
   * Additional external documentation for this operation.
   */
  externalDocs?: ExternalDocumentationObject;

  /**
   * Unique string used to identify the operation. The id MUST be unique among all operations described in the API. Tools and libraries MAY use the operationId to uniquely identify an operation, therefore, it is recommended to follow common programming naming conventions.
   */
  operationId?: string;

  /**
   * A list of MIME types the operation can consume. This overrides the <a href="https://swagger.io/specification/v2/#swaggerConsumes"><code>consumes</code></a> definition at the Swagger Object. An empty value MAY be used to clear the global definition. Value MUST be as described under <a href="https://swagger.io/specification/v2/#mimeTypes">Mime Types</a>.
   */
  consumes?: Array<string>;

  /**
   * A list of MIME types the operation can produce. This overrides the <a href="https://swagger.io/specification/v2/#swaggerProduces"><code>produces</code></a> definition at the Swagger Object. An empty value MAY be used to clear the global definition. Value MUST be as described under <a href="https://swagger.io/specification/v2/#mimeTypes">Mime Types</a>.
   */
  produces?: Array<string>;

  /**
   * A list of parameters that are applicable for this operation. If a parameter is already defined at the <a href="https://swagger.io/specification/v2/#pathItemParameters">Path Item</a>, the new definition will override it, but can never remove it. The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a <a href="https://swagger.io/specification/v2/#parameterName">name</a> and <a href="https://swagger.io/specification/v2/#parameterIn">location</a>. The list can use the <a href="https://swagger.io/specification/v2/#referenceObject">Reference Object</a> to link to parameters that are defined at the <a href="https://swagger.io/specification/v2/#swaggerParameters">Swagger Object's parameters</a>. There can be one "body" parameter at most.
   */
  parameters?: Array<ParameterObject & ReferenceObject>;

  /**
   * The list of possible responses as they are returned from executing this operation.
   */
  responses: ResponsesObject;

  /**
   * The transfer protocol for the operation. Values MUST be from the list: <code>"http"</code>, <code>"https"</code>, <code>"ws"</code>, <code>"wss"</code>. The value overrides the Swagger Object <a href="https://swagger.io/specification/v2/#swaggerSchemes"><code>schemes</code></a> definition.
   */
  schemes: Array<string>;

  /**
   * Declares this operation to be deprecated. Usage of the declared operation should be refrained. Default value is <code>false</code>.
   */
  deprecated: boolean;

  /**
   * A declaration of which security schemes are applied for this operation. The list of values describes alternative security schemes that can be used (that is, there is a logical OR between the security requirements). This definition overrides any declared top-level <a href="https://swagger.io/specification/v2/#swaggerSecurity"><code>security</code></a>. To remove a top-level security declaration, an empty array can be used.
   */
  security: Array<SecurityRequirementObject>;
}

/**
 * Allows referencing an external resource for extended documentation.
 */
export class ExternalDocumentationObject {
  /**
   * A short description of the target documentation. <a href="https://guides.github.com/features/mastering-markdown/#GitHub-flavored-markdown">GFM syntax</a> can be used for rich text representation.
   */
  description?: string;

  /**
   * The URL for the target documentation. Value MUST be in the format of a URL.
   */
  url: string;
}

/**
 * Describes a single operation parameter.
 */
export class ParameterObject {
  /**
   * The name of the parameter. Parameter names are <em>case sensitive</em>. <ul><li>If <a href="https://swagger.io/specification/v2/#parameterIn"><code>in</code></a> is <code>"path"</code>, the <code>name</code> field MUST correspond to the associated path segment from the <a href="https://swagger.io/specification/v2/#pathsPath">path</a> field in the <a href="https://swagger.io/specification/v2/#pathsObject">Paths Object</a>. See <a href="https://swagger.io/specification/v2/#pathTemplating">Path Templating</a> for further information.</li><li>For all other cases, the <code>name</code> corresponds to the parameter name used based on the <a href="https://swagger.io/specification/v2/#parameterIn"><code>in</code></a> property.</li></ul>
   */
  name: string;

  /**
   * The location of the parameter. Possible values are "query", "header", "path", "formData" or "body".
   */
  in: string;

  /**
   * A brief description of the parameter. This could contain examples of use.  <a href="https://guides.github.com/features/mastering-markdown/#GitHub-flavored-markdown">GFM syntax</a> can be used for rich text representation.
   */
  description: string;

  /**
   * Determines whether this parameter is mandatory. If the parameter is <a href="https://swagger.io/specification/v2/#parameterIn"><code>in</code></a> "path", this property is <strong>required</strong> and its value MUST be <code>true</code>. Otherwise, the property MAY be included and its default value is <code>false</code>.
   */
  required: boolean;

  /**
   * The schema defining the type used for the body parameter.
   */
  schema: SchemaObject;

  /**
   * The type of the parameter. Since the parameter is not located at the request body, it is limited to simple types (that is, not an object). The value MUST be one of <code>"string"</code>, <code>"number"</code>, <code>"integer"</code>, <code>"boolean"</code>, <code>"array"</code> or <code>"file"</code>. If <code>type</code> is <code>"file"</code>, the <a href="https://swagger.io/specification/v2/#operationConsumes"><code>consumes</code></a> MUST be either <code>"multipart/form-data"</code>, <code>" application/x-www-form-urlencoded"</code> or both and the parameter MUST be <a href="https://swagger.io/specification/v2/#parameterIn"><code>in</code></a> <code>"formData"</code>.
   */
  type: string;

  /**
   * The extending format for the previously mentioned <a href="https://swagger.io/specification/v2/#parameterType"><code>type</code></a>. See <a href="https://swagger.io/specification/v2/#dataTypeFormat">Data Type Formats</a> for further details.
   */
  format: string;

  /**
   * Sets the ability to pass empty-valued parameters. This is valid only for either <code>query</code> or <code>formData</code> parameters and allows you to send a parameter with a name only or  an empty value. Default value is <code>false</code>.
   */
  undefined: boolean;

  /**
   * <strong>Required if <a href="https://swagger.io/specification/v2/#parameterType"><code>type</code></a> is "array".</strong> Describes the type of items in the array.
   */
  items: ItemsObject;

  /**
   * Determines the format of the array if type array is used. Possible values are: <ul><li><code>csv</code> - comma separated values <code>foo,bar</code>. </li><li><code>ssv</code> - space separated values <code>foo bar</code>. </li><li><code>tsv</code> - tab separated values <code>foo\tbar</code>. </li><li><code>pipes</code> - pipe separated values <code>foo|bar</code>. </li><li><code>multi</code> - corresponds to multiple parameter instances instead of multiple values for a single instance <code>foo=bar&amp;foo=baz</code>. This is valid only for parameters <a href="https://swagger.io/specification/v2/#parameterIn"><code>in</code></a> "query" or "formData". </li></ul> Default value is <code>csv</code>.
   */
  collectionFormat: string;

  /**
   * Declares the value of the parameter that the server will use if none is provided, for example a "count" to control the number of results per page might default to 100 if not supplied by the client in the request. (Note: "default" has no meaning for required parameters.)  See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-6.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-6.2</a>. Unlike JSON Schema this value MUST conform to the defined <a href="https://swagger.io/specification/v2/#parameterType"><code>type</code></a> for this parameter.
   */
  default: undefined;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.2</a>.
   */
  maximum: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.2</a>.
   */
  exclusiveMaximum: boolean;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.3">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.3</a>.
   */
  minimum: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.3">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.3</a>.
   */
  exclusiveMinimum: boolean;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.1">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.1</a>.
   */
  maxLength: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.2</a>.
   */
  minLength: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.3">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.3</a>.
   */
  pattern: string;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.2</a>.
   */
  maxItems: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.3">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.3</a>.
   */
  minItems: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.4">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.4</a>.
   */
  uniqueItems: boolean;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.5.1">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.5.1</a>.
   */
  enum: undefined;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.1">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.1</a>.
   */
  multipleOf: number;
}

/**
 * A limited subset of JSON-Schema's items object. It is used by parameter definitions that are not located <a href="https://swagger.io/specification/v2/#parameterIn"><code>in</code></a> <code>"body"</code>.
 */
export class ItemsObject {
  /**
   * The internal type of the array. The value MUST be one of <code>"string"</code>, <code>"number"</code>, <code>"integer"</code>, <code>"boolean"</code>, or <code>"array"</code>. Files and models are not allowed.
   */
  type: string;

  /**
   * The extending format for the previously mentioned <a href="https://swagger.io/specification/v2/#parameterType"><code>type</code></a>. See <a href="https://swagger.io/specification/v2/#dataTypeFormat">Data Type Formats</a> for further details.
   */
  format: string;

  /**
   * <strong>Required if <a href="https://swagger.io/specification/v2/#itemsType"><code>type</code></a> is "array".</strong> Describes the type of items in the array.
   */
  items: ItemsObject;

  /**
   * Determines the format of the array if type array is used. Possible values are: <ul><li><code>csv</code> - comma separated values <code>foo,bar</code>. </li><li><code>ssv</code> - space separated values <code>foo bar</code>. </li><li><code>tsv</code> - tab separated values <code>foo\tbar</code>. </li><li><code>pipes</code> - pipe separated values <code>foo|bar</code>. </li></ul> Default value is <code>csv</code>.
   */
  collectionFormat: string;

  /**
   * Declares the value of the item that the server will use if none is provided. (Note: "default" has no meaning for required items.) See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-6.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-6.2</a>. Unlike JSON Schema this value MUST conform to the defined <a href="https://swagger.io/specification/v2/#itemsType"><code>type</code></a> for the data type.
   */
  default: undefined;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.2</a>.
   */
  maximum: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.2</a>.
   */
  exclusiveMaximum: boolean;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.3">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.3</a>.
   */
  minimum: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.3">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.3</a>.
   */
  exclusiveMinimum: boolean;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.1">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.1</a>.
   */
  maxLength: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.2</a>.
   */
  minLength: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.3">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.3</a>.
   */
  pattern: string;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.2</a>.
   */
  maxItems: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.3">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.3</a>.
   */
  minItems: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.4">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.4</a>.
   */
  uniqueItems: boolean;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.5.1">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.5.1</a>.
   */
  enum: undefined;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.1">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.1</a>.
   */
  multipleOf: number;
}

/**
 * A container for the expected responses of an operation. The container maps a HTTP response code to the expected response. It is not expected from the documentation to necessarily cover all possible HTTP response codes, since they may not be known in advance. However, it is expected from the documentation to cover a successful operation response and any known errors.
 */
export class ResponsesObject {
  /**
   * The documentation of responses other than the ones declared for specific HTTP response codes. It can be used to cover undeclared responses. <a href="https://swagger.io/specification/v2/#referenceObject">Reference Object</a> can be used to link to a response that is defined at the <a href="https://swagger.io/specification/v2/#swaggerResponses">Swagger Object's responses</a> section.
   */
  default?: ResponseObject;

  /**
   * Any <a href="https://swagger.io/specification/v2/#httpCodes">HTTP status code</a> can be used as the property name (one property per HTTP status code). Describes the expected response for that HTTP status code.  <a href="https://swagger.io/specification/v2/#referenceObject">Reference Object</a> can be used to link to a response that is defined at the <a href="https://swagger.io/specification/v2/#swaggerResponses">Swagger Object's responses</a> section.
   */
  [key: string]: ResponseObject;
}

/**
 * Describes a single response from an API Operation.
 */
export class ResponseObject {
  /**
   * A short description of the response. <a href="https://guides.github.com/features/mastering-markdown/#GitHub-flavored-markdown">GFM syntax</a> can be used for rich text representation.
   */
  description: string;

  /**
   * A definition of the response structure. It can be a primitive, an array or an object. If this field does not exist, it means no content is returned as part of the response. As an extension to the <a href="https://swagger.io/specification/v2/#schemaObject">Schema Object</a>, its root <code>type</code> value may also be <code>"file"</code>. This SHOULD be accompanied by a relevant <code>produces</code> mime-type.
   */
  schema: SchemaObject;

  /**
   * A list of headers that are sent with the response.
   */
  headers: HeadersObject;

  /**
   * An example of the response message.
   */
  examples: ExampleObject;
}

/**
 * Lists the headers that can be sent as part of a response.
 */
export class HeadersObject {
  /**
   * The name of the property corresponds to the name of the header. The value describes the type of the header.
   */
  [key: string]: HeaderObject;
}

/**
 * Allows sharing examples for operation responses.
 */
export class ExampleObject {
  /**
   * The name of the property MUST be one of the Operation <code>produces</code> values (either implicit or inherited). The value SHOULD be an example of what such a response would look like.
   */
  [key: string]: undefined;
}

/**
 * A simple header with of an integer type:
 */
export class HeaderObject {
  /**
   * A short description of the header.
   */
  description?: string;

  /**
   * The type of the object. The value MUST be one of <code>"string"</code>, <code>"number"</code>, <code>"integer"</code>, <code>"boolean"</code>, or <code>"array"</code>.
   */
  type: string;

  /**
   * The extending format for the previously mentioned <a href="https://swagger.io/specification/v2/#stType"><code>type</code></a>. See <a href="https://swagger.io/specification/v2/#dataTypeFormat">Data Type Formats</a> for further details.
   */
  format: string;

  /**
   * <strong>Required if <a href="https://swagger.io/specification/v2/#stType"><code>type</code></a> is "array".</strong> Describes the type of items in the array.
   */
  items: ItemsObject;

  /**
   * Determines the format of the array if type array is used. Possible values are: <ul><li><code>csv</code> - comma separated values <code>foo,bar</code>. </li><li><code>ssv</code> - space separated values <code>foo bar</code>. </li><li><code>tsv</code> - tab separated values <code>foo\tbar</code>. </li><li><code>pipes</code> - pipe separated values <code>foo|bar</code>. </li></ul> Default value is <code>csv</code>.
   */
  collectionFormat: string;

  /**
   * Declares the value of the header that the server will use if none is provided. (Note: "default" has no meaning for required headers.) See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-6.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-6.2</a>. Unlike JSON Schema this value MUST conform to the defined <a href="https://swagger.io/specification/v2/#headerDefault"><code>type</code></a> for the header.
   */
  default: undefined;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.2</a>.
   */
  maximum: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.2</a>.
   */
  exclusiveMaximum: boolean;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.3">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.3</a>.
   */
  minimum: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.3">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.3</a>.
   */
  exclusiveMinimum: boolean;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.1">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.1</a>.
   */
  maxLength: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.2</a>.
   */
  minLength: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.3">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.3</a>.
   */
  pattern: string;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.2">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.2</a>.
   */
  maxItems: number;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.3">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.3</a>.
   */
  minItems: number;

  /**
   * <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.4">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.3.4</a>.
   */
  uniqueItems: boolean;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.5.1">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.5.1</a>.
   */
  enum: undefined;

  /**
   * See <a href="https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.1">https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.1.1</a>.
   */
  multipleOf: number;
}

/**
 * Allows adding meta data to a single tag that is used by the <a href="https://swagger.io/specification/v2/#operationObject">Operation Object</a>. It is not mandatory to have a Tag Object per tag used there.
 */
export class TagObject {
  /**
   * The name of the tag.
   */
  name: string;

  /**
   * A short description for the tag. <a href="https://guides.github.com/features/mastering-markdown/#GitHub-flavored-markdown">GFM syntax</a> can be used for rich text representation.
   */
  description: string;

  /**
   * Additional external documentation for this tag.
   */
  externalDocs: ExternalDocumentationObject;
}

/**
 * A simple object to allow referencing other definitions in the specification. It can be used to reference parameters and responses that are defined at the top level for reuse.
 */
export class ReferenceObject {
  /**
   * The reference string.
   */
  $ref: string;
}

/**
 * The Schema Object allows the definition of input and output data types. These types can be objects, but also primitives and arrays. This object is based on the <a href="http://json-schema.org/">JSON Schema Specification Draft 4</a> and uses a predefined subset of it. On top of this subset, there are extensions provided by this specification to allow for more complete documentation.
 */
export class SchemaObject extends JsonSchema {
  /**
   * Adds support for polymorphism. The discriminator is the schema property name that is used to differentiate between other schema that inherit this schema. The property name used MUST be defined at this schema and it MUST be in the <code>required</code> property list. When used, the value MUST be the name of this schema or any schema that inherits it.
   */
  discriminator?: string;

  /**
   * Relevant only for Schema <code>"properties"</code> definitions. Declares the property as "read only". This means that it MAY be sent as part of a response but MUST NOT be sent as part of the request. Properties marked as <code>readOnly</code> being <code>true</code> SHOULD NOT be in the <code>required</code> list of the defined schema. Default value is <code>false</code>.
   */
  readOnly?: boolean;

  /**
   * This MAY be used only on properties schemas. It has no effect on root schemas. Adds Additional metadata to describe the XML representation format of this property.
   */
  xml?: XMLObject;

  /**
   * Additional external documentation for this schema.
   */
  externalDocs?: ExternalDocumentationObject;

  /**
   * A free-form property to include an example of an instance for this schema.
   */
  example?: undefined;
}

/**
 * A metadata object that allows for more fine-tuned XML model definitions.
 */
export class XMLObject {
  /**
   * Replaces the name of the element/attribute used for the described schema property. When defined within the Items Object (<code>items</code>), it will affect the name of the individual XML elements within the list. When defined alongside <code>type</code> being <code>array</code> (outside the <code>items</code>), it will affect the wrapping element and only if <code>wrapped</code> is <code>true</code>. If <code>wrapped</code> is <code>false</code>, it will be ignored.
   */
  name?: string;

  /**
   * The URL of the namespace definition. Value SHOULD be in the form of a URL.
   */
  namespace?: string;

  /**
   * The prefix to be used for the <a href="https://swagger.io/specification/v2/#xmlName">name</a>.
   */
  prefix?: string;

  /**
   * Declares whether the property definition translates to an attribute instead of an element. Default value is <code>false</code>.
   */
  attribute?: boolean;

  /**
   * MAY be used only for an array definition. Signifies whether the array is wrapped (for example, <code>&lt;books&gt;&lt;book/&gt;&lt;book/&gt;&lt;/books&gt;</code>) or unwrapped (<code>&lt;book/&gt;&lt;book/&gt;</code>). Default value is <code>false</code>. The definition takes effect only when defined alongside <code>type</code> being <code>array</code> (outside the <code>items</code>).
   */
  wrapped?: boolean;
}

/**
 * An object to hold data types that can be consumed and produced by operations. These data types can be primitives, arrays or models.
 */
export class DefinitionsObject {
  /**
   * A single definition, mapping a "name" to the schema it defines.
   */
  [key: string]: SchemaObject;
}

/**
 * An object to hold parameters to be reused across operations. Parameter definitions can be referenced to the ones defined here.
 */
export class ParametersDefinitionsObject {
  /**
   * A single parameter definition, mapping a "name" to the parameter it defines.
   */
  [key: string]: ParameterObject;
}

/**
 * An object to hold responses to be reused across operations. Response definitions can be referenced to the ones defined here.
 */
export class ResponsesDefinitionsObject {
  /**
   * A single response definition, mapping a "name" to the response it defines.
   */
  [key: string]: ResponseObject;
}

/**
 * A declaration of the security schemes available to be used in the specification. This does not enforce the security schemes on the operations and only serves to provide the relevant details for each scheme.
 */
export class SecurityDefinitionsObject {
  /**
   * A single security scheme definition, mapping a "name" to the scheme it defines.
   */
  [key: string]: SecuritySchemeObject;
}

/**
 * Allows the definition of a security scheme that can be used by the operations. Supported schemes are basic authentication, an API key (either as a header or as a query parameter) and OAuth2's common flows (implicit, password, application and access code).
 */
export class SecuritySchemeObject {
  /**
   * Any
   */
  type?: string;

  /**
   * Any
   */
  description?: string;

  /**
   * <code>apiKey</code>
   */
  name?: string;

  /**
   * <code>apiKey</code>
   */
  in?: string;

  /**
   * <code>oauth2</code>
   */
  flow?: string;

  /**
   * <code>oauth2</code> (<code>"implicit"</code>, <code>"accessCode"</code>)
   */
  authorizationUrl?: string;

  /**
   * <code>oauth2</code> (<code>"password"</code>, <code>"application"</code>, <code>"accessCode"</code>)
   */
  tokenUrl?: string;

  /**
   * <code>oauth2</code>
   */
  scopes?: ScopesObject;
}

/**
 * Lists the available scopes for an OAuth2 security scheme.
 */
export class ScopesObject {
  /**
   * Maps between a name of a scope to a short description of it (as the value of the property).
   */
  [key: string]: string;
}

/**
 * Lists the required security schemes to execute this operation. The object can have multiple security schemes declared in it which are all required (that is, there is a logical AND between the schemes).
 */
export class SecurityRequirementObject {
  /**
   * Each name must correspond to a security scheme which is declared in the <a href="https://swagger.io/specification/v2/#securityDefinitions">Security Definitions</a>. If the security scheme is of type <code>"oauth2"</code>, then the value is a list of scope names required for the execution. For other security scheme types, the array MUST be empty.
   */
  [key: string]: Array<string>;
}
