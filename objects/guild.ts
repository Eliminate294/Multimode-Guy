import { ClientPermissions } from "../permissions.js";

export class GuildObject {
	constructor(public guildId: string, public permissions: number) {}

	hasPermission(perm: ClientPermissions) {
		return (this.permissions & perm) === perm;
	}
}
