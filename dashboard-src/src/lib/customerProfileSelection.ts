export type SalesCustomerTypeMapping = {
  customer_type_key: string;
  customer_type_name_ar: string;
  sort_order: number | null;
};

export type SalesCustomerSpecialityMapping = {
  customer_type_key: string;
  speciality_key: string;
  speciality_name_ar: string;
  sort_order: number | null;
};

export type SalesBrandMapping = {
  brand_key: string;
  brand_name_ar: string;
  sort_order: number | null;
};

export type SalesProductCategoryMapping = {
  category_key: string;
  category_name_ar: string;
  subcategory_key: string;
  subcategory_name_ar: string;
  sort_order: number | null;
};

export type SalesProductCustomerMapping = {
  external_product_id: string;
  product_name: string;
  brand_key: string;
  brand_name_ar: string;
  category_key: string;
  category_name_ar: string;
  subcategory_key: string;
  subcategory_name_ar: string;
  customer_specialities: string[] | null;
  customer_types: string[] | null;
};

export type CustomerProfileSelection = {
  customerTypeKey: string;
  customerTypeName?: string;
  specialityKey: string;
  specialityName?: string;
  brandKey: string;
  categoryKey: string;
  subcategoryKey: string;
  productExternalId: string;
};

export type SelectedCustomerProfile = {
  customer_type_key: string;
  customer_type_name_ar: string;
  speciality_key: string;
  speciality_name_ar: string;
  brand_key: string;
  brand_name_ar: string;
  category_key: string;
  category_name_ar: string;
  subcategory_key: string;
  subcategory_name_ar: string;
  product_external_id: string;
  product_name: string;
  matched_product_count?: number;
  in_stock_product_count?: number;
  total_quantity_on_hand?: number;
  low_stock_product_names?: string[];
};

function sortByOrderThenName<T extends { sort_order: number | null }>(
  rows: T[],
  getName: (row: T) => string,
) {
  return [...rows].sort((left, right) => {
    const orderDiff = (left.sort_order ?? 0) - (right.sort_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return getName(left).localeCompare(getName(right), "ar");
  });
}

function includesValue(values: string[] | null | undefined, value: string) {
  return Array.isArray(values) && values.includes(value);
}

function includesAnyValue(values: string[] | null | undefined, candidates: Array<string | undefined>) {
  return candidates.some((candidate) => Boolean(candidate) && includesValue(values, candidate as string));
}

export function getSpecialitiesForCustomerType(
  specialities: SalesCustomerSpecialityMapping[],
  customerTypeKey: string,
) {
  if (!customerTypeKey) return [];
  return sortByOrderThenName(
    specialities.filter((speciality) => speciality.customer_type_key === customerTypeKey),
    (speciality) => speciality.speciality_name_ar,
  );
}

export function filterProductMappings(
  products: SalesProductCustomerMapping[],
  selection: Pick<
    CustomerProfileSelection,
    | "customerTypeKey"
    | "customerTypeName"
    | "specialityKey"
    | "specialityName"
    | "brandKey"
    | "categoryKey"
    | "subcategoryKey"
  >,
) {
  return products.filter((product) => {
    if (
      (selection.customerTypeKey || selection.customerTypeName) &&
      !includesAnyValue(product.customer_types, [selection.customerTypeName, selection.customerTypeKey])
    ) {
      return false;
    }
    if (
      (selection.specialityKey || selection.specialityName) &&
      !includesAnyValue(product.customer_specialities, [selection.specialityName, selection.specialityKey])
    ) {
      return false;
    }
    if (selection.brandKey && product.brand_key !== selection.brandKey) return false;
    if (selection.categoryKey && product.category_key !== selection.categoryKey) return false;
    if (selection.subcategoryKey && product.subcategory_key !== selection.subcategoryKey) return false;
    return true;
  });
}

export function buildSelectedCustomerProfile(input: {
  customerTypes: SalesCustomerTypeMapping[];
  specialities: SalesCustomerSpecialityMapping[];
  products: SalesProductCustomerMapping[];
  selection: CustomerProfileSelection;
}): SelectedCustomerProfile | null {
  const selectedProduct = input.products.find(
    (product) => product.external_product_id === input.selection.productExternalId,
  );
  const selectedType = input.customerTypes.find(
    (customerType) => customerType.customer_type_key === input.selection.customerTypeKey,
  );
  const selectedSpeciality = input.specialities.find(
    (speciality) =>
      speciality.customer_type_key === input.selection.customerTypeKey &&
      speciality.speciality_key === input.selection.specialityKey,
  );

  if (!selectedProduct || !selectedType || !selectedSpeciality) return null;

  return {
    customer_type_key: selectedType.customer_type_key,
    customer_type_name_ar: selectedType.customer_type_name_ar,
    speciality_key: selectedSpeciality.speciality_key,
    speciality_name_ar: selectedSpeciality.speciality_name_ar,
    brand_key: selectedProduct.brand_key,
    brand_name_ar: selectedProduct.brand_name_ar,
    category_key: selectedProduct.category_key,
    category_name_ar: selectedProduct.category_name_ar,
    subcategory_key: selectedProduct.subcategory_key,
    subcategory_name_ar: selectedProduct.subcategory_name_ar,
    product_external_id: selectedProduct.external_product_id,
    product_name: selectedProduct.product_name,
  };
}
