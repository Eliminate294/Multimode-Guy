import { Client, VoiceState } from "discord.js";
import { private_vcs } from "./slashcommands/vc-create.js";

export function privateVCListener(client: Client) {
	client.on(
		"voiceStateUpdate",
		async (oldState: VoiceState, newState: VoiceState) => {
			console.log("update");
			if (!oldState.channel) {
				return;
			}

			const channel = oldState.channel;

			const ownerId = Array.from(private_vcs.entries()).find(
				([userId, vc]) => vc.id === channel.id
			)?.[0];

			console.log(ownerId);
			if (!ownerId) {
				return;
			}

			if (channel.members.size === 0) {
				console.log("no more ppl in vc");
				try {
					await channel.delete();
					private_vcs.delete(ownerId);
				} catch (err) {
					console.error(
						`Failed to delete VC channel ${channel.name}: ${err}`
					);
				}
			}
		}
	);
}
