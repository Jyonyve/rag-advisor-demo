import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import supertokens from 'supertokens-node';
import EmailPassword from 'supertokens-node/recipe/emailpassword';
import UserRoles from 'supertokens-node/recipe/userroles';
import Session from 'supertokens-node/recipe/session';
import { and, count, eq, gte, sql } from 'drizzle-orm';
import { DEFAULT_TENANT_ID } from '@rag-advisor-demo/shared/config';
import type { UserInfo } from '@rag-advisor-demo/shared/domain';
import { ApiError } from '@rag-advisor-demo/shared/domain';
import type { DemoUsageStatus } from '@rag-advisor-demo/shared/domain';
import type { DemoGuestInitResponse } from '@rag-advisor-demo/shared/api';
import { getServerEnv } from '../config/env.js';
import { getDatabase } from '../db/postgresClient.js';
import { demoGuestAttempts, demoGuests, users } from '../db/schema.js';
import { userStore } from '../store/userStore.js';

export type GuestAuthIdentity = {
	userId: string;
	recipeUserId: Parameters<typeof Session.createNewSession>[3];
};

export type InternalGuestCredentials = { guestId: string; email: string; password: string };

export const createInternalGuestCredentials = (): InternalGuestCredentials => {
	const guestId = randomUUID();
	return {
		guestId,
		email: `demo-${guestId}@guest.invalid`,
		password: randomBytes(32).toString('base64url'),
	};
};

export const buildDemoGuestInitResponse = (usage: DemoUsageStatus): DemoGuestInitResponse => ({
	status: 'OK',
	usage,
});

export type GuestAuthAdapter = {
	signUp: (email: string, password: string) => Promise<GuestAuthIdentity>;
	deleteUser: (userId: string) => Promise<void>;
	addUserRole: (userId: string) => Promise<void>;
};

const defaultAuthAdapter: GuestAuthAdapter = {
	async signUp(email, password) {
		const result = await EmailPassword.signUp(DEFAULT_TENANT_ID, email, password);
		if (result.status !== 'OK') throw new ApiError(409, 'Guest identity collision. Please retry.');
		return { userId: result.user.id, recipeUserId: result.recipeUserId };
	},
	async deleteUser(userId) {
		await supertokens.deleteUser(userId, true);
	},
	async addUserRole(userId) {
		await UserRoles.addRoleToUser(DEFAULT_TENANT_ID, userId, 'user');
	},
};

const buildGuestUser = (userId: string, email: string, guestId: string, now: string): UserInfo => ({
	userId,
	email,
	contact: '',
	showName: `Demo Guest ${guestId.slice(0, 8)}`,
	title: 'Public demo visitor',
	gender: 'nocomment',
	avatarUrl: '',
	type: 'user',
	createdAt: now,
	updatedAt: now,
});

export const recordGuestCreationAttempt = async (
	clientIdentifier: string,
	now = new Date()
): Promise<void> => {
	const env = getServerEnv();
	if (!env.DEMO_GUEST_RATE_LIMIT_SECRET) {
		throw new ApiError(503, 'Public demo guest creation is not configured.');
	}
	const clientHash = createHmac('sha256', env.DEMO_GUEST_RATE_LIMIT_SECRET)
		.update(`guest-create:${clientIdentifier}`)
		.digest('hex');
	const since = new Date(
		now.getTime() - env.DEMO_GUEST_RATE_LIMIT_WINDOW_MINUTES * 60_000
	).toISOString();
	const createdAt = now.toISOString();

	await getDatabase().transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(168410912)`);
		const [row] = await tx
			.select({ value: count() })
			.from(demoGuestAttempts)
			.where(
				and(eq(demoGuestAttempts.clientHash, clientHash), gte(demoGuestAttempts.createdAt, since))
			);
		if ((row?.value ?? 0) >= env.DEMO_GUEST_RATE_LIMIT_MAX) {
			throw new ApiError(429, 'Guest demo access is temporarily rate-limited. Please try later.');
		}
		await tx
			.insert(demoGuestAttempts)
			.values({ attemptId: `demo-attempt-${randomUUID()}`, clientHash, createdAt });
	});
};

export const createDemoGuest = async (
	auth: GuestAuthAdapter = defaultAuthAdapter,
	now = new Date()
): Promise<GuestAuthIdentity> => {
	const env = getServerEnv();
	if (!env.PUBLIC_DEMO_MODE) throw new ApiError(404, 'Public demo access is disabled.');
	const { guestId, email, password } = createInternalGuestCredentials();
	const identity = await auth.signUp(email, password);
	const createdAt = now.toISOString();
	const expiresAt = new Date(
		now.getTime() + env.DEMO_GUEST_RETENTION_HOURS * 60 * 60_000
	).toISOString();

	try {
		await userStore.storeUser(buildGuestUser(identity.userId, email, guestId, createdAt));
		await getDatabase()
			.insert(demoGuests)
			.values({
				userId: identity.userId,
				authRecipeUserId: identity.recipeUserId.getAsString(),
				createdAt,
				expiresAt,
			});
		await auth.addUserRole(identity.userId);
		return identity;
	} catch (error) {
		await getDatabase()
			.delete(users)
			.where(eq(users.userId, identity.userId))
			.catch(() => undefined);
		await auth.deleteUser(identity.userId).catch(() => undefined);
		throw error;
	}
};
