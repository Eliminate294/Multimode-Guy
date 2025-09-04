export class UserObject {
	constructor(
		public osuId: number,
		public discordId: string,
		public username: string,
		public spp_rank: number,
		public tpp_rank: number,
		public country: string
	) {}

	toEmbed() {
		return {
			author: {
				name: `${this.username} | #${this.spp_rank} spp | #${this.tpp_rank} spp`,
				url: `https://osu.ppy.sh/users/${this.osuId}`,
				icon_url: `https://osu.ppy.sh/images/flags/${this.country}.png`,
			},
			thumbnail: {
				url: `https://a.ppy.sh/${this.osuId}?.png`,
			},
		};
	}
}
