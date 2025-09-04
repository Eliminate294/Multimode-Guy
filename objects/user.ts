export class UserObject {
	constructor(
		public osuId: number,
		public discordId: string,
		public username: string,
		public spp_rank: number,
		public tpp_rank: number,
		public spp: number,
		public tpp: number,
		public country: string
	) {}

	toEmbed() {
		return {
			author: {
				name: `${this.username}  \u25AA  ${Number(
					this.spp.toFixed(0)
				).toLocaleString()}spp (#${this.spp_rank.toLocaleString()})  \u25AA  ${Number(
					this.tpp.toFixed(0)
				).toLocaleString()}tpp (#${this.tpp_rank.toLocaleString()})`,
				url: `https://osu.ppy.sh/users/${this.osuId}`,
				icon_url: `https://osu.ppy.sh/images/flags/${this.country}.png`,
			},
		};
	}
}
