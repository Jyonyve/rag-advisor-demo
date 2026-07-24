import { Avatar, Box, Divider, Typography } from '@mui/material';
import { FC } from 'react';
import { DisplayTurn } from '@rag-advisor-demo/shared/domain';
import { ConversationEntry } from './ConversationEntry.js';
import type { ChatDisplayMode } from './chatDisplayMode.js';
import type { PortraitUrlMap } from '@rag-advisor-demo/shared/config';
import { getConversationAvatar } from './conversationAvatarUtils.js';

interface FixedTurnDisplayProps {
	turn: DisplayTurn;
	displayMode: ChatDisplayMode;
	characterPortraitUrls?: PortraitUrlMap;
	characterAvatarUrls?: PortraitUrlMap;
}

export const FixedTurnDisplay: FC<FixedTurnDisplayProps> = ({
	turn,
	displayMode,
	characterPortraitUrls,
	characterAvatarUrls,
}) => {
	const isConversationMode = displayMode === 'conversation';
	const avatarUrl = getConversationAvatar(
		characterAvatarUrls,
		characterPortraitUrls,
		turn.response.emotion
	);

	return (
		<Box key={`${turn.sessionId}-${turn.sequence}`} className={'turnContainer'}>
			<Box sx={{ mb: 1 }}>
				{isConversationMode ? (
					<Typography variant="caption" color="text.secondary">
						{turn.request.showName}
					</Typography>
				) : null}
				{turn.request.entries.map((entry, idx) => (
					<Box key={`req-${turn.sequence}-${idx}`} sx={{ mt: isConversationMode ? 0.5 : 0 }}>
						<ConversationEntry entry={entry} role="user" />
					</Box>
				))}
			</Box>

			<Box
				sx={{
					mt: isConversationMode ? 2 : 0,
					mb: 1,
					display: isConversationMode ? 'flex' : 'block',
					alignItems: 'flex-start',
					gap: 1.5,
				}}
			>
				{isConversationMode ? (
					<Avatar
						src={avatarUrl}
						alt={turn.response.showName}
						sx={{ width: 44, height: 44, flexShrink: 0 }}
					/>
				) : null}
				<Box sx={{ minWidth: 0, flex: 1 }}>
					{isConversationMode ? (
						<Typography variant="caption" color="secondary">
							{turn.response.showName}
						</Typography>
					) : null}
					{turn.response.entries.map((entry, idx) => (
						<Box key={`res-${turn.sequence}-${idx}`} sx={{ mt: isConversationMode ? 0.5 : 0 }}>
							<ConversationEntry entry={entry} role="assistant" />
						</Box>
					))}
				</Box>
			</Box>
			{isConversationMode ? <Divider sx={{ mt: 2 }} /> : null}
		</Box>
	);
};
