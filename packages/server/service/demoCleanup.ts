import { closeDatabase } from '../db/postgresClient.js';
import { executeDemoCleanup, parseDemoCleanupArgs, planDemoCleanup } from './demoCleanupService.js';

const args = process.argv.slice(2);
const { execute, dryRun, hours } = parseDemoCleanupArgs(args);

try {
	const cutoff = new Date(Date.now() - hours * 60 * 60_000);
	const plan = await planDemoCleanup(cutoff);
	process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
	if (!dryRun) {
		const result = await executeDemoCleanup(plan);
		process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
	}
} finally {
	await closeDatabase();
}
