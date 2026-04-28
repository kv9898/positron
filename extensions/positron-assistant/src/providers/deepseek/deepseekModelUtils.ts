/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2026 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { getAllModelDefinitions } from '../../modelDefinitions.js';
import { createModelInfo, markDefaultModel } from '../../modelResolutionHelpers.js';
import { ModelCapabilities } from '../base/modelProviderTypes.js';
import { ModelProviderLogger } from '../base/modelProviderLogger.js';

export const DEFAULT_DEEPSEEK_MODEL_NAME = 'DeepSeek-V4-Pro';
export const DEFAULT_DEEPSEEK_MODEL_MATCH = 'deepseek-v4-pro';

/**
 * Fetches models from the DeepSeek OpenAI-compatible /models endpoint.
 *
 * DeepSeek exposes an OpenAI-compatible model listing endpoint regardless of
 * whether the caller is using the Anthropic-compatible or OpenAI-compatible
 * chat path.  The base URL passed here should be the root host
 * (e.g. `https://api.deepseek.com`) or the Anthropic-compatible base URL
 * (e.g. `https://api.deepseek.com/anthropic`).  The `/anthropic` suffix is
 * stripped automatically so the correct `/models` URL is derived.
 *
 * @param anthropicBaseUrl - The configured Anthropic-compatible base URL
 * @param apiKey - The DeepSeek API key used for bearer authentication
 * @param providerId - The provider identifier (e.g., 'deepseek')
 * @param providerName - The display name of the provider
 * @param capabilities - The model capabilities to include in model info
 * @param logger - Logger for debug/trace messages
 * @returns Array of model information, or undefined if fetching fails
 */
export async function fetchDeepseekModelsFromApi(
	anthropicBaseUrl: string,
	apiKey: string | undefined,
	providerId: string,
	providerName: string,
	capabilities: ModelCapabilities,
	logger: ModelProviderLogger
): Promise<vscode.LanguageModelChatInformation[] | undefined> {
	// Derive the OpenAI-compatible root URL by stripping any /anthropic suffix,
	// then append /models (e.g. https://api.deepseek.com/models).
	const openAiRoot = anthropicBaseUrl.replace(/\/anthropic\/?$/, '').replace(/\/+$/, '');
	const modelsUrl = `${openAiRoot}/models`;

	logger.trace(`Fetching models from DeepSeek API: ${modelsUrl}`);

	try {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		if (apiKey) {
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		const response = await fetch(modelsUrl, {
			method: 'GET',
			headers,
			signal: AbortSignal.timeout(15_000),
		});

		if (!response.ok) {
			logger.warn(`Failed to fetch models from DeepSeek API: ${response.status} ${response.statusText}`);
			return undefined;
		}

		const data = await response.json() as any;

		if (!data?.data || !Array.isArray(data.data)) {
			logger.warn('DeepSeek models response did not contain expected data array');
			return undefined;
		}

		logger.info(`Successfully fetched ${data.data.length} models from DeepSeek API`);

		const knownModels = getAllModelDefinitions(providerId);
		const modelListing: vscode.LanguageModelChatInformation[] = data.data.map((model: any) => {
			const knownModel = knownModels?.find(m => model.id.startsWith(m.identifier));
			return createModelInfo({
				id: model.id,
				name: model.id,
				family: providerId,
				version: '',
				provider: providerId,
				providerName: providerName,
				capabilities: capabilities,
				defaultMaxInput: knownModel?.maxInputTokens,
				defaultMaxOutput: knownModel?.maxOutputTokens
			});
		});

		return markDefaultModel(modelListing, providerId, DEFAULT_DEEPSEEK_MODEL_MATCH);
	} catch (error) {
		logger.warn(`Failed to fetch models from DeepSeek API: ${error}`);
		return undefined;
	}
}
