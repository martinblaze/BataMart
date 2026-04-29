import { PrismaClient } from '@prisma/client'

type AttrType = 'text' | 'select' | 'multi_select' | 'number' | 'boolean'

type AttrDef = {
  key: string
  label: string
  type: AttrType
  options?: string[]
  required?: boolean
  filterable?: boolean
  searchable?: boolean
  sortOrder?: number
}

const BASE_OPTIONS = {
  condition: ['Brand New', 'UK Used', 'Nigerian Used', 'Refurbished'],
}

const CATEGORY_ATTRIBUTE_MAP: Record<string, Record<string, AttrDef[]>> = {
  electronics: {
    phones_tablets: [
      { key: 'brand', label: 'Brand', type: 'select', required: true },
      { key: 'model', label: 'Model', type: 'text', required: true },
      { key: 'storage', label: 'Storage', type: 'select', options: ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] },
      { key: 'ram', label: 'RAM', type: 'select', options: ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB'] },
      { key: 'condition', label: 'Condition', type: 'select', options: BASE_OPTIONS.condition },
      { key: 'batteryHealth', label: 'Battery Health', type: 'number' },
      { key: 'color', label: 'Color', type: 'multi_select' },
    ],
    laptops: [
      { key: 'brand', label: 'Brand', type: 'select', required: true },
      { key: 'model', label: 'Model', type: 'text', required: true },
      { key: 'processor', label: 'Processor', type: 'select' },
      { key: 'ram', label: 'RAM', type: 'select', options: ['4GB', '8GB', '16GB', '32GB', '64GB'] },
      { key: 'storage', label: 'Storage', type: 'select', options: ['256GB', '512GB', '1TB', '2TB'] },
      { key: 'storageType', label: 'Storage Type', type: 'select', options: ['HDD', 'SSD'] },
      { key: 'condition', label: 'Condition', type: 'select', options: BASE_OPTIONS.condition },
      { key: 'screenSize', label: 'Screen Size', type: 'text' },
      { key: 'touchscreen', label: 'Touchscreen', type: 'boolean' },
      { key: 'graphics', label: 'Graphics', type: 'text' },
    ],
  },
  fashion: {
    mens_wear: [
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unisex'] },
      { key: 'size', label: 'Size', type: 'select' },
      { key: 'color', label: 'Color', type: 'multi_select' },
      { key: 'material', label: 'Material', type: 'select' },
      { key: 'condition', label: 'Condition', type: 'select', options: BASE_OPTIONS.condition },
      { key: 'brand', label: 'Brand', type: 'text' },
    ],
    womens_wear: [
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unisex'] },
      { key: 'size', label: 'Size', type: 'select' },
      { key: 'color', label: 'Color', type: 'multi_select' },
      { key: 'material', label: 'Material', type: 'select' },
      { key: 'condition', label: 'Condition', type: 'select', options: BASE_OPTIONS.condition },
      { key: 'brand', label: 'Brand', type: 'text' },
    ],
  },
  groceries: {
    fresh_food: [
      { key: 'foodType', label: 'Food Type', type: 'select' },
      { key: 'packSize', label: 'Pack Size', type: 'select' },
      { key: 'preparationTime', label: 'Preparation Time', type: 'text' },
      { key: 'location', label: 'Vendor Location', type: 'text' },
      { key: 'expiryOrFreshness', label: 'Expiry/Freshness', type: 'text' },
      { key: 'deliveryAvailable', label: 'Delivery Available', type: 'boolean' },
    ],
  },
  home_kitchen: {
    furniture: [
      { key: 'itemType', label: 'Item Type', type: 'select' },
      { key: 'material', label: 'Material', type: 'select' },
      { key: 'condition', label: 'Condition', type: 'select', options: BASE_OPTIONS.condition },
      { key: 'color', label: 'Color', type: 'multi_select' },
      { key: 'size', label: 'Size', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
    ],
  },
  computing: {
    accessories_computing: [
      { key: 'itemType', label: 'Item Type', type: 'select' },
      { key: 'department', label: 'Department', type: 'select', options: ['Engineering', 'Science', 'Arts', 'Business', 'General'] },
      { key: 'level', label: 'Level', type: 'select', options: ['100', '200', '300', '400', '500', 'Postgraduate'] },
      { key: 'condition', label: 'Condition', type: 'select', options: BASE_OPTIONS.condition },
      { key: 'brand', label: 'Brand', type: 'text' },
    ],
  },
  beauty: {
    skincare: [
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'skinType', label: 'Skin Type', type: 'select' },
      { key: 'productType', label: 'Product Type', type: 'select' },
      { key: 'size', label: 'Size', type: 'text' },
      { key: 'expiryDate', label: 'Expiry Date', type: 'text' },
      { key: 'condition', label: 'Condition', type: 'select', options: ['Brand New', 'Sealed'] },
    ],
  },
}

export async function seedCategoryAttributes(prisma: PrismaClient) {
  for (const [categoryKey, subMap] of Object.entries(CATEGORY_ATTRIBUTE_MAP)) {
    for (const [subcategoryKey, attrs] of Object.entries(subMap)) {
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i]
        await prisma.categoryAttribute.upsert({
          where: {
            categoryKey_subcategoryKey_key: {
              categoryKey,
              subcategoryKey,
              key: attr.key,
            },
          },
          create: {
            categoryKey,
            subcategoryKey,
            key: attr.key,
            label: attr.label,
            type: attr.type,
            options: attr.options || null,
            required: attr.required ?? false,
            filterable: attr.filterable ?? true,
            searchable: attr.searchable ?? true,
            sortOrder: attr.sortOrder ?? i,
          },
          update: {
            label: attr.label,
            type: attr.type,
            options: attr.options || null,
            required: attr.required ?? false,
            filterable: attr.filterable ?? true,
            searchable: attr.searchable ?? true,
            sortOrder: attr.sortOrder ?? i,
          },
        })
      }
    }
  }
}
