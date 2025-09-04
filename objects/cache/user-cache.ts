import { UserObject } from "../user.js";

type ExpiredCallback = (user: UserObject) => void;

export class UserCache {
	private users = new Map<string, UserObject>();
	private timers = new Map<string, NodeJS.Timeout>();
	private ttl: number;
	private onExpire?: ExpiredCallback;

	constructor(ttl: number, onExpire?: ExpiredCallback) {
		this.ttl = ttl;
		this.onExpire = onExpire;
	}

	set(user: UserObject) {
		this.users.set(user.discordId, user);

		const existingTimer = this.timers.get(user.discordId);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		const timer = setTimeout(() => {
			this.users.delete(user.discordId);
			this.timers.delete(user.discordId);
			if (this.onExpire) this.onExpire(user);
		}, this.ttl);

		this.timers.set(user.discordId, timer);
	}

	get(discordId: string): UserObject | undefined {
		return this.users.get(discordId);
	}

	delete(discordId: string) {
		this.users.delete(discordId);
		const existingTimer = this.timers.get(discordId);
		if (existingTimer) {
			clearTimeout(existingTimer);
			this.timers.delete(discordId);
		}
	}

	has(discordId: string): boolean {
		return this.users.has(discordId);
	}

	clear() {
		this.users.clear();
		this.timers.forEach((timer) => clearTimeout(timer));
		this.timers.clear();
	}
}
