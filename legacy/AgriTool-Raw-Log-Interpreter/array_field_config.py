"""
Canonical Array Fields Configuration for AgriTool
Centralized definition of all array-type fields across the platform
"""

# Canonical array fields in subsidies_structured table
CANONICAL_ARRAY_FIELDS = [
    'amount',  # NUMERIC[]
    'region',  # TEXT[]
    'sector',  # TEXT[]
    'legal_entity_type',  # TEXT[]
    'objectives',  # TEXT[]
    'beneficiary_types',  # TEXT[]
    'investment_types',  # TEXT[]
    'rejection_conditions',  # TEXT[]
    'eligible_actions',  # TEXT[]
    'ineligible_actions',  # TEXT[]
    'requirements',  # TEXT[] (from application_requirements)
    'documents_required',  # TEXT[] (from documents)
    'scoring_criteria_list',  # TEXT[] (from scoring_criteria)
    'funding_tranches',  # TEXT[] (simplified from JSONB)
    'priority_groups_list',  # TEXT[] (from priority_groups)
]

# JSONB fields that contain arrays or need special handling
JSONB_ARRAY_FIELDS = [
    'priority_groups',  # JSONB but contains arrays
    'application_requirements',  # JSONB but contains arrays
    'questionnaire_steps',  # JSONB but contains arrays
    'documents',  # JSONB but contains arrays
    'geographic_scope',  # JSONB object
    'conditional_eligibility',  # JSONB object
    'funding_tranches',  # JSONB but contains arrays
    'co_financing_rates_by_category',  # JSONB object
    'scoring_criteria',  # JSONB but contains arrays
    'audit',  # JSONB object
]

# Fields that should always be treated as arrays even if single values
FORCE_ARRAY_FIELDS = CANONICAL_ARRAY_FIELDS

# Data type mapping for validation
ARRAY_FIELD_TYPES = {
    'amount': 'numeric',
    'region': 'text',
    'sector': 'text',
    'legal_entity_type': 'text',
    'objectives': 'text',
    'beneficiary_types': 'text',
    'investment_types': 'text',
    'rejection_conditions': 'text',
    'eligible_actions': 'text',
    'ineligible_actions': 'text',
    'requirements': 'text',
    'documents_required': 'text',
    'scoring_criteria_list': 'text',
    'funding_tranches': 'text',
    'priority_groups_list': 'text',
}

# Common problematic inputs and their expected outputs
ARRAY_COERCION_EXAMPLES = {
    'empty_inputs': {
        None: [],
        '': [],
        '[]': [],
        'null': [],
        'None': [],
        'undefined': [],
        '   ': [],
    },
    'json_arrays': {
        '["foo", "bar"]': ['foo', 'bar'],
        '[1, 2, 3]': [1, 2, 3],
        '["single"]': ['single'],
    },
    'python_style': {
        "['foo', 'bar']": ['foo', 'bar'],
        "[foo, bar]": ['foo', 'bar'],
        "['single']": ['single'],
    },
    'csv_strings': {
        'foo, bar': ['foo', 'bar'],
        'single': ['single'],
        'foo,bar,baz': ['foo', 'bar', 'baz'],
        'foo; bar; baz': ['foo', 'bar', 'baz'],
    },
    'edge_cases': {
        'foo, , bar': ['foo', 'bar'],  # empty elements filtered
        '  foo  ,  bar  ': ['foo', 'bar'],  # whitespace trimmed
        '123': ['123'],  # numbers as strings
        123: [123],  # actual numbers
        True: [True],  # booleans
    }
}

def get_array_fields():
    """Get list of all canonical array fields"""
    return CANONICAL_ARRAY_FIELDS.copy()

def get_jsonb_fields():
    """Get list of all JSONB fields that may contain arrays"""
    return JSONB_ARRAY_FIELDS.copy()

def is_array_field(field_name):
    """Check if a field should be treated as an array"""
    return field_name in CANONICAL_ARRAY_FIELDS

def get_field_type(field_name):
    """Get the expected data type for an array field"""
    return ARRAY_FIELD_TYPES.get(field_name, 'text')

def should_force_array(field_name):
    """Check if a field should always be coerced to an array"""
    return field_name in FORCE_ARRAY_FIELDS