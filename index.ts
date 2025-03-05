import fs from 'fs';
import { Reader } from 'maxmind';
import { Context, findFileSync, Service } from 'hydrooj';

const buffer = fs.readFileSync(findFileSync('@hydrooj/geoip/GeoLite2-City.mmdb'));
const reader = new Reader(buffer);
const config = JSON.parse(fs.readFileSync('/root/.hydro/local/geoip/config.json'));

export interface Result {
    location?: string,
    continent?: string,
    country?: string,
    city?: string,
    subdivisions?: Array,
    display: string
}

export default class GeoIPService extends Service {
    constructor(ctx: Context) {
        super(ctx, 'geoip', true);
    }

    provider = '<a href="http://www.maxmind.com" target="_blank">MaxMind</a>';
    lookup(ip: string, locale: string): Result {
        const res: any = reader.get(ip);
        if (!res) return { display: 'Unknown address'.translate(locale) };
        const ret: Result = { display: '' };
	const localeFormat: Object = config.langFormat[locale] || config.langFormat.en;
	const lname : string = localeFormat.localeName;
        if (res.location) ret.location = res.location;
        if (res.continent) ret.continent = res.continent.names[lname] || res.continent.names.en;
        if (res.country || res.registered_country) {
            ret.country = (res.country || res.registered_country).names[lname]
                || (res.country || res.registered_country).names.en;
        }
	if (res.subdivisions) {
	    ret.subdivisions = [];
	    for (const subdiv of res.subdivisions) {
		ret.subdivisions.push(subdiv.names[lname] || subdiv.names.en);
	    }
	}
        if (res.city) ret.city = res.city.names[lname] || res.city.names.en;
	const tmp: Array = [];
	for (const item of localeFormat.seq) {
	    if (item.type === "key" && ret[item.value]) {
		tmp.push(ret[item.value]);
	    }
	    else if (item.type === "subdiv" && ret.subdivisions) {
		for (const sdname of ret.subdivisions) {
		    tmp.push(sdname);
		}
	    }
	    else if (item.type === "text") {
		tmp.push(item.value);
	    }
	}
        ret.display = tmp.join(localeFormat.connector);
        return ret;
    }
}

export async function apply(ctx: Context) {
    ctx.provide('geoip');
    ctx.geoip = new GeoIPService(ctx);
}
