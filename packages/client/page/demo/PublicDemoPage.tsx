import { useEffect, useState } from 'react';
import { Box, Container, Divider, Typography } from '@mui/material';
import { PublicDemoResponse } from '@rag-advisor-demo/shared/api';
import { GlassCircularProgress } from '../../layout/component/glass/index.js';
import { ConversationEntry } from '../chat/ConversationEntry.jsx';
import { LANG_KEYS } from '@rag-advisor-demo/shared/config';
import { getLangText } from '../../util/translateUtils.js';

type DemoState =
	| { status: 'loading' }
	| { status: 'ready'; data: PublicDemoResponse }
	| { status: 'unavailable' };

export function PublicDemoPage() {
	const [state, setState] = useState<DemoState>({ status: 'loading' });

	useEffect(() => {
		const controller = new AbortController();

		void fetch('/api/demo/get-public-demo', { signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) throw new Error(String(response.status));
				return (await response.json()) as PublicDemoResponse;
			})
			.then((data) => setState({ status: 'ready', data }))
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === 'AbortError') return;
				setState({ status: 'unavailable' });
			});

		return () => controller.abort();
	}, []);

	if (state.status === 'loading') {
		return (
			<Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
				<GlassCircularProgress colorVariant="silver" />
			</Box>
		);
	}

	if (state.status === 'unavailable') {
		return (
			<Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', px: 3 }}>
				<Typography color="text.secondary">{getLangText(LANG_KEYS.DEMO_UNAVAILABLE)}</Typography>
			</Box>
		);
	}

	const { data } = state;

	return (
		<Box
			sx={{
				height: '100%',
				minHeight: 0,
				display: 'grid',
				gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 2fr)' },
				gridTemplateRows: { xs: 'minmax(30vh, 40%) minmax(0, 1fr)', md: '1fr' },
			}}
		>
			<Box
				sx={{
					position: 'relative',
					minHeight: 0,
					borderRight: { md: 1 },
					borderBottom: { xs: 1, md: 0 },
					borderColor: 'divider',
					backgroundColor: 'background.paper',
					overflow: 'hidden',
				}}
			>
				{data.character.portraitUrl ? (
					<Box
						component="img"
						src={data.character.portraitUrl}
						alt={data.character.showName}
						sx={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center bottom' }}
					/>
				) : null}
				<Box
					sx={{
						position: 'absolute',
						left: 0,
						right: 0,
						bottom: 0,
						p: 2,
						backgroundColor: 'rgba(0, 0, 0, 0.68)',
						color: 'common.white',
					}}
				>
					<Typography variant="h5" component="h1">
						{data.character.showName}
					</Typography>
					<Typography variant="body2" sx={{ opacity: 0.82 }}>
						{data.title}
					</Typography>
				</Box>
			</Box>

			<Box sx={{ minHeight: 0, overflowY: 'auto', px: { xs: 2, sm: 4 }, py: 2 }}>
				<Container maxWidth="md" disableGutters>
					{data.truncated ? (
						<Typography variant="caption" color="text.secondary">
							Showing the latest {data.turns.length} of {data.totalTurnCount} turns
						</Typography>
					) : null}
					{data.turns.map((turn, turnIndex) => (
						<Box key={turn.sequence} sx={{ py: 2 }}>
							<Typography variant="caption" color="text.secondary">
								{data.viewerName}
							</Typography>
							{turn.request.map((entry, entryIndex) => (
								<Box key={`request-${turn.sequence}-${entryIndex}`} sx={{ mt: 0.5 }}>
									<ConversationEntry entry={entry} role="user" />
								</Box>
							))}

							<Box sx={{ mt: 2 }}>
								<Typography variant="caption" color="secondary">
									{data.character.showName}
								</Typography>
								{turn.response.map((entry, entryIndex) => (
									<Box key={`response-${turn.sequence}-${entryIndex}`} sx={{ mt: 0.5 }}>
										<ConversationEntry entry={entry} role="assistant" />
									</Box>
								))}
							</Box>
							{turnIndex < data.turns.length - 1 ? <Divider sx={{ mt: 2 }} /> : null}
						</Box>
					))}
					{data.turns.length === 0 ? (
						<Typography color="text.secondary">
							{getLangText(LANG_KEYS.NO_PUBLIC_CONVERSATION)}
						</Typography>
					) : null}
				</Container>
			</Box>
		</Box>
	);
}
