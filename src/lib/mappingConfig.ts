/**
 * Mapping config: loaded from config/mapping.json so it can be edited without touching code.
 * Edit src/config/mapping.json to change Jira <-> Xero column mapping and defaults.
 */

import mappingJson from "@/config/mapping.json";

export interface MappingField {
  xeroColumn: string;
  jiraSources: string[];
  type?: "date" | "amount" | "contact";
}

function mapField(raw: { xeroColumn: string; jiraSources: string[]; type?: string }): MappingField {
  const type = raw.type as MappingField["type"] | undefined;
  return {
    xeroColumn: raw.xeroColumn,
    jiraSources: Array.isArray(raw.jiraSources) ? raw.jiraSources : [],
    type: type === "date" || type === "amount" || type === "contact" ? type : undefined,
  };
}

const config = mappingJson as {
  requiredJiraColumns: string[];
  xeroHeader: string[];
  mappingFields: { xeroColumn: string; jiraSources: string[]; type?: string }[];
  jiraTemplateColumnOrder: string[];
  defaultTaxTypes: string[];
  defaultQuantityOptions: number[];
  defaultAccountCodes: string[];
};

export const REQUIRED_JIRA_COLUMNS: readonly string[] =
  config.requiredJiraColumns && config.requiredJiraColumns.length > 0
    ? config.requiredJiraColumns
    : ["Summary", "Issue key", "Created"];

export const XERO_BILL_HEADER: readonly string[] =
  config.xeroHeader && config.xeroHeader.length > 0
    ? config.xeroHeader
    : [
        "*ContactName",
        "EmailAddress",
        "POAddressLine1",
        "POAddressLine2",
        "POAddressLine3",
        "POAddressLine4",
        "POCity",
        "PORegion",
        "POPostalCode",
        "POCountry",
        "*InvoiceNumber",
        "*InvoiceDate",
        "*DueDate",
        "Total",
        "InventoryItemCode",
        "Description",
        "*Quantity",
        "*UnitAmount",
        "*AccountCode",
        "*TaxType",
        "TaxAmount",
        "TrackingName1",
        "TrackingOption1",
        "TrackingName2",
        "TrackingOption2",
        "Currency",
      ];

export const MAPPING_FIELDS: MappingField[] = Array.isArray(config.mappingFields)
  ? config.mappingFields.map(mapField)
  : [];

/** Jira column names we use (for template download). Unique, in sensible order from config. */
export function getJiraTemplateColumns(): string[] {
  const order = config.jiraTemplateColumnOrder || [];
  const set = new Set<string>();
  for (const f of MAPPING_FIELDS) {
    for (const col of f.jiraSources) if (col) set.add(col);
  }
  for (const col of REQUIRED_JIRA_COLUMNS) set.add(col);
  const ordered = order.filter((c: string) => set.has(c));
  const rest = Array.from(set).filter((c) => !order.includes(c)).sort();
  return [...ordered, ...rest];
}

export const DEFAULT_TAX_TYPES: readonly string[] =
  config.defaultTaxTypes?.length > 0
    ? config.defaultTaxTypes
    : ["None", "GST", "VAT", "OUTPUT", "INPUT", "Zero Rated", "Exempt"];

export const DEFAULT_QUANTITY_OPTIONS: readonly number[] =
  config.defaultQuantityOptions?.length > 0
    ? config.defaultQuantityOptions
    : [1, 2, 3, 4, 5, 10];

export const DEFAULT_ACCOUNT_CODES: readonly string[] =
  config.defaultAccountCodes?.length > 0
    ? config.defaultAccountCodes
    : ["", "200", "400", "310"];
