import { GoogleGenAI } from "@google/genai";
import type {
  DescriptionGenerator,
  ProductDescriptionInput,
} from "./description-generator.js";
import { AppError } from "../../utils/app-error.js";

export class GeminiDescriptionGenerator implements DescriptionGenerator {
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(input: ProductDescriptionInput): Promise<string> {
    const prompt = [
      "Write one factual, SEO-friendly product description for university merchandise.",
      "Return plain text only, between 40 and 700 characters.",
      "Do not invent materials, certifications, availability, prices, or guarantees.",
      `Product name: ${input.name}`,
      `Category: ${input.category}`,
      `Department: ${input.department}`,
      `Existing description: ${input.description}`,
    ].join("\n");

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          abortSignal: AbortSignal.timeout(10_000),
          httpOptions: { timeout: 10_000 },
          maxOutputTokens: 300,
          temperature: 0.4,
        },
      });

      if (!response.text) {
        throw new AppError(
          502,
          "AI_RESPONSE_INVALID",
          "The AI provider returned an empty response.",
        );
      }
      return response.text;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        503,
        "AI_PROVIDER_UNAVAILABLE",
        "The product description service is temporarily unavailable.",
      );
    }
  }
}
