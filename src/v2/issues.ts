export enum IssueKind {
  Required = 'required',
  InvalidType = 'invalid_type',
  InvalidLiteral = 'invalid_literal',
  InvalidEnumValue = 'invalid_enum_value',
  InvalidThisType = 'invalid_this_type',
  InvalidArguments = 'invalid_arguments',
  InvalidReturnType = 'invalid_return_type',
  InvalidInstance = 'invalid_instance',
  MissingKeys = 'missing_keys',
  UnrecognizedKeys = 'unrecognized_keys',
  InvalidUnion = 'invalid_union',
  InvalidDiscriminator = 'invalid_discriminator',
  InvalidIntersection = 'invalid_intersection',
  InvalidString = 'invalid_string',
  InvalidNumber = 'invalid_number',
  InvalidBigInt = 'invalid_bigint',
  InvalidDate = 'invalid_date',
  InvalidArray = 'invalid_array',
  InvalidSet = 'invalid_set',
  InvalidTuple = 'invalid_tuple',
  InvalidRecord = 'invalid_record',
  InvalidBuffer = 'invalid_buffer',
  Forbidden = 'forbidden',
  Custom = 'custom',
}
