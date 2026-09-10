import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

interface ProductionSecrets {
  databaseUrl: string;
  geminiApiKey: string;
}

export async function loadProductionSecrets(
  vaultUrl: string,
): Promise<ProductionSecrets> {
  const client = new SecretClient(vaultUrl, new DefaultAzureCredential());
  const [databaseUrl, geminiApiKey] = await Promise.all([
    client.getSecret("database-url"),
    client.getSecret("gemini-api-key"),
  ]);

  if (!databaseUrl.value || !geminiApiKey.value) {
    throw new Error("Required production secrets are unavailable");
  }

  return {
    databaseUrl: databaseUrl.value,
    geminiApiKey: geminiApiKey.value,
  };
}
