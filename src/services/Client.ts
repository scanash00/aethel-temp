import * as config from "@/config";
import initialzeCommands from "@/handlers/initialzeCommands";
import { SlashCommandProps } from "@/types/command";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { promises, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const srcDir = path.join(__dirname, '..');

export default class BotClient extends Client {
    public commands = new Collection<string, SlashCommandProps>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public t = new Collection<string, any>();
    constructor() {
        super({
            intents: [GatewayIntentBits.MessageContent],
            presence: {
                status: 'online',
                activities: [{
                    name: "/weather | /ai"
                }]
            }
        });
    };

    public async init() {
        await initialzeCommands(this);
        await this.setupLocalization();
        await this.setupEvents();
        this.login(config.TOKEN);
    }

    private     async setupEvents() {
        console.log("Initializing events...");
        const eventsDir = path.join(srcDir, 'events');
        for (const event of readdirSync(path.join(eventsDir))) {
            const filepath = path.join(eventsDir, event);
            const fileUrl = `file://${filepath.replace(/\\/g, '/')}`;
            const EventClass = await (await import(fileUrl)).default;
            new EventClass(this);
        }
    };

    private     async setupLocalization() {
        console.log("Loading localization files...");
        const localesDir = path.join(srcDir, '..', 'locales');
        for (const locale of readdirSync(path.join(localesDir)).filter(f => f.endsWith('.json'))) {
            const localeFile = path.join(localesDir, locale);
            const data = await promises.readFile(localeFile, { encoding: "utf8" });
            this.t.set(locale.split('.')[0], JSON.parse(data))
        }
    }
    public async getLocaleText(key: string, locale: string, replaces = {}): Promise<string> {
        const fallbackLocale = 'en-US';

        let langMap = this.t.get(locale) || this.t.get(fallbackLocale);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getValueFromMap = (map: any, keyPath: string): any => {
            return keyPath.split('.').reduce((prev, cur) => (prev && prev[cur] !== undefined) ? prev[cur] : undefined, map);
        };

        let text = getValueFromMap(langMap, key);

        if (text === undefined && locale !== fallbackLocale) {
            langMap = this.t.get(fallbackLocale);
            text = getValueFromMap(langMap, key);
        }

        for (const [varName, value] of Object.entries(replaces)) {
            const regex = new RegExp(`{${varName}}`, "g");
            text = text.replace(regex, value);
        }

        return text;
    }
};