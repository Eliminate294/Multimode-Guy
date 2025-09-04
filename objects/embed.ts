import { UserObject } from "./user.js";

export class EmbedObject {
	title?: string;
	description?: string;
	color?: number;
	footer?: { icon_url: string; text: string };
	timestamp?: string;
	author?: any;
	thumbnail?: any;
	fields?: any[];

	constructor() {}

	setDefaults(command: string) {
		this.color = 11662591;
		this.footer = {
			icon_url: "https://cdn.discordapp.com/embed/avatars/0.png",
			text: command,
		};
		this.timestamp = new Date().toISOString();
		return this;
	}

	setRankHeader(user: UserObject) {
		Object.assign(this, user.toEmbed());
		return this;
	}

	setTitle(title: string) {
		this.title = title;
		return this;
	}

	setDescription(description: string) {
		this.description = description;
		return this;
	}

	addField(name: string, value: string, inline = false) {
		if (!this.fields) this.fields = [];
		this.fields.push({ name, value, inline });
		return this;
	}

	addBlankField() {
		if (!this.fields) this.fields = [];
		this.fields.push({ name: "\u200b", value: "\u200b", inline: true });
		return this;
	}

	toJSON() {
		return { ...this };
	}
}
