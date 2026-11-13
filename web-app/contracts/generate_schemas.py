"""
Generates standalone JSON Schemas from openapi.yaml components.
Resolves internal $ref references within components/schemas.
"""
import json
import os
import copy
import yaml

def resolve_refs(schema, all_schemas):
    """Recursively dereference $ref to components/schemas within local dict."""
    if isinstance(schema, dict):
        if "$ref" in schema:
            ref_path = schema["$ref"]
            if ref_path.startswith("#/components/schemas/"):
                ref_name = ref_path.split("/")[-1]
                target = copy.deepcopy(all_schemas[ref_name])
                return resolve_refs(target, all_schemas)
        return {k: resolve_refs(v, all_schemas) for k, v in schema.items()}
    elif isinstance(schema, list):
        return [resolve_refs(item, all_schemas) for item in schema]
    return schema

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    openapi_path = os.path.join(base_dir, "openapi.yaml")
    schemas_dir = os.path.join(base_dir, "schemas")
    os.makedirs(schemas_dir, exist_ok=True)

    with open(openapi_path, "r") as f:
        spec = yaml.safe_load(f)

    schemas = spec.get("components", {}).get("schemas", {})
    resolved_schemas = {}

    for name, schema_def in schemas.items():
        dereferenced = resolve_refs(copy.deepcopy(schema_def), schemas)
        # Ensure schema declares JSON Schema draft-07
        dereferenced["$schema"] = "http://json-schema.org/draft-07/schema#"
        dereferenced["title"] = name
        resolved_schemas[name] = dereferenced

        out_path = os.path.join(schemas_dir, f"{name}.json")
        with open(out_path, "w") as out_f:
            json.dump(dereferenced, out_f, indent=2)
        print(f"Generated {out_path}")

    # Also generate an index map for easy consumption by the gateway
    index_path = os.path.join(schemas_dir, "index.json")
    with open(index_path, "w") as out_f:
        json.dump(resolved_schemas, out_f, indent=2)
    print(f"Generated {index_path}")

if __name__ == "__main__":
    main()

