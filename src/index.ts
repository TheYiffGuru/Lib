import fetch from "node-fetch";
import * as fs from "fs";
import pkg from "../package.json";
import { URL } from "url";
import path from "path";

export const VERSION = 1;
export const DEFAULT_URL = "https://yiff.guru/api";


export interface ExternalLink {
	type: "e621" | "furaffinity" | "inkbunny" | "patreon" | "twitter" | "deviantart";
	info: string;
}

export interface Album {
	id: string;
	title: string;
	tags: string;
	creator: string;
	artist: string | null;
	vanity: string | null;
	externalLinks: ExternalLink[];
}

export interface Image {
	id: string;
}

export interface SuccessResponse<B = any> {
	success: true;
	data: B;
}

export interface FailureResponse {
	success: false;
	error: string;
}

export default class YiffGuru {
	apiKey: string;
	baseURL = DEFAULT_URL;
	/**
	 * @param {string} apiKey - Your api key. 
	 * @param {string} [baseURL] - The base url to use for api requests, including the api prefix. 
	 */
	constructor(apiKey: string, baseURL?: string) {
		if (!apiKey) throw new TypeError("An api key is required.");
		this.apiKey = apiKey;
		if (baseURL) this.baseURL = baseURL;
	}

	async createAlbum(title: string, description?: string, tags?: string[], externalLinks?: ExternalLink[], artist?: string): Promise<SuccessResponse<Album> | FailureResponse> {
		return fetch(`${this.baseURL}/v${VERSION}/albums`, {
			method: "POST",
			body: JSON.stringify({
				title,
				description,
				tags,
				externalLinks,
				artist
			}),
			headers: {
				"Authorization": this.apiKey,
				"Content-Type": "application/json",
				"User-Agent": `YiffGuru/${pkg.version} (https://github.com/TheYiffGuru/Lib)`
			}
		})
			.then(async (res) => {
				let c: any = await res.text();
				try {
					c = JSON.parse(c);
				} catch (e) {
					throw new TypeError(`Invalid JSON content at ${res.url}: ${c}`);
				}

				return c;
			});
	}

	private async getFromURL(url: string | URL) {
		return fetch(url, {
			method: "GET",
			headers: {
				"User-Agent": `YiffGuru/${pkg.version} (https://github.com/TheYiffGuru/Lib)`
			}
		}).then(res => res.buffer());
	}

	async addImageToAlbum(img: string | Buffer | URL, album: string, rating?: -1 | 0 | 1 | 2 | 3): Promise<SuccessResponse<Image> | FailureResponse> {
		let filename: string | undefined = undefined, file: Buffer;
		if (typeof img === "string") {
			const a = img.match(/^(.+)\/([^\/]+)$/);

			// url
			if (img.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/)) {
				// easier parsing
				img = new URL(img);
				filename = path.basename(img.pathname);
				file = await this.getFromURL(img);
			}
			// file path
			else if (a) {
				filename = a[2];
				const f = `${a[1]}/${a[2]}`;
				if (!fs.existsSync(f)) throw new TypeError(`Provided file "${f}" does not exist.`);
				else file = fs.readFileSync(f);
			}
			// base64 (hopefully)
			else {
				file = Buffer.from(img, "base64");
			}
		} else if (img instanceof URL) {
			filename = path.basename(img.pathname);
			file = await this.getFromURL(img);
		} else file = img;

		return fetch(`${this.baseURL}/v${VERSION}/albums/${album}/images`, {
			method: "PUT",
			body: JSON.stringify({
				file: file.toString("base64"),
				name: filename,
				rating
			}),
			headers: {
				"Authorization": this.apiKey,
				"Content-Type": "application/json",
				"User-Agent": `YiffGuru/${pkg.version} (https://github.com/TheYiffGuru/Lib)`
			}
		})
			.then(async (res) => {
				let c: any = await res.text();
				try {
					c = JSON.parse(c);
				} catch (e) {
					throw new TypeError(`Invalid JSON content at ${res.url}: ${c}`);
				}

				return c;
			});
	}
}
