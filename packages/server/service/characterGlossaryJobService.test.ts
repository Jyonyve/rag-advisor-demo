import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildCharacterGlossarySource,
	createCharacterGlossaryJobService,
} from './characterGlossaryJobService.js';

const waitForTerminalStatus = async (
	service: ReturnType<typeof createCharacterGlossaryJobService>,
	characterId: string
) => {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		const snapshot = service.get(characterId);
		if (snapshot?.status === 'completed' || snapshot?.status === 'failed') return snapshot;
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	throw new Error('Character glossary job did not complete.');
};

test('buildCharacterGlossarySource includes character baseline text', () => {
	const source = buildCharacterGlossarySource({
		name: '한서',
		showName: '강한서',
		title: '이세계의 영웅',
		worldIntroduction: '가상의 펀드와 예금 상품을 비교한다.',
		description: '위험 등급과 투자 기간을 설명하는 금융 정보 도우미.',
		instruction: '한서의 관점으로 응답한다.',
	});

	assert.match(source, /가상의 펀드/);
	assert.match(source, /위험 등급/);
	assert.match(source, /한서의 관점/);
});

test('character glossary jobs deduplicate unchanged source text', async () => {
	let callCount = 0;
	const service = createCharacterGlossaryJobService(async (input) => {
		callCount += 1;
		return { characterId: input.characterId, extractedTermCount: 2, resolvedTermCount: 2 };
	});
	const input = { characterId: 'finance_demo', userId: 'user', sourceText: '분산 투자' };

	const first = service.enqueue(input);
	const second = service.enqueue(input);
	const completed = await waitForTerminalStatus(service, input.characterId);

	assert.equal(first.jobId, second.jobId);
	assert.equal(completed.status, 'completed');
	assert.equal(callCount, 1);
});

test('character glossary jobs rescan changed baseline text', async () => {
	let callCount = 0;
	const service = createCharacterGlossaryJobService(async (input) => {
		callCount += 1;
		return { characterId: input.characterId, extractedTermCount: 1, resolvedTermCount: 1 };
	});

	service.enqueue({ characterId: 'finance_demo', userId: 'user', sourceText: '분산 투자' });
	await waitForTerminalStatus(service, 'finance_demo');
	service.enqueue({
		characterId: 'finance_demo',
		userId: 'user',
		sourceText: '분산 투자와 위험 등급',
	});
	await waitForTerminalStatus(service, 'finance_demo');

	assert.equal(callCount, 2);
});
