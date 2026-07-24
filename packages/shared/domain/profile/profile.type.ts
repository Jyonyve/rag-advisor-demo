import { METADATA_TYPES } from '../../config/constants.js';
import { BeingMetadata } from '../character/character.type.js';
import { z } from 'zod';

export const financialSessionProfileSchema = z
	.object({
		domain: z.literal('finance'),
		investmentGoal: z.string().trim().min(1).optional(),
		investmentHorizonMonths: z.number().int().positive().optional(),
		liquidityNeed: z.enum(['low', 'medium', 'high']).optional(),
		riskPreference: z.enum(['conservative', 'moderate', 'growth']).optional(),
		constraints: z.array(z.string().trim().min(1)).default([]),
	})
	.strict();

export const healthcareOperationsSessionProfileSchema = z
	.object({
		domain: z.literal('healthcare_operations'),
		workflowTopic: z.string().trim().min(1).optional(),
		requesterRole: z.enum(['nurse', 'doctor', 'admin_staff', 'patient_support']).optional(),
		urgency: z.enum(['routine', 'time_sensitive']).optional(),
		constraints: z.array(z.string().trim().min(1)).default([]),
	})
	.strict();

export const domainSessionProfileSchema = z.discriminatedUnion('domain', [
	financialSessionProfileSchema,
	healthcareOperationsSessionProfileSchema,
]);

export type FinancialSessionProfile = z.infer<typeof financialSessionProfileSchema>;
export type HealthcareOperationsSessionProfile = z.infer<
	typeof healthcareOperationsSessionProfileSchema
>;
export type DomainSessionProfile = z.infer<typeof domainSessionProfileSchema>;

export interface ProfileMetadata extends BeingMetadata {
	profileId: string; //${userId}_${sessionId}
	sessionId: string;
	type: typeof METADATA_TYPES.PROFILE;
}

export interface ProfileDocument {
	description: string;
	/** Required by the server persistence boundary; chat hypotheticals are not stored here. */
	domainProfile?: DomainSessionProfile;
}

export type ProfileInfo = ProfileMetadata & ProfileDocument;

export type ProfileCdo = Pick<
	ProfileInfo,
	'description' | 'gender' | 'name' | 'showName' | 'title' | 'userId' | 'sessionId' | 'domainProfile'
>;
