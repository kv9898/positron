/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { createOpenAICompatibleFetch, fixPossiblyBrokenChatCompletionChunk, PossiblyBrokenChatCompletionChunk } from '../openai-fetch-utils.js';

suite('OpenAI Fetch Utils', () => {
	test('fixPossiblyBrokenChatCompletionChunk fixes empty arguments for no-arg tools', () => {
		const brokenChunk: PossiblyBrokenChatCompletionChunk = {
			id: 'test-id',
			choices: [{
				index: 0,
				delta: {
					role: 'assistant',
					tool_calls: [{
						index: 0,
						id: 'call_123',
						type: 'function',
						function: {
							name: 'getPlot',
							arguments: ''
						}
					}]
				},
				finish_reason: null
			}],
			created: 1234567890,
			model: 'test-model',
			object: 'chat.completion.chunk'
		};

		const noArgTools = ['getPlot'];
		const fixedChunk = fixPossiblyBrokenChatCompletionChunk(brokenChunk, noArgTools);
		const choice = fixedChunk.choices[0];
		const toolCall = choice.delta.tool_calls![0];

		assert.strictEqual(toolCall.function?.arguments, '{}', 'Empty arguments should be converted to "{}" for no-arg tool');
	});

	test('fixPossiblyBrokenChatCompletionChunk does NOT fix empty arguments for tools with args', () => {
		const chunk: PossiblyBrokenChatCompletionChunk = {
			id: 'test-id',
			choices: [{
				index: 0,
				delta: {
					role: 'assistant',
					tool_calls: [{
						index: 0,
						id: 'call_123',
						type: 'function',
						function: {
							name: 'myTool',
							arguments: ''
						}
					}]
				},
				finish_reason: null
			}],
			created: 1234567890,
			model: 'test-model',
			object: 'chat.completion.chunk'
		};

		const noArgTools = ['getPlot']; // myTool is not in the list
		const fixedChunk = fixPossiblyBrokenChatCompletionChunk(chunk, noArgTools);
		const choice = fixedChunk.choices[0];
		const toolCall = choice.delta.tool_calls![0];

		assert.strictEqual(toolCall.function?.arguments, '', 'Empty arguments should be preserved for tool with args');
	});

	test('fixPossiblyBrokenChatCompletionChunk preserves valid arguments', () => {
		const chunk: PossiblyBrokenChatCompletionChunk = {
			id: 'test-id',
			choices: [{
				index: 0,
				delta: {
					role: 'assistant',
					tool_calls: [{
						index: 0,
						id: 'call_123',
						type: 'function',
						function: {
							name: 'testTool',
							arguments: '{"foo":"bar"}'
						}
					}]
				},
				finish_reason: null
			}],
			created: 1234567890,
			model: 'test-model',
			object: 'chat.completion.chunk'
		};

		const fixedChunk = fixPossiblyBrokenChatCompletionChunk(chunk, []);
		const choice = fixedChunk.choices[0];
		const toolCall = choice.delta.tool_calls![0];

		assert.strictEqual(toolCall.function?.arguments, '{"foo":"bar"}', 'Valid arguments should be preserved');
	});
});

suite('createOpenAICompatibleFetch auth header handling', () => {
	let originalFetch: typeof globalThis.fetch;

	setup(() => {
		originalFetch = globalThis.fetch;
	});

	teardown(() => {
		globalThis.fetch = originalFetch;
	});

	test('strips Authorization header when apiKey is empty string', async () => {
		let capturedHeaders: Headers | undefined;
		globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
			capturedHeaders = new Headers(init?.headers);
			return new Response('{}', { status: 200 });
		};

		const customFetch = createOpenAICompatibleFetch('Test', '');
		await customFetch('https://example.com/v1/chat/completions', {
			headers: { 'Authorization': 'Bearer ', 'Content-Type': 'application/json' },
		});

		assert.ok(capturedHeaders, 'fetch should have been called');
		assert.strictEqual(capturedHeaders.has('Authorization'), false,
			'Authorization header should be stripped for blank apiKey');
		assert.strictEqual(capturedHeaders.get('Content-Type'), 'application/json',
			'other headers should be preserved');
	});

	test('preserves Authorization header when apiKey is undefined', async () => {
		let capturedHeaders: Headers | undefined;
		globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
			capturedHeaders = new Headers(init?.headers);
			return new Response('{}', { status: 200 });
		};

		const customFetch = createOpenAICompatibleFetch('Test');
		await customFetch('https://example.com/v1/chat/completions', {
			headers: { 'Authorization': 'Bearer injected-token', 'Content-Type': 'application/json' },
		});

		assert.ok(capturedHeaders, 'fetch should have been called');
		assert.strictEqual(capturedHeaders.get('Authorization'), 'Bearer injected-token',
			'Authorization header should be preserved when apiKey is undefined');
	});
});

suite('createOpenAICompatibleFetch DeepSeek reasoning_content replay', () => {
	let originalFetch: typeof globalThis.fetch;

	setup(() => {
		originalFetch = globalThis.fetch;
	});

	teardown(() => {
		globalThis.fetch = originalFetch;
	});

	test('replays cached reasoning_content into assistant history messages', async () => {
		const requestBodies: Array<Record<string, unknown> | undefined> = [];
		let requestCount = 0;

		globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
			const requestBody = init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
			requestBodies.push(requestBody);
			requestCount += 1;

			if (requestCount === 1) {
				const responseText = [
					'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":1,"model":"deepseek-reasoner","choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":"Let me reason.","content":"Hello"},"finish_reason":null}]}',
					'',
					'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":1,"model":"deepseek-reasoner","choices":[{"index":0,"delta":{"reasoning_content":" Continue.","content":" world"},"finish_reason":"stop"}]}',
					'',
					'data: [DONE]',
					''
				].join('\n');
				return new Response(responseText, {
					status: 200,
					headers: { 'content-type': 'text/event-stream' }
				});
			}

			return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
		};

		const customFetch = createOpenAICompatibleFetch('DeepSeek Test');

		const firstResponse = await customFetch('https://example.com/v1/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [{ role: 'user', content: 'Say hello' }],
				stream: true
			})
		});
		await firstResponse.text();

		await customFetch('https://example.com/v1/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [
					{ role: 'assistant', content: 'Hello world' },
					{ role: 'user', content: 'Continue' }
				],
				stream: true
			})
		});

		assert.strictEqual(requestBodies.length, 2, 'Expected two requests');
		const secondRequest = requestBodies[1];
		assert.ok(secondRequest, 'Expected second request body');
		const secondMessages = secondRequest.messages as Array<Record<string, unknown>>;
		assert.strictEqual(
			secondMessages[0].reasoning_content,
			'Let me reason. Continue.',
			'Expected cached reasoning_content to be replayed for assistant history message'
		);
	});
});
