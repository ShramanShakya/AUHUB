export interface ProductDescriptionInput {
  name: string;
  category: string;
  department: string;
  description: string;
}

export interface DescriptionGenerator {
  generate(input: ProductDescriptionInput): Promise<string>;
}
