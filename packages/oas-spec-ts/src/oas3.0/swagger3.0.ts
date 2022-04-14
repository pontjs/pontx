/**
 * This is the root document object of the <a href="https://swagger.io/specification/#oas-document">OpenAPI document</a>.
   */
export class OpenAPIObject {

	/**
	 * <strong>REQUIRED</strong>. This string MUST be the <a href="https://semver.org/spec/v2.0.0.html">semantic version number</a> of the <a href="https://swagger.io/specification/#versions">OpenAPI Specification version</a> that the OpenAPI document uses. The <code>openapi</code> field SHOULD be used by tooling specifications and clients to interpret the OpenAPI document. This is <em>not</em> related to the API <a href="https://swagger.io/specification/#info-version"><code>info.version</code></a> string.
   */
  openapi?: string;


	/**
	 * <strong>REQUIRED</strong>. Provides metadata about the API. The metadata MAY be used by tooling as required.
   */
  info?: InfoObject;


	/**
	 * An array of Server Objects, which provide connectivity information to a target server. If the <code>servers</code> property is not provided, or is an empty array, the default value would be a <a href="https://swagger.io/specification/#server-object">Server Object</a> with a <a href="https://swagger.io/specification/#server-url">url</a> value of <code>/</code>.
   */
  servers?: ServerObject;


	/**
	 * <strong>REQUIRED</strong>. The available paths and operations for the API.
   */
  paths?: PathsObject;


	/**
	 * An element to hold various schemas for the specification.
   */
  components?: ComponentsObject;


	/**
	 * A declaration of which security mechanisms can be used across the API. The list of values includes alternative security requirement objects that can be used. Only one of the security requirement objects need to be satisfied to authorize a request. Individual operations can override this definition. To make security optional, an empty security requirement (<code>{}</code>) can be included in the array.
   */
  security?: SecurityRequirementObject;


	/**
	 * A list of tags used by the specification with additional metadata. The order of the tags can be used to reflect on their order by the parsing tools. Not all tags that are used by the <a href="https://swagger.io/specification/#operation-object">Operation Object</a> must be declared. The tags that are not declared MAY be organized randomly or based on the tools' logic. Each tag name in the list MUST be unique.
   */
  tags?: TagObject;


	/**
	 * Additional external documentation.
   */
  externalDocs?: ExternalDocumentationObject;

}

/**
 * The object provides metadata about the API.
 * The metadata MAY be used by the clients if needed, and MAY be presented in editing or documentation generation tools for convenience.
   */
export class InfoObject {

	/**
	 * <strong>REQUIRED</strong>. The title of the API.
   */
  title?: string;


	/**
	 * A short description of the API. <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;


	/**
	 * A URL to the Terms of Service for the API. MUST be in the format of a URL.
   */
  termsOfService?: string;


	/**
	 * The contact information for the exposed API.
   */
  contact?: ContactObject;


	/**
	 * The license information for the exposed API.
   */
  license?: LicenseObject;


	/**
	 * <strong>REQUIRED</strong>. The version of the OpenAPI document (which is distinct from the <a href="https://swagger.io/specification/#oas-version">OpenAPI Specification version</a> or the API implementation version).
   */
  version?: string;

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
	 * <strong>REQUIRED</strong>. The license name used for the API.
   */
  name?: string;


	/**
	 * A URL to the license used for the API. MUST be in the format of a URL.
   */
  url?: string;

}

/**
 * An object representing a Server.
   */
export class ServerObject {

	/**
	 * <strong>REQUIRED</strong>. A URL to the target host.  This URL supports Server Variables and MAY be relative, to indicate that the host location is relative to the location where the OpenAPI document is being served. Variable substitutions will be made when a variable is named in <code>{</code>brackets<code>}</code>.
   */
  url?: string;


	/**
	 * An optional string describing the host designated by the URL. <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;


	/**
	 * A map between a variable name and its value.  The value is used for substitution in the server's URL template.
   */
  variables?: string;

}

/**
 * An object representing a Server Variable for server URL template substitution.
   */
export class ServerVariableObject {

	/**
	 * An enumeration of string values to be used if the substitution options are from a limited set. The array SHOULD NOT be empty.
   */
  enum?: string;


	/**
	 * <strong>REQUIRED</strong>. The default value to use for substitution, which SHALL be sent if an alternate value is <em>not</em> supplied. Note this behavior is different than the <a href="https://swagger.io/specification/#schema-object">Schema Object's</a> treatment of default values, because in those cases parameter values are optional. If the <a href="https://swagger.io/specification/#server-variable-enum"><code>enum</code></a> is defined, the value SHOULD exist in the enum's values.
   */
  default?: string;


	/**
	 * An optional description for the server variable. <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;

}

/**
 * Holds a set of reusable objects for different aspects of the OAS.
 * All objects defined within the components object will have no effect on the API unless they are explicitly referenced from properties outside the components object.
   */
export class ComponentsObject {

	/**
	 * An object to hold reusable <a href="https://swagger.io/specification/#schema-object">Schema Objects</a>.
   */
   schemas?: string;


	/**
	 * An object to hold reusable <a href="https://swagger.io/specification/#response-object">Response Objects</a>.
   */
   responses?: string;


	/**
	 * An object to hold reusable <a href="https://swagger.io/specification/#parameter-object">Parameter Objects</a>.
   */
   parameters?: string;


	/**
	 * An object to hold reusable <a href="https://swagger.io/specification/#example-object">Example Objects</a>.
   */
   examples?: string;


	/**
	 * An object to hold reusable <a href="https://swagger.io/specification/#request-body-object">Request Body Objects</a>.
   */
   requestBodies?: string;


	/**
	 * An object to hold reusable <a href="https://swagger.io/specification/#header-object">Header Objects</a>.
   */
   headers?: string;


	/**
	 * An object to hold reusable <a href="https://swagger.io/specification/#security-scheme-object">Security Scheme Objects</a>.
   */
   securitySchemes?: string;


	/**
	 * An object to hold reusable <a href="https://swagger.io/specification/#link-object">Link Objects</a>.
   */
   links?: string;


	/**
	 * An object to hold reusable <a href="https://swagger.io/specification/#callback-object">Callback Objects</a>.
   */
   callbacks?: string;

}

/**
 * Holds the relative paths to the individual endpoints and their operations.
 * The path is appended to the URL from the <a href="https://swagger.io/specification/#server-object"><code>Server Object</code></a> in order to construct the full URL.  The Paths MAY be empty, due to <a href="https://swagger.io/specification/#security-filtering">ACL constraints</a>.
   */
export class PathsObject {

	/**
	 * A relative path to an individual endpoint. The field name MUST begin with a forward slash (<code>/</code>). The path is <strong>appended</strong> (no relative URL resolution) to the expanded URL from the <a href="https://swagger.io/specification/#server-object"><code>Server Object</code></a>'s <code>url</code> field in order to construct the full URL. <a href="https://swagger.io/specification/#path-templating">Path templating</a> is allowed. When matching URLs, concrete (non-templated) paths would be matched before their templated counterparts. Templated paths with the same hierarchy but different templated names MUST NOT exist as they are identical. In case of ambiguous matching, it's up to the tooling to decide which one to use.
   */
  [key: string]: PathItemObject;

}

/**
 * Describes the operations available on a single path.
 * A Path Item MAY be empty, due to <a href="https://swagger.io/specification/#security-filtering">ACL constraints</a>.
 * The path itself is still exposed to the documentation viewer but they will not know which operations and parameters are available.
   */
export class PathItemObject {

	/**
	 * Allows for an external definition of this path item. The referenced structure MUST be in the format of a <a href="https://swagger.io/specification/#path-item-object">Path Item Object</a>.  In case a Path Item Object field appears both in the defined object and the referenced object, the behavior is undefined.
   */
  $ref?: string;


	/**
	 * An optional, string summary, intended to apply to all operations in this path.
   */
  summary?: string;


	/**
	 * An optional, string description, intended to apply to all operations in this path. <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;


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
	 * A definition of a TRACE operation on this path.
   */
  trace?: OperationObject;


	/**
	 * An alternative <code>server</code> array to service all operations in this path.
   */
  servers?: ServerObject;


	/**
	 * A list of parameters that are applicable for all the operations described under this path. These parameters can be overridden at the operation level, but cannot be removed there. The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a <a href="https://swagger.io/specification/#parameter-name">name</a> and <a href="https://swagger.io/specification/#parameter-in">location</a>. The list can use the <a href="https://swagger.io/specification/#reference-object">Reference Object</a> to link to parameters that are defined at the <a href="https://swagger.io/specification/#components-parameters">OpenAPI Object's components/parameters</a>.
   */
  parameters?: ParameterObject;

}

/**
 * Describes a single API operation on a path.
   */
export class OperationObject {

	/**
	 * A list of tags for API documentation control. Tags can be used for logical grouping of operations by resources or any other qualifier.
   */
  tags?: string;


	/**
	 * A short summary of what the operation does.
   */
  summary?: string;


	/**
	 * A verbose explanation of the operation behavior. <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;


	/**
	 * Additional external documentation for this operation.
   */
  externalDocs?: ExternalDocumentationObject;


	/**
	 * Unique string used to identify the operation. The id MUST be unique among all operations described in the API. The operationId value is <strong>case-sensitive</strong>. Tools and libraries MAY use the operationId to uniquely identify an operation, therefore, it is RECOMMENDED to follow common programming naming conventions.
   */
  operationId?: string;


	/**
	 * A list of parameters that are applicable for this operation. If a parameter is already defined at the <a href="https://swagger.io/specification/#path-item-parameters">Path Item</a>, the new definition will override it but can never remove it. The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a <a href="https://swagger.io/specification/#parameter-name">name</a> and <a href="https://swagger.io/specification/#parameter-in">location</a>. The list can use the <a href="https://swagger.io/specification/#reference-object">Reference Object</a> to link to parameters that are defined at the <a href="https://swagger.io/specification/#components-parameters">OpenAPI Object's components/parameters</a>.
   */
  parameters?: ParameterObject;


	/**
	 * The request body applicable for this operation.  The <code>requestBody</code> is only supported in HTTP methods where the HTTP 1.1 specification <a href="https://tools.ietf.org/html/rfc7231#section-4.3.1">RFC7231</a> has explicitly defined semantics for request bodies.  In other cases where the HTTP spec is vague, <code>requestBody</code> SHALL be ignored by consumers.
   */
  requestBody?: RequestBodyObject;


	/**
	 * <strong>REQUIRED</strong>. The list of possible responses as they are returned from executing this operation.
   */
  responses?: ResponsesObject;


	/**
	 * A map of possible out-of band callbacks related to the parent operation. The key is a unique identifier for the Callback Object. Each value in the map is a <a href="https://swagger.io/specification/#callback-object">Callback Object</a> that describes a request that may be initiated by the API provider and the expected responses.
   */
  callbacks?: string;


	/**
	 * Declares this operation to be deprecated. Consumers SHOULD refrain from usage of the declared operation. Default value is <code>false</code>.
   */
  deprecated?: boolean;


	/**
	 * A declaration of which security mechanisms can be used for this operation. The list of values includes alternative security requirement objects that can be used. Only one of the security requirement objects need to be satisfied to authorize a request. To make security optional, an empty security requirement (<code>{}</code>) can be included in the array. This definition overrides any declared top-level <a href="https://swagger.io/specification/#oas-security"><code>security</code></a>. To remove a top-level security declaration, an empty array can be used.
   */
  security?: SecurityRequirementObject;


	/**
	 * An alternative <code>server</code> array to service this operation. If an alternative <code>server</code> object is specified at the Path Item Object or Root level, it will be overridden by this value.
   */
  servers?: ServerObject;

}

/**
 * Allows referencing an external resource for extended documentation.
   */
export class ExternalDocumentationObject {

	/**
	 * A short description of the target documentation. <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;


	/**
	 * <strong>REQUIRED</strong>. The URL for the target documentation. Value MUST be in the format of a URL.
   */
  url?: string;

}

/**
 * Describes a single operation parameter.
   */
export class ParameterObject {

	/**
	 * <strong>REQUIRED</strong>. The name of the parameter. Parameter names are <em>case sensitive</em>. <ul><li>If <a href="https://swagger.io/specification/#parameter-in"><code>in</code></a> is <code>"path"</code>, the <code>name</code> field MUST correspond to a template expression occurring within the <a href="https://swagger.io/specification/#paths-path">path</a> field in the <a href="https://swagger.io/specification/#paths-object">Paths Object</a>. See <a href="https://swagger.io/specification/#path-templating">Path Templating</a> for further information.</li><li>If <a href="https://swagger.io/specification/#parameter-in"><code>in</code></a> is <code>"header"</code> and the <code>name</code> field is <code>"Accept"</code>, <code>"Content-Type"</code> or <code>"Authorization"</code>, the parameter definition SHALL be ignored.</li><li>For all other cases, the <code>name</code> corresponds to the parameter name used by the <a href="https://swagger.io/specification/#parameter-in"><code>in</code></a> property.</li></ul>
   */
  name?: string;


	/**
	 * <strong>REQUIRED</strong>. The location of the parameter. Possible values are <code>"query"</code>, <code>"header"</code>, <code>"path"</code> or <code>"cookie"</code>.
   */
  in?: string;


	/**
	 * A brief description of the parameter. This could contain examples of use. <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;


	/**
	 * Determines whether this parameter is mandatory. If the <a href="https://swagger.io/specification/#parameter-in">parameter location</a> is <code>"path"</code>, this property is <strong>REQUIRED</strong> and its value MUST be <code>true</code>. Otherwise, the property MAY be included and its default value is <code>false</code>.
   */
  required?: boolean;


	/**
	 * Specifies that a parameter is deprecated and SHOULD be transitioned out of usage. Default value is <code>false</code>.
   */
   deprecated?: boolean;


	/**
	 * Sets the ability to pass empty-valued parameters. This is valid only for <code>query</code> parameters and allows sending a parameter with an empty value. Default value is <code>false</code>. If <a href="https://swagger.io/specification/#parameter-style"><code>style</code></a> is used, and if behavior is <code>n/a</code> (cannot be serialized), the value of <code>allowEmptyValue</code> SHALL be ignored. Use of this property is NOT RECOMMENDED, as it is likely to be removed in a later revision.
   */
   allowEmptyValue?: boolean;

}

/**
 * Describes a single request body.
   */
export class RequestBodyObject {

	/**
	 * A brief description of the request body. This could contain examples of use.  <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;


	/**
	 * <strong>REQUIRED</strong>. The content of the request body. The key is a media type or <a href="https://tools.ietf.org/html/rfc7231#appendix--d">media type range</a> and the value describes it.  For requests that match multiple keys, only the most specific key is applicable. e.g. text/plain overrides text/*
   */
  content?: string;


	/**
	 * Determines if the request body is required in the request. Defaults to <code>false</code>.
   */
  required?: boolean;

}

/**
 * Each Media Type Object provides schema and examples for the media type identified by its key.
   */
export class MediaTypeObject {

	/**
	 * The schema defining the content of the request, response, or parameter.
   */
  schema?: SchemaObject;


	/**
	 * Example of the media type.  The example object SHOULD be in the correct format as specified by the media type.  The <code>example</code> field is mutually exclusive of the <code>examples</code> field.  Furthermore, if referencing a <code>schema</code> which contains an example, the <code>example</code> value SHALL <em>override</em> the example provided by the schema.
   */
  example?: undefined;


	/**
	 * Examples of the media type.  Each example object SHOULD  match the media type and specified schema if present.  The <code>examples</code> field is mutually exclusive of the <code>example</code> field.  Furthermore, if referencing a <code>schema</code> which contains an example, the <code>examples</code> value SHALL <em>override</em> the example provided by the schema.
   */
  examples?: string;


	/**
	 * A map between a property name and its encoding information. The key, being the property name, MUST exist in the schema as a property. The encoding object SHALL only apply to <code>requestBody</code> objects when the media type is <code>multipart</code> or <code>application/x-www-form-urlencoded</code>.
   */
  encoding?: string;

}

/**
 * A single encoding definition applied to a single schema property.
   */
export class EncodingObject {

	/**
	 * The Content-Type for encoding a specific property. Default value depends on the property type: for <code>string</code> with <code>format</code> being <code>binary</code> – <code>application/octet-stream</code>; for other primitive types – <code>text/plain</code>; for <code>object</code> - <code>application/json</code>; for <code>array</code> – the default is defined based on the inner type. The value can be a specific media type (e.g. <code>application/json</code>), a wildcard media type (e.g. <code>image/*</code>), or a comma-separated list of the two types.
   */
  contentType?: string;


	/**
	 * A map allowing additional information to be provided as headers, for example <code>Content-Disposition</code>.  <code>Content-Type</code> is described separately and SHALL be ignored in this section. This property SHALL be ignored if the request body media type is not a <code>multipart</code>.
   */
  headers?: string;


	/**
	 * Describes how a specific property value will be serialized depending on its type.  See <a href="https://swagger.io/specification/#parameter-object">Parameter Object</a> for details on the <a href="https://swagger.io/specification/#parameter-style"><code>style</code></a> property. The behavior follows the same values as <code>query</code> parameters, including default values. This property SHALL be ignored if the request body media type is not <code>application/x-www-form-urlencoded</code>.
   */
  style?: string;


	/**
	 * When this is true, property values of type <code>array</code> or <code>object</code> generate separate parameters for each value of the array, or key-value-pair of the map.  For other types of properties this property has no effect. When <a href="https://swagger.io/specification/#encoding-style"><code>style</code></a> is <code>form</code>, the default value is <code>true</code>. For all other styles, the default value is <code>false</code>. This property SHALL be ignored if the request body media type is not <code>application/x-www-form-urlencoded</code>.
   */
  explode?: boolean;


	/**
	 * Determines whether the parameter value SHOULD allow reserved characters, as defined by <a href="https://tools.ietf.org/html/rfc3986#section-2.2">RFC3986</a> <code>:/?#[]@!$&amp;'()*+,;=</code> to be included without percent-encoding. The default value is <code>false</code>. This property SHALL be ignored if the request body media type is not <code>application/x-www-form-urlencoded</code>.
   */
  allowReserved?: boolean;

}

/**
 * A container for the expected responses of an operation.
 * The container maps a HTTP response code to the expected response.
   */
export class ResponsesObject {

	/**
	 * The documentation of responses other than the ones declared for specific HTTP response codes. Use this field to cover undeclared responses. A <a href="https://swagger.io/specification/#reference-object">Reference Object</a> can link to a response that the <a href="https://swagger.io/specification/#components-responses">OpenAPI Object's components/responses</a> section defines.
   */
  default?: ResponseObject;

}

/**
 * Describes a single response from an API Operation, including design-time, static
 * <code>links</code> to operations based on the response.
   */
export class ResponseObject {

	/**
	 * <strong>REQUIRED</strong>. A short description of the response. <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;


	/**
	 * Maps a header name to its definition. <a href="https://tools.ietf.org/html/rfc7230#page-22">RFC7230</a> states header names are case insensitive. If a response header is defined with the name <code>"Content-Type"</code>, it SHALL be ignored.
   */
  headers?: string;


	/**
	 * A map containing descriptions of potential response payloads. The key is a media type or <a href="https://tools.ietf.org/html/rfc7231#appendix--d">media type range</a> and the value describes it.  For responses that match multiple keys, only the most specific key is applicable. e.g. text/plain overrides text/*
   */
  content?: string;


	/**
	 * A map of operations links that can be followed from the response. The key of the map is a short name for the link, following the naming constraints of the names for <a href="https://swagger.io/specification/#components-object">Component Objects</a>.
   */
  links?: string;

}

/**
 * A map of possible out-of band callbacks related to the parent operation.
 * Each value in the map is a <a href="https://swagger.io/specification/#path-item-object">Path Item Object</a> that describes a set of requests that may be initiated by the API provider and the expected responses.
 * The key value used to identify the path item object is an expression, evaluated at runtime, that identifies a URL to use for the callback operation.
   */
export class CallbackObject {

	/**
	 * A Path Item Object used to define a callback request and expected responses.  A <a href="examples/v3.0/callback-example.yaml">complete example</a> is available.
   */
  [key: string]: PathItemObject;

}

/**
 * This object MAY be extended with <a href="https://swagger.io/specification/#specification-extensions">Specification Extensions</a>.
   */
export class ExampleObject {

	/**
	 * Short description for the example.
   */
  summary?: string;


	/**
	 * Long description for the example. <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;


	/**
	 * Embedded literal example. The <code>value</code> field and <code>externalValue</code> field are mutually exclusive. To represent examples of media types that cannot naturally represented in JSON or YAML, use a string value to contain the example, escaping where necessary.
   */
  value?: undefined;


	/**
	 * A URL that points to the literal example. This provides the capability to reference examples that cannot easily be included in JSON or YAML documents.  The <code>value</code> field and <code>externalValue</code> field are mutually exclusive.
   */
  externalValue?: string;

}

/**
 * The <code>Link object</code> represents a possible design-time link for a response.
 * The presence of a link does not guarantee the caller's ability to successfully invoke it, rather it provides a known relationship and traversal mechanism between responses and other operations.
   */
export class LinkObject {

	/**
	 * A relative or absolute URI reference to an OAS operation. This field is mutually exclusive of the <code>operationId</code> field, and MUST point to an <a href="https://swagger.io/specification/#operation-object">Operation Object</a>. Relative <code>operationRef</code> values MAY be used to locate an existing <a href="https://swagger.io/specification/#operation-object">Operation Object</a> in the OpenAPI definition.
   */
  operationRef?: string;


	/**
	 * The name of an <em>existing</em>, resolvable OAS operation, as defined with a unique <code>operationId</code>.  This field is mutually exclusive of the <code>operationRef</code> field.
   */
  operationId?: string;


	/**
	 * A map representing parameters to pass to an operation as specified with <code>operationId</code> or identified via <code>operationRef</code>. The key is the parameter name to be used, whereas the value can be a constant or an expression to be evaluated and passed to the linked operation.  The parameter name can be qualified using the <a href="https://swagger.io/specification/#parameter-in">parameter location</a> <code>[{in}.]{name}</code> for operations that use the same parameter name in different locations (e.g. path.id).
   */
  parameters?: string;


	/**
	 * A literal value or <a href="https://swagger.io/specification/#runtime-expression">{expression}</a> to use as a request body when calling the target operation.
   */
  requestBody?: {expression};


	/**
	 * A description of the link. <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;


	/**
	 * A server object to be used by the target operation.
   */
  server?: ServerObject;

}

/**
 * The Header Object follows the structure of the <a href="https://swagger.io/specification/#parameter-object">Parameter Object</a> with the following changes:
   */
export class HeaderObject {

	/**
	 * <strong>REQUIRED</strong>. The name of the tag.
   */
  name?: string;


	/**
	 * A short description for the tag. <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;


	/**
	 * Additional external documentation for this tag.
   */
  externalDocs?: ExternalDocumentationObject;

}

/**
 * Adds metadata to a single tag that is used by the <a href="https://swagger.io/specification/#operation-object">Operation Object</a>.
 * It is not mandatory to have a Tag Object per tag defined in the Operation Object instances.
   */
export class TagObject {

	/**
	 * <strong>REQUIRED</strong>. The name of the tag.
   */
  name?: string;


	/**
	 * A short description for the tag. <a href="https://spec.commonmark.org/">CommonMark syntax</a> MAY be used for rich text representation.
   */
  description?: string;


	/**
	 * Additional external documentation for this tag.
   */
  externalDocs?: ExternalDocumentationObject;

}

/**
 * A simple object to allow referencing other components in the specification, internally and externally.
   */
export class ReferenceObject {

	/**
	 * <strong>REQUIRED</strong>. The reference string.
   */
  $ref?: string;

}

/**
 * The Schema Object allows the definition of input and output data types.
 * These types can be objects, but also primitives and arrays.
 * This object is an extended subset of the <a href="https://json-schema.org/">JSON Schema Specification Wright Draft 00</a>.
   */
export class SchemaObject {

	/**
	 * A <code>true</code> value adds <code>"null"</code> to the allowed type specified by the <code>type</code> keyword, only if <code>type</code> is explicitly defined within the same Schema Object. Other Schema Object constraints retain their defined behavior, and therefore may disallow the use of <code>null</code> as a value. A <code>false</code> value leaves the specified or default <code>type</code> unmodified. The default value is <code>false</code>.
   */
  nullable?: boolean;


	/**
	 * Adds support for polymorphism. The discriminator is an object name that is used to differentiate between other schemas which may satisfy the payload description. See <a href="https://swagger.io/specification/#schema-composition">Composition and Inheritance</a> for more details.
   */
  discriminator?: DiscriminatorObject;


	/**
	 * Relevant only for Schema <code>"properties"</code> definitions. Declares the property as "read only". This means that it MAY be sent as part of a response but SHOULD NOT be sent as part of the request. If the property is marked as <code>readOnly</code> being <code>true</code> and is in the <code>required</code> list, the <code>required</code> will take effect on the response only. A property MUST NOT be marked as both <code>readOnly</code> and <code>writeOnly</code> being <code>true</code>. Default value is <code>false</code>.
   */
  readOnly?: boolean;


	/**
	 * Relevant only for Schema <code>"properties"</code> definitions. Declares the property as "write only". Therefore, it MAY be sent as part of a request but SHOULD NOT be sent as part of the response. If the property is marked as <code>writeOnly</code> being <code>true</code> and is in the <code>required</code> list, the <code>required</code> will take effect on the request only. A property MUST NOT be marked as both <code>readOnly</code> and <code>writeOnly</code> being <code>true</code>. Default value is <code>false</code>.
   */
  writeOnly?: boolean;


	/**
	 * This MAY be used only on properties schemas. It has no effect on root schemas. Adds additional metadata to describe the XML representation of this property.
   */
  xml?: XMLObject;


	/**
	 * Additional external documentation for this schema.
   */
  externalDocs?: ExternalDocumentationObject;


	/**
	 * A free-form property to include an example of an instance for this schema. To represent examples that cannot be naturally represented in JSON or YAML, a string value can be used to contain the example with escaping where necessary.
   */
  example?: undefined;


	/**
	 * Specifies that a schema is deprecated and SHOULD be transitioned out of usage. Default value is <code>false</code>.
   */
   deprecated?: boolean;

}

/**
 * When request bodies or response payloads may be one of a number of different schemas, a <code>discriminator</code> object can be used to aid in serialization, deserialization, and validation.  The discriminator is a specific object in a schema which is used to inform the consumer of the specification of an alternative schema based on the value associated with it.
   */
export class DiscriminatorObject {

	/**
	 * <strong>REQUIRED</strong>. The name of the property in the payload that will hold the discriminator value.
   */
  propertyName?: string;


	/**
	 * An object to hold mappings between payload values and schema names or references.
   */
   mapping?: string;

}

/**
 * A metadata object that allows for more fine-tuned XML model definitions.
   */
export class XMLObject {

	/**
	 * Replaces the name of the element/attribute used for the described schema property. When defined within <code>items</code>, it will affect the name of the individual XML elements within the list. When defined alongside <code>type</code> being <code>array</code> (outside the <code>items</code>), it will affect the wrapping element and only if <code>wrapped</code> is <code>true</code>. If <code>wrapped</code> is <code>false</code>, it will be ignored.
   */
  name?: string;


	/**
	 * The URI of the namespace definition. Value MUST be in the form of an absolute URI.
   */
  namespace?: string;


	/**
	 * The prefix to be used for the <a href="https://swagger.io/specification/#xml-name">name</a>.
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
 * Defines a security scheme that can be used by the operations.
 * Supported schemes are HTTP authentication, an API key (either as a header, a cookie parameter or as a query parameter), OAuth2's common flows (implicit, password, client credentials and authorization code) as defined in <a href="https://tools.ietf.org/html/rfc6749">RFC6749</a>, and <a href="https://tools.ietf.org/html/draft-ietf-oauth-discovery-06">OpenID Connect Discovery</a>.
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
	 * <code>http</code>
   */
  scheme?: string;


	/**
	 * <code>http</code> (<code>"bearer"</code>)
   */
  bearerFormat?: string;


	/**
	 * <code>oauth2</code>
   */
  flows?: OAuthFlowsObject;


	/**
	 * <code>openIdConnect</code>
   */
  openIdConnectUrl?: string;

}

/**
 * Allows configuration of the supported OAuth Flows.
   */
export class OAuthFlowsObject {

	/**
	 * Configuration for the OAuth Implicit flow
   */
  implicit?: OAuthFlowObject;


	/**
	 * Configuration for the OAuth Resource Owner Password flow
   */
  password?: OAuthFlowObject;


	/**
	 * Configuration for the OAuth Client Credentials flow.  Previously called <code>application</code> in OpenAPI 2.0.
   */
  clientCredentials?: OAuthFlowObject;


	/**
	 * Configuration for the OAuth Authorization Code flow.  Previously called <code>accessCode</code> in OpenAPI 2.0.
   */
  authorizationCode?: OAuthFlowObject;

}

/**
 * Configuration details for a supported OAuth Flow
   */
export class OAuthFlowObject {

	/**
	 * <code>oauth2</code> (<code>"implicit"</code>, <code>"authorizationCode"</code>)
   */
  authorizationUrl?: string;


	/**
	 * <code>oauth2</code> (<code>"password"</code>, <code>"clientCredentials"</code>, <code>"authorizationCode"</code>)
   */
  tokenUrl?: string;


	/**
	 * <code>oauth2</code>
   */
  refreshUrl?: string;


	/**
	 * <code>oauth2</code>
   */
  scopes?: string;

}

/**
 * Lists the required security schemes to execute this operation.
 * The name used for each property MUST correspond to a security scheme declared in the <a href="https://swagger.io/specification/#components-security-schemes">Security Schemes</a> under the <a href="https://swagger.io/specification/#components-object">Components Object</a>.
   */
export class SecurityRequirementObject {

	/**
	 * Each name MUST correspond to a security scheme which is declared in the <a href="https://swagger.io/specification/#components-security-schemes">Security Schemes</a> under the <a href="https://swagger.io/specification/#components-object">Components Object</a>. If the security scheme is of type <code>"oauth2"</code> or <code>"openIdConnect"</code>, then the value is a list of scope names required for the execution, and the list MAY be empty if authorization does not require a specified scope. For other security scheme types, the array MUST be empty.
   */
  [key: string]: string;

}